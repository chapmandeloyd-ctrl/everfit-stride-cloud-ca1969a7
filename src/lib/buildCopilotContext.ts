/**
 * Copilot Context Builder
 *
 * Assembles a structured, privacy-safe context object
 * for the AI Coach Copilot. No raw personal logs included.
 */

export interface CopilotContext {
  readiness_score: number | null;
  status: string;
  lowest_factor: string | null;
  weekly_completion_pct: number | null;
  streak_days: number | null;
  last_7_day_trend: "up" | "down" | "flat";
  parent_link_active: boolean;
}

export function buildCopilotContext(params: {
  readinessScore: number | null;
  status: string;
  lowestFactor: string | null;
  weeklyCompletionPct: number | null;
  streakDays: number | null;
  trendDirection: "up" | "down" | "flat";
  parentLinkActive: boolean;
}): CopilotContext {
  return {
    readiness_score: params.readinessScore,
    status: params.status,
    lowest_factor: params.lowestFactor,
    weekly_completion_pct: params.weeklyCompletionPct,
    streak_days: params.streakDays,
    last_7_day_trend: params.trendDirection,
    parent_link_active: params.parentLinkActive,
  };
}
