// Resolves a client's effective eating window for a given date by combining
// their base weekly schedule with any active date-range override (vacation).

export type FastRatio = "16:8" | "18:6" | "20:4" | "eat_all_day";

export interface WeeklyScheduleDay {
  day_of_week: number; // 0 = Sunday .. 6 = Saturday
  ratio: FastRatio;
  window_start_time: string; // "HH:MM" or "HH:MM:SS"
  window_end_time: string;
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
  eat_all_day: 0,
};

export const RATIO_EAT_HOURS: Record<FastRatio, number> = {
  "16:8": 8,
  "18:6": 6,
  "20:4": 4,
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

export function findActiveOverride(
  overrides: ScheduleOverride[] | undefined | null,
  date: Date
): ScheduleOverride | null {
  if (!overrides?.length) return null;
  const key = date.toISOString().slice(0, 10);
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

export const RATIO_LABEL: Record<FastRatio, string> = {
  "16:8": "16:8",
  "18:6": "18:6",
  "20:4": "20:4",
  eat_all_day: "Eat all day",
};