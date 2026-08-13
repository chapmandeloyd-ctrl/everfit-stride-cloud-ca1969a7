/**
 * Adaptive Recommendation Escalation — Engine-Aware Rules
 *
 * Produces 3 outputs per client per day:
 *  1. Today Recommendation (action-oriented, based on lowest_factor + status)
 *  2. This Week Recommendation (based on trend + weekly completion)
 *  3. Plan Suggestion (optional, gated by safety rules)
 */

import type { EngineMode } from "@/lib/engineConfig";
import type { ScoreFactor, StatusLabel } from "@/lib/recommendationEngine";

// ─── Types ──────────────────────────────────────────────

export type TrendDirection = "up" | "flat" | "down";

export type PlanSuggestionType =
  | "maintain"
  | "advance"
  | "hold"
  | "deload"
  | "shift";

export interface RecommendationInput {
  engineMode: EngineMode;
  currentLevel: number;
  scoreTotal: number;
  scoreStatus: StatusLabel;
  lowestFactor: ScoreFactor;
  streakDays: number;
  weeklyCompletionPct: number;
  last7DayAvgScore: number;
  prior7DayAvgScore: number;
  fastingEnabled: boolean;
  upcomingGameOrPractice: boolean;
  needsSupportDaysLast14: number;
  daysInLevel: number;
}

export interface RecommendationOutput {
  todayText: string;
  weekText: string;
  planSuggestion: {
    type: PlanSuggestionType;
    text: string;
    coachOverrideRequired: boolean;
  } | null;
}

// ─── Trend calculation ──────────────────────────────────

export function getTrendDirection(
  last7Avg: number,
  prior7Avg: number,
): TrendDirection {
  const diff = last7Avg - prior7Avg;
  if (diff >= 5) return "up";
  if (diff <= -5) return "down";
  return "flat";
}

// ─── Today templates by factor + status ─────────────────

// Status-level templates (used when no factor-specific override exists)
const TODAY_STATUS_TEMPLATES: Record<EngineMode, Record<StatusLabel, string[]>> = {
  metabolic: {
    strong: [
      "Metabolic regulation is stable. Maintain your current structure.",
      "Stability is reinforced through consistency. Continue as planned.",
    ],
    moderate: [
      "Small adjustments today will improve metabolic stability.",
      "Refine your lowest input to strengthen regulation.",
    ],
    needs_support: [
      "Stability requires correction. Focus on restoring structure today.",
      "Reestablish consistency before increasing intensity.",
    ],
  },
};

// Factor-specific overrides (take priority over status templates)
const TODAY_FACTOR_OVERRIDES: Record<EngineMode, Partial<Record<ScoreFactor, string>>> = {
  metabolic: {
    sleep: "Sleep quality directly affects metabolic response. Prioritize 7+ hours tonight.",
    fasting: "Maintain your fasting window precisely to reinforce stability.",
    nutrition: "Prioritize whole foods and reduce excess intake within your window.",
    weekly_completion: "Consistency compounds. Complete today's full protocol.",
  },
};

// ─── Week templates by trend + completion ───────────────

const WEEK_TEMPLATES: Record<EngineMode, Record<TrendDirection, string>> = {
  metabolic: {
    up: "Your metabolic trend is improving. Maintain current plan.",
    flat: "Progress is steady. Tighten execution for greater gains.",
    down: "Recent trends show instability. Reduce variability and reinforce sleep.",
  },
};

function getWeekText(
  engine: EngineMode,
  trend: TrendDirection,
): string {
  return WEEK_TEMPLATES[engine][trend];
}

// ─── Plan suggestion gating ─────────────────────────────

function evaluatePlanSuggestion(
  input: RecommendationInput,
): RecommendationOutput["planSuggestion"] {
  const {
    engineMode,
    currentLevel,
    scoreTotal,
    scoreStatus,
    streakDays,
    weeklyCompletionPct,
    last7DayAvgScore,
    needsSupportDaysLast14,
    daysInLevel,
    upcomingGameOrPractice,
  } = input;

  const trend = getTrendDirection(last7DayAvgScore, input.prior7DayAvgScore);

  // ── Advance: eligible to level up
  if (
    currentLevel < 7 &&
    daysInLevel >= 14 &&
    last7DayAvgScore >= 80 &&
    weeklyCompletionPct >= 85 &&
    streakDays >= 10 &&
    needsSupportDaysLast14 <= 2
  ) {
    return {
      type: "advance",
      text: `Client meets all criteria for Level ${currentLevel + 1}. Consistent scores and strong adherence support advancement.`,
      coachOverrideRequired: true,
    };
  }

  // ── Deload: sustained poor performance
  if (
    needsSupportDaysLast14 >= 5 &&
    trend === "down" &&
    last7DayAvgScore < 55
  ) {
    const engineDeload: Record<EngineMode, string> = {
      metabolic: "Consider reducing fasting window duration or switching to a lighter protocol.",
    };
    return {
      type: "deload",
      text: engineDeload[engineMode],
      coachOverrideRequired: true,
    };
  }

  // ── Hold: borderline but not ready to advance
  if (
    currentLevel < 7 &&
    daysInLevel >= 14 &&
    last7DayAvgScore >= 65 &&
    last7DayAvgScore < 80
  ) {
    return {
      type: "hold",
      text: "Scores are improving but haven't reached advancement threshold. Continue current programming.",
      coachOverrideRequired: false,
    };
  }

  // ── Shift: engine-specific protocol adjustments
  if (engineMode === "metabolic" && scoreStatus === "moderate" && trend === "down") {
    return {
      type: "shift",
      text: "Consider adjusting fasting window duration to match client's current tolerance.",
      coachOverrideRequired: true,
    };
  }

  if (engineMode === "metabolic" && scoreStatus === "moderate" && trend === "down") {
    return {
      type: "shift",
      text: "Consider adjusting training volume or toggling fasting to improve readiness.",
      coachOverrideRequired: true,
    };
  }

  // ── Maintain: default
  if (scoreStatus === "strong" && weeklyCompletionPct >= 80) {
    return {
      type: "maintain",
      text: "Current programming is producing strong results. No changes recommended.",
      coachOverrideRequired: false,
    };
  }

  return null;
}

// ─── Main generation function ───────────────────────────

export function generateRecommendation(
  input: RecommendationInput,
): RecommendationOutput {
  const trend = getTrendDirection(
    input.last7DayAvgScore,
    input.prior7DayAvgScore,
  );

  // Today text: factor override takes priority, then status template
  const factorOverride = TODAY_FACTOR_OVERRIDES[input.engineMode][input.lowestFactor];
  let todayText: string;
  if (factorOverride) {
    todayText = factorOverride;
  } else {
    const statusOptions = TODAY_STATUS_TEMPLATES[input.engineMode][input.scoreStatus];
    todayText = statusOptions[Math.floor(Math.random() * statusOptions.length)];
  }

  // Week text
  const weekText = getWeekText(input.engineMode, trend);

  // Plan suggestion (gated)
  const planSuggestion = evaluatePlanSuggestion(input);

  return { todayText, weekText, planSuggestion };
}

// ─── Plan suggestion display labels ─────────────────────

export const PLAN_SUGGESTION_LABELS: Record<
  PlanSuggestionType,
  { label: string; color: string }
> = {
  maintain: { label: "Maintain", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  advance: { label: "Advance", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  hold: { label: "Hold", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  deload: { label: "Deload", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  shift: { label: "Shift", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
};
