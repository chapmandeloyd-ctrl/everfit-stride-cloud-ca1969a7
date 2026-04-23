/**
 * Plan Gating Logic — Adaptive Plan Visibility & Smart Unlocks
 *
 * Controls what plans a client can access based on:
 * - engine_mode
 * - current_level
 * - score stability
 * - engine-specific safety rules
 * - coach overrides
 */

import type { EngineMode } from "@/lib/engineConfig";
import type { StatusLabel, ScoreFactor } from "@/lib/recommendationEngine";

// ─── Types ──────────────────────────────────────────────

export type IntensityTier = "low" | "medium" | "high" | "extreme";
export type PlanType = "fasting" | "training" | "recovery" | "fueling";

export interface PlanGatingMetadata {
  id: string;
  name: string;
  engine_allowed: string[];
  min_level_required: number;
  max_level_allowed: number | null;
  plan_type: PlanType;
  intensity_tier: IntensityTier;
  is_extended_fast: boolean;
  is_youth_safe: boolean;
}

export interface ClientGatingContext {
  engineMode: EngineMode;
  currentLevel: number;
  scoreStatus: StatusLabel;
  last7DayAvgScore: number;
  needsSupportDaysLast14: number;
  fastingEnabled: boolean;
  lowestFactor: ScoreFactor;
  upcomingGameOrPractice: boolean;
  overriddenPlanIds: Set<string>;
  /**
   * Current consistency-streak length in days. Used by the gating engine
   * to surface "Streak X/Y" progress on stability-locked plans.
   * Defaults to 0 if unknown.
   */
  currentStreak?: number;
}

export type LockReason =
  | "level_locked"
  | "stability_locked"
  | "coach_approval"
  | "engine_mode"
  | "youth_safety"
  | "optional_tool"
  | null;

export interface PlanGatingResult {
  planId: string;
  isVisible: boolean;      // whether to render at all
  isAccessible: boolean;   // whether client can select it
  lockReason: LockReason;
  lockMessage: string | null;
  isCoachApproved: boolean;
  isOptionalTool: boolean;
  /**
   * Structured progress toward unlocking this plan. The gating engine
   * picks the most relevant criterion (level, streak, or score stability)
   * so the UI can render a single progress chip without having to branch
   * on lockReason itself.
   *
   * `null` (or omitted) when no quantitative progress applies — e.g.
   * coach approval, engine-mode mismatch, or youth safety.
   */
  unlockProgress?: UnlockProgress | null;
}

export type UnlockCriterion = "level" | "streak" | "score_stability";

export interface UnlockProgress {
  /** Which criterion the chip should display. */
  criterion: UnlockCriterion;
  /** Short label, e.g. "Level", "Streak", "Strong days". */
  label: string;
  /** Current numeric value (clamped ≥ 0). */
  current: number;
  /** Target numeric value to unlock. */
  required: number;
  /** Optional unit suffix shown after numbers, e.g. "d" for days. */
  unit?: string;
}

// ─── Lock reason copy ───────────────────────────────────

function getLockMessage(reason: LockReason, minLevel?: number): string | null {
  switch (reason) {
    case "level_locked":
      return `Locked — available at Level ${minLevel ?? "?"}`;
    case "stability_locked":
      return "Temporarily locked — stability required";
    case "coach_approval":
      return "Coach approval required";
    case "engine_mode":
      return "Not available in your engine mode";
    case "youth_safety":
      return "Youth safety restriction";
    case "optional_tool":
      return null; // visible but marked as optional
    default:
      return null;
  }
}

// ─── Unlock-progress helpers ────────────────────────────

/** Required streak length (days) we use for "stability"-style locks. */
const STABILITY_STREAK_TARGET_DAYS = 7;

/** Build a Level X / Y progress chip. */
function levelProgress(currentLevel: number, requiredLevel: number): UnlockProgress {
  return {
    criterion: "level",
    label: "Level",
    current: Math.max(0, currentLevel),
    required: Math.max(1, requiredLevel),
  };
}

/** Build a Streak X / Y (days) progress chip. */
function streakProgress(currentStreak: number, requiredDays = STABILITY_STREAK_TARGET_DAYS): UnlockProgress {
  return {
    criterion: "streak",
    label: "Streak",
    current: Math.max(0, currentStreak),
    required: Math.max(1, requiredDays),
    unit: "d",
  };
}

/** Build a "Strong days last 14" chip from needs-support deficits. */
function scoreStabilityProgress(needsSupportLast14: number): UnlockProgress {
  // Translate "needs_support days" into "stable days" out of 14.
  const stableDays = Math.max(0, 14 - needsSupportLast14);
  return {
    criterion: "score_stability",
    label: "Stable days",
    current: stableDays,
    required: 14,
    unit: "d",
  };
}

/**
 * Decides which criterion to surface for a stability-style lock.
 * Prefers showing a streak chip when the client has any streak data,
 * otherwise falls back to score stability over the last 14 days.
 */
function pickStabilityProgress(ctx: ClientGatingContext): UnlockProgress {
  const hasStreakData = typeof ctx.currentStreak === "number";
  if (hasStreakData) return streakProgress(ctx.currentStreak ?? 0);
  return scoreStabilityProgress(ctx.needsSupportDaysLast14);
}

// ─── Core gating evaluation ─────────────────────────────

export function evaluatePlanGating(
  plan: PlanGatingMetadata,
  ctx: ClientGatingContext,
): PlanGatingResult {
  const isCoachApproved = ctx.overriddenPlanIds.has(plan.id);

  // If coach override exists, always accessible
  if (isCoachApproved) {
    return {
      planId: plan.id,
      isVisible: true,
      isAccessible: true,
      lockReason: null,
      lockMessage: null,
      isCoachApproved: true,
      isOptionalTool: false,
    };
  }

  // ── Athletic engine: hide all fasting plans entirely
  if (ctx.engineMode === "athletic" && plan.plan_type === "fasting") {
    return {
      planId: plan.id,
      isVisible: false,
      isAccessible: false,
      lockReason: "youth_safety",
      lockMessage: getLockMessage("youth_safety"),
      isCoachApproved: false,
      isOptionalTool: false,
    };
  }

  // ── Athletic engine: only youth-safe plans visible
  if (ctx.engineMode === "athletic" && !plan.is_youth_safe) {
    return {
      planId: plan.id,
      isVisible: false,
      isAccessible: false,
      lockReason: "youth_safety",
      lockMessage: getLockMessage("youth_safety"),
      isCoachApproved: false,
      isOptionalTool: false,
    };
  }

  // ── Athletic engine: hide extreme conditioning if game within 48h
  if (
    ctx.engineMode === "athletic" &&
    ctx.upcomingGameOrPractice &&
    plan.intensity_tier === "extreme"
  ) {
    return {
      planId: plan.id,
      isVisible: false,
      isAccessible: false,
      lockReason: "youth_safety",
      lockMessage: getLockMessage("youth_safety"),
      isCoachApproved: false,
      isOptionalTool: false,
    };
  }

  // ── Engine mode check
  if (!plan.engine_allowed.includes(ctx.engineMode)) {
    return {
      planId: plan.id,
      isVisible: false,
      isAccessible: false,
      lockReason: "engine_mode",
      lockMessage: getLockMessage("engine_mode"),
      isCoachApproved: false,
      isOptionalTool: false,
    };
  }

  // ── Fasting plans marked as "Optional Tool" when fasting disabled
  const isOptionalTool =
    (ctx.engineMode === "performance" || ctx.engineMode === "metabolic") &&
    !ctx.fastingEnabled &&
    plan.plan_type === "fasting";

  // ── Level check
  if (ctx.currentLevel < plan.min_level_required) {
    return {
      planId: plan.id,
      isVisible: true,
      isAccessible: false,
      lockReason: "level_locked",
      lockMessage: getLockMessage("level_locked", plan.min_level_required),
      isCoachApproved: false,
      isOptionalTool,
      unlockProgress: levelProgress(ctx.currentLevel, plan.min_level_required),
    };
  }

  if (plan.max_level_allowed !== null && ctx.currentLevel > plan.max_level_allowed) {
    return {
      planId: plan.id,
      isVisible: true,
      isAccessible: false,
      lockReason: "level_locked",
      lockMessage: `Locked — designed for Levels ${plan.min_level_required}–${plan.max_level_allowed}`,
      isCoachApproved: false,
      isOptionalTool,
      // No forward progress — client has surpassed the upper bound.
      unlockProgress: null,
    };
  }

  // ── Dynamic safety: Needs Support locks high/extreme
  if (
    ctx.scoreStatus === "needs_support" &&
    (plan.intensity_tier === "high" || plan.intensity_tier === "extreme")
  ) {
    return {
      planId: plan.id,
      isVisible: true,
      isAccessible: false,
      lockReason: "stability_locked",
      lockMessage: getLockMessage("stability_locked"),
      isCoachApproved: false,
      isOptionalTool,
      unlockProgress: pickStabilityProgress(ctx),
    };
  }

  // ── Dynamic safety: 3+ needs support days in 14 locks advanced plans
  if (
    ctx.needsSupportDaysLast14 >= 3 &&
    (plan.intensity_tier === "high" || plan.intensity_tier === "extreme")
  ) {
    return {
      planId: plan.id,
      isVisible: true,
      isAccessible: false,
      lockReason: "stability_locked",
      lockMessage: getLockMessage("stability_locked"),
      isCoachApproved: false,
      isOptionalTool,
      // Always score-stability here — the rule is literally about needs-support days.
      unlockProgress: scoreStabilityProgress(ctx.needsSupportDaysLast14),
    };
  }

  // ── Metabolic: extended fast gating
  if (
    ctx.engineMode === "metabolic" &&
    plan.is_extended_fast &&
    (ctx.currentLevel < 5 || ctx.last7DayAvgScore < 80 || ctx.needsSupportDaysLast14 > 1)
  ) {
    return {
      planId: plan.id,
      isVisible: true,
      isAccessible: false,
      lockReason: "stability_locked",
      lockMessage: "Locked — requires Level 5+, Strong scores, and stability",
      isCoachApproved: false,
      isOptionalTool,
      // Multi-criterion lock — surface whichever gap is biggest.
      unlockProgress:
        ctx.currentLevel < 5
          ? levelProgress(ctx.currentLevel, 5)
          : pickStabilityProgress(ctx),
    };
  }

  // ── Metabolic: >18h locked unless Level 4+ and Strong 7-day
  if (
    ctx.engineMode === "metabolic" &&
    plan.plan_type === "fasting" &&
    plan.intensity_tier === "high" &&
    (ctx.currentLevel < 4 || ctx.scoreStatus !== "strong")
  ) {
    return {
      planId: plan.id,
      isVisible: true,
      isAccessible: false,
      lockReason: "stability_locked",
      lockMessage: "Locked — requires Level 4+ with Strong status",
      isCoachApproved: false,
      isOptionalTool,
      unlockProgress:
        ctx.currentLevel < 4
          ? levelProgress(ctx.currentLevel, 4)
          : pickStabilityProgress(ctx),
    };
  }

  // ── Performance: high intensity locked if sleep is lowest and not strong
  if (
    ctx.engineMode === "performance" &&
    (plan.intensity_tier === "high" || plan.intensity_tier === "extreme") &&
    ctx.lowestFactor === "sleep" &&
    ctx.scoreStatus !== "strong"
  ) {
    return {
      planId: plan.id,
      isVisible: true,
      isAccessible: false,
      lockReason: "stability_locked",
      lockMessage: "Temporarily locked — sleep recovery needed",
      isCoachApproved: false,
      isOptionalTool,
      unlockProgress: pickStabilityProgress(ctx),
    };
  }

  // ── Plan is accessible
  return {
    planId: plan.id,
    isVisible: true,
    isAccessible: true,
    lockReason: null,
    lockMessage: null,
    isCoachApproved: false,
    isOptionalTool,
  };
}
