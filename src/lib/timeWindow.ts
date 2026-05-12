/* Shared time-of-day parsing/formatting helpers (extracted from
   ClientFastingPlanDetailPreview so /client/program can reuse them
   without dragging in the gold UI).  */

export type Period = "AM" | "PM";
export interface TimeParts {
  hour: number; // 1-12
  minute: number; // 0-59
  period: Period;
}

export function parseTime(str: string): TimeParts {
  const m = str.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return { hour: 10, minute: 0, period: "AM" };
  let hour = parseInt(m[1], 10);
  if (hour < 1) hour = 12;
  if (hour > 12) hour = 12;
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const period = (m[3].toUpperCase() === "PM" ? "PM" : "AM") as Period;
  return { hour, minute, period };
}

export function formatTime({ hour, minute, period }: TimeParts): string {
  return `${hour}:${minute.toString().padStart(2, "0")} ${period}`;
}

export function toMinutes({ hour, minute, period }: TimeParts): number {
  const h24 = period === "AM" ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;
  return h24 * 60 + minute;
}

export function fromMinutes(total: number): TimeParts {
  const m = ((total % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const minute = m % 60;
  const period: Period = h24 >= 12 ? "PM" : "AM";
  let hour = h24 % 12;
  if (hour === 0) hour = 12;
  return { hour, minute, period };
}

/** Shift any "10:00 AM" or "8:00 PM – 10:00 AM" string by N minutes. */
export function shiftTimeString(raw: string, shiftMinutes: number): string {
  if (!shiftMinutes) return raw;
  const shiftOne = (t: string) =>
    formatTime(fromMinutes(toMinutes(parseTime(t)) + shiftMinutes));
  const parts = raw.split(/\s*[–-]\s*/);
  if (parts.length === 2) {
    try { return `${shiftOne(parts[0])} – ${shiftOne(parts[1])}`; } catch { return raw; }
  }
  try { return shiftOne(raw); } catch { return raw; }
}

/** Pull eating-window opens/closes from a fasting_protocols.description JSON. */
export function pickWindowTimes(desc: unknown): { opensAt: string; closesAt: string } {
  let opens = "10:00 AM";
  let closes = "8:00 PM";
  if (desc && typeof desc === "object") {
    const d = desc as Record<string, unknown>;
    const ds = d.daily_structure as Record<string, unknown> | undefined;
    if (ds && typeof ds === "object") {
      if (typeof ds.break_fast === "string") {
        opens = ds.break_fast.split(/[–-]/)[0].trim();
      }
      if (typeof ds.stop_eating === "string") {
        const parts = ds.stop_eating.split(/[–-]/);
        closes = (parts[1] || parts[0]).trim();
      }
    }
  }
  return { opensAt: opens, closesAt: closes };
}