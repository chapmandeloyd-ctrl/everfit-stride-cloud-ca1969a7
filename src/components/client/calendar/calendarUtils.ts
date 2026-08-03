import {
  type FastRatio,
  type WeeklyScheduleDay,
  RATIO_LABEL,
  breakFastHourFor,
  formatHour,
  timeToHour,
} from "@/lib/resolveFastingWindow";

export const RATIOS: FastRatio[] = ["16:8", "18:6", "20:4", "eat_all_day"];

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function startOfWeek(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  c.setDate(c.getDate() - c.getDay());
  return c;
}

export function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function defaultWeek(): WeeklyScheduleDay[] {
  return Array.from({ length: 7 }, (_, dow) => ({
    day_of_week: dow,
    ratio: "16:8" as FastRatio,
    window_start_time: "20:00:00",
    window_end_time: "12:00:00",
    enabled: true,
  }));
}

export function computeEnd(ratio: FastRatio, startTime: string): string {
  const endHour = breakFastHourFor(ratio, timeToHour(startTime));
  const hr = Math.floor(endHour);
  const min = Math.round((endHour - hr) * 60);
  return `${String(hr).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
}

export function dayHeadline(day: WeeklyScheduleDay | null): string {
  if (!day || !day.enabled) return "Rest day";
  if (day.ratio === "eat_all_day") return "Eat all day";
  const start = timeToHour(day.window_start_time);
  return `${RATIO_LABEL[day.ratio]} · fast ${formatHour(start)} → breaks ${formatHour(
    breakFastHourFor(day.ratio, start),
  )}`;
}

export { RATIO_LABEL, formatHour, timeToHour, breakFastHourFor };
export type { FastRatio, WeeklyScheduleDay };