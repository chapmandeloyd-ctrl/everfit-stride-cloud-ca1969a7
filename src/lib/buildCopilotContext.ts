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
  // Enriched fields
  fasting_completed_count?: number | null;
  fasting_protocol_name?: string | null;
  workouts_completed?: number | null;
  workouts_assigned?: number | null;
  tasks_completed?: number | null;
  tasks_total?: number | null;
  weight_change_lbs?: number | null;
  current_weight?: number | null;
  keto_type?: string | null;
  adherence_score?: number | null;
  injury_flag?: boolean | null;
  feedback_topic?: string | null;
}

export function buildCopilotContext(params: {
  readinessScore: number | null;
  status: string;
  lowestFactor: string | null;
  weeklyCompletionPct: number | null;
  streakDays: number | null;
  trendDirection: "up" | "down" | "flat";
  parentLinkActive: boolean;
  // Optional enriched params
  fastingCompletedCount?: number | null;
  fastingProtocolName?: string | null;
  workoutsCompleted?: number | null;
  workoutsAssigned?: number | null;
  tasksCompleted?: number | null;
  tasksTotal?: number | null;
  weightChangeLbs?: number | null;
  currentWeight?: number | null;
  ketoType?: string | null;
  adherenceScore?: number | null;
  injuryFlag?: boolean | null;
  feedbackTopic?: string | null;
}): CopilotContext {
  return {
    readiness_score: params.readinessScore,
    status: params.status,
    lowest_factor: params.lowestFactor,
    weekly_completion_pct: params.weeklyCompletionPct,
    streak_days: params.streakDays,
    last_7_day_trend: params.trendDirection,
    parent_link_active: params.parentLinkActive,
    fasting_completed_count: params.fastingCompletedCount ?? null,
    fasting_protocol_name: params.fastingProtocolName ?? null,
    workouts_completed: params.workoutsCompleted ?? null,
    workouts_assigned: params.workoutsAssigned ?? null,
    tasks_completed: params.tasksCompleted ?? null,
    tasks_total: params.tasksTotal ?? null,
    weight_change_lbs: params.weightChangeLbs ?? null,
    current_weight: params.currentWeight ?? null,
    keto_type: params.ketoType ?? null,
    adherence_score: params.adherenceScore ?? null,
    injury_flag: params.injuryFlag ?? null,
    feedback_topic: params.feedbackTopic ?? null,
  };
}
