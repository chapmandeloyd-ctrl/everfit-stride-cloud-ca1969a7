/**
 * Engine Configuration
 *
 * APEXBEAST-IF is a fasting app. There is a single engine.
 * (The former Metabolic / Performance / Athletic modes were removed.)
 */

export type EngineMode = "metabolic";

export type DashboardCardKey =
  | "header"
  | "calendar"
  | "fasting_card"
  | "workout_card"
  | "score_panel"
  | "checkin"
  | "insight"
  | "break_fast"
  | "coach_tip"
  | "nutrition"
  | "recovery"
  | "focus_selector";

export interface EngineConfig {
  id: EngineMode;
  label: string;
  shortLabel: string;
  tagline: string;
  ageRange: string;
  scoreLabel: string;
  emphasis: "fasting";
  dashboardOrder: DashboardCardKey[];
  scoringWeights: {
    streak: number;
    weeklyCompletion: number;
    sleepHours: number;
    sleepQuality: number;
    nutrition: number;
    recovery: number;
  };
  insightTone: "clinical";
  insights: string[];
  /** Kept for call-site compatibility — fasting is always enabled. */
  fastingDisabled: boolean;
  features: {
    showFastingUI: boolean;
    showFastingProtocols: boolean;
    trainingDominant: boolean;
    recoveryDominant: boolean;
    showFuelingGuidance: boolean;
  };
  plansEmphasis: string;
}

export const APEXBEAST_ENGINE: EngineConfig = {
  id: "metabolic",
  label: "APEXBEAST-IF Engine",
  shortLabel: "APEXBEAST-IF",
  tagline: "Build consistent metabolic rhythm",
  ageRange: "18+",
  scoreLabel: "APEXBEAST-IF Readiness Index",
  emphasis: "fasting",

  dashboardOrder: [
    "header",
    "calendar",
    "fasting_card",
    "score_panel",
    "checkin",
    "insight",
    "break_fast",
    "coach_tip",
    "workout_card",
    "recovery",
  ],

  scoringWeights: {
    streak: 0.25,
    weeklyCompletion: 0.25,
    sleepHours: 0.10,
    sleepQuality: 0.05,
    nutrition: 0.25,
    recovery: 0.10,
  },

  insightTone: "clinical",
  insights: [
    "Fasting is not about punishment. It is about control over habits, timing, and consistency.",
    "Consistency builds metabolic resilience. Progression follows stability.",
    "You do not need the hardest plan. You need the plan you can repeat.",
    "Discipline compounds. Results follow. Small daily wins create visible change.",
    "Every completed fast builds metabolic resilience, appetite awareness, and confidence.",
    "We do not chase extremes. We build consistency, recovery, longevity, and structure.",
    "Choose the level that supports your life — not one that disrupts it.",
  ],

  fastingDisabled: false,

  features: {
    showFastingUI: true,
    showFastingProtocols: true,
    trainingDominant: false,
    recoveryDominant: false,
    showFuelingGuidance: false,
  },

  plansEmphasis: "Fasting protocols shown first. Training supplements metabolic stability.",
};

export const ENGINE_CONFIGS: Record<EngineMode, EngineConfig> = {
  metabolic: APEXBEAST_ENGINE,
};

export function getEngineConfig(_mode?: EngineMode): EngineConfig {
  return APEXBEAST_ENGINE;
}
