// Resolves a client's effective fasting schedule for a given date by combining
// their base weekly schedule with any active date-range override (vacation).

export type FastRatio = "16:8" | "18:6" | "20:4" | "omad" | "eat_all_day";

export interface WeeklyScheduleDay {
  day_of_week: number; // 0 = Sunday .. 6 = Saturday
  ratio: FastRatio;
  window_start_time: string; // Fast start time, "HH:MM" or "HH:MM:SS"
  window_end_time: string; // Break-fast time, derived from ratio
  enabled: boolean;
}

export interface ScheduleOverride {
  id: string;
  label: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  schedule: WeeklyScheduleDay[]; // 7 entries
  active: boolean;
}

export const RATIO_FAST_HOURS: Record<FastRatio, number> = {
  "16:8": 16,
  "18:6": 18,
  "20:4": 20,
  omad: 23,
  eat_all_day: 0,
};

export const RATIO_EAT_HOURS: Record<FastRatio, number> = {
  "16:8": 8,
  "18:6": 6,
  "20:4": 4,
  omad: 1,
  eat_all_day: 24,
};

export function formatHour(h: number): string {
  // Accepts fractional hours (e.g. 6.5 = 6:30).
  const total = ((h % 24) + 24) % 24;
  const hr = Math.floor(total);
  const min = Math.round((total - hr) * 60);
  const period = hr >= 12 ? "PM" : "AM";
  const display = hr % 12 === 0 ? 12 : hr % 12;
  const mm = String(min).padStart(2, "0");
  return `${display}:${mm} ${period}`;
}

export function timeToHour(t: string): number {
  // Returns fractional hours ("06:31:00" -> 6.5166...).
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10) || 0;
  const mn = parseInt(m, 10) || 0;
  return hr + mn / 60;
}

export function endHourFor(ratio: FastRatio, startHour: number): number {
  return (startHour + RATIO_EAT_HOURS[ratio]) % 24;
}

export function breakFastHourFor(ratio: FastRatio, fastStartHour: number): number {
  return (fastStartHour + RATIO_FAST_HOURS[ratio]) % 24;
}

// Local-calendar date key (YYYY-MM-DD). Overrides are stored as local dates,
// so lookups must not go through UTC (toISOString) or they shift a day east of UTC.
function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function findActiveOverride(
  overrides: ScheduleOverride[] | undefined | null,
  date: Date
): ScheduleOverride | null {
  if (!overrides?.length) return null;
  const key = localDateKey(date);
  return (
    overrides.find(
      (o) => o.active && key >= o.start_date && key <= o.end_date
    ) ?? null
  );
}

export function resolveDayForDate(
  weekly: WeeklyScheduleDay[] | undefined | null,
  overrides: ScheduleOverride[] | undefined | null,
  date: Date
): WeeklyScheduleDay | null {
  const dow = date.getDay(); // 0-6 (Sun-Sat)
  const override = findActiveOverride(overrides, date);
  const src = override?.schedule ?? weekly ?? [];
  return src.find((d) => d.day_of_week === dow) ?? null;
}

// ---------------------------------------------------------------------------
// Plan window (assignment) resolution
// ---------------------------------------------------------------------------

export interface PlanWindow {
  /** YYYY-MM-DD the assigned plan starts on. */
  startDate: string | null;
  /** Number of days the assignment runs for. */
  durationDays: number | null;
  /** "one_time" = runs once then ends. "recurring" = first N days of each week. */
  runMode: "one_time" | "recurring" | null;
}

export type DayState = "scheduled" | "rest" | "out_of_plan" | "unset";

export interface ResolvedDay {
  state: DayState;
  day: WeeklyScheduleDay | null;
  /** True when a date-range override (vacation / travel) drives this day. */
  adjusted: boolean;
}

function daysBetween(startKey: string, date: Date): number {
  const [y, m, d] = startKey.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return 0;
  const start = new Date(y, m - 1, d);
  start.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

/** Is this date inside the assigned plan window? */
export function isWithinPlanWindow(plan: PlanWindow | null | undefined, date: Date): boolean {
  if (!plan?.startDate || !plan.durationDays || plan.durationDays <= 0) return true;
  const offset = daysBetween(plan.startDate, date);
  if (offset < 0) return false;
  if (plan.runMode === "recurring") return offset % 7 < plan.durationDays;
  return offset < plan.durationDays;
}

/**
 * Single source of truth for what a calendar square should show.
 * Never fabricates times: a day with no saved row resolves to "unset".
 */
export function resolveDayState(
  weekly: WeeklyScheduleDay[] | undefined | null,
  overrides: ScheduleOverride[] | undefined | null,
  date: Date,
  plan?: PlanWindow | null
): ResolvedDay {
  const override = findActiveOverride(overrides, date);
  const day = resolveDayForDate(weekly, overrides, date);
  if (!isWithinPlanWindow(plan, date)) {
    return { state: "out_of_plan", day: null, adjusted: !!override };
  }
  if (!day) return { state: "unset", day: null, adjusted: !!override };
  if (day.enabled === false) return { state: "rest", day, adjusted: !!override };
  return { state: "scheduled", day, adjusted: !!override };
}

export const RATIO_LABEL: Record<FastRatio, string> = {
  "16:8": "16:8",
  "18:6": "18:6",
  "20:4": "20:4",
  eat_all_day: "Eat all day",
};