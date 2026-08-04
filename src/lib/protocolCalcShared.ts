// Shared source of truth for the Protocol Calculator math + option tables.
// Used by BOTH the trainer panel (KetoProtocolCalculatorPanel) and the
// client-owned mobile builder (ClientPlanBuilder) so the two can never drift.

export type CalcGoal = "cut" | "maintain" | "bulk" | "custom";
export type CalcActivity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type CalcPlanType = "recurring" | "extended";
export type CalcExtendedPreset = "24" | "36" | "48" | "72" | "120" | "custom";

export const ACTIVITY_MULT: Record<CalcActivity, number> = {
  sedentary: 13,
  light: 14.5,
  moderate: 16,
  active: 17.5,
  very_active: 19,
};

export const GOAL_ADJUST: Record<Exclude<CalcGoal, "custom">, number> = {
  cut: -0.2,
  maintain: 0,
  bulk: 0.1,
};

export const ACTIVITY_LABEL: Record<CalcActivity, string> = {
  sedentary: "Sedentary (desk job)",
  light: "Light (1–3 days/wk)",
  moderate: "Moderate (3–5 days/wk)",
  active: "Active (6–7 days/wk)",
  very_active: "Very Active (2x/day)",
};

export const GOAL_LABEL: Record<CalcGoal, string> = {
  cut: "Cut (-20%)",
  maintain: "Maintain",
  bulk: "Bulk (+10%)",
  custom: "Custom deficit…",
};

export const DURATION_OPTIONS = [
  { value: 1, label: "1 day" },
  { value: 3, label: "3 days" },
  { value: 7, label: "7 days (week)" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
];

export const EXTENDED_PRESETS: { value: CalcExtendedPreset; label: string }[] = [
  { value: "24", label: "24 hours" },
  { value: "36", label: "36 hours" },
  { value: "48", label: "48 hours (2 day)" },
  { value: "72", label: "72 hours (3 day)" },
  { value: "120", label: "120 hours (5 day)" },
  { value: "custom", label: "Custom hours…" },
];

export function goalAdjustFor(goal: CalcGoal, customDeficitPct: number): number {
  return goal === "custom" ? -(customDeficitPct / 100) : GOAL_ADJUST[goal];
}

export interface MacroSummary {
  tdee: number;
  target: number;
  proteinFloor: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}

/** Identical math to the trainer calculator's headline numbers. */
export function computeMacroSummary(args: {
  weightLbs: number;
  activity: CalcActivity;
  goal: CalcGoal;
  customDeficitPct: number;
  proteinPct: number;
  carbsPct: number;
}): MacroSummary {
  const { weightLbs: w, activity, goal, customDeficitPct, proteinPct, carbsPct } = args;
  const tdee = Math.round(w * ACTIVITY_MULT[activity]);
  const target = Math.round(tdee * (1 + goalAdjustFor(goal, customDeficitPct)));
  const proteinFloor = Math.round(w * 0.7);
  const proteinG = Math.max(proteinFloor, Math.round((target * (proteinPct / 100)) / 4));
  const carbG = Math.round((target * (carbsPct / 100)) / 4);
  const fatG = Math.max(0, Math.round((target - proteinG * 4 - carbG * 4) / 9));
  return { tdee, target, proteinFloor, proteinG, carbG, fatG };
}

/** Assignment duration in days for a given plan type (matches trainer save). */
export function assignmentDurationDays(args: {
  planType: CalcPlanType;
  planLengthDays: number;
  extendedPreset: CalcExtendedPreset;
  customFastHours: number;
}): number {
  const { planType, planLengthDays, extendedPreset, customFastHours } = args;
  if (planType !== "extended") return planLengthDays;
  const hours = extendedPreset === "custom" ? customFastHours : parseInt(extendedPreset, 10);
  return Math.max(1, Math.ceil(Math.max(12, Math.min(240, hours)) / 24));
}

export function todayDateKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
