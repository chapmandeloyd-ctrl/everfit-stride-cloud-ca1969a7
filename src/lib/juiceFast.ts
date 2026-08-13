/** Shared config + helpers for the Juice Fast feature. */

export type JuiceFastMode = "juice_only" | "juice_plus_light";

export interface JuiceFastModeMeta {
  id: JuiceFastMode;
  label: string;
  short: string;
  description: string;
  allows: string[];
  avoid: string[];
  accent: string;
}

export const JUICE_MODES: JuiceFastModeMeta[] = [
  {
    id: "juice_only",
    label: "Juice Only",
    short: "Strict",
    description:
      "Fresh juice, water and electrolytes only. No solid food for the whole duration. The deepest reset — treat it like an extended fast.",
    allows: ["Fresh pressed juice", "Water", "Electrolytes", "Herbal tea, black coffee"],
    avoid: ["Any solid food", "Protein shakes", "Dairy", "Alcohol"],
    accent: "text-emerald-400",
  },
  {
    id: "juice_plus_light",
    label: "Juice + Light",
    short: "Modified",
    description:
      "Juice is the base, with small snacks allowed when you need them. No full meals. Easier to sustain and better if you're still training or working long days.",
    allows: ["Fresh pressed juice", "Small snack (fruit, broth, a few nuts)", "Water", "Electrolytes"],
    avoid: ["Full meals", "Processed food", "Sugary drinks", "Alcohol"],
    accent: "text-lime-400",
  },
];

export function modeMeta(mode: string): JuiceFastModeMeta {
  return JUICE_MODES.find((m) => m.id === mode) ?? JUICE_MODES[0];
}

/** Lengths a client can start on their own. Anything longer needs a trainer. */
export const SELF_SERVE_MAX_DAYS = 3;
export const DAY_PRESETS = [1, 3, 5, 7, 10];

/** A refeed day is auto-appended for anything 3 days or longer. */
export function needsRefeed(days: number) {
  return days >= 3;
}

export interface JuiceFastSession {
  id: string;
  client_id: string;
  trainer_id: string | null;
  mode: JuiceFastMode;
  planned_days: number;
  started_at: string;
  ends_at: string | null;
  ended_at: string | null;
  status: "active" | "completed" | "cancelled";
  log_reminder_enabled?: boolean;
  log_reminder_time?: string;
  ended_early: boolean;
  end_reason: string | null;
  includes_refeed: boolean;
  notes: string | null;
}

export interface JuiceDayLog {
  id: string;
  session_id: string;
  client_id: string;
  log_date: string;
  day_number: number | null;
  juice_count: number;
  water_oz: number;
  snacked: boolean;
  snack_note: string | null;
  photo_url: string | null;
  energy_rating: number | null;
  notes: string | null;
}

/** Progress of a running session, derived from wall-clock time. */
export function juiceProgress(session: Pick<JuiceFastSession, "started_at" | "planned_days">, now = Date.now()) {
  const start = new Date(session.started_at).getTime();
  const totalMs = session.planned_days * 24 * 60 * 60 * 1000;
  const elapsedMs = Math.max(0, now - start);
  const pct = totalMs > 0 ? Math.min(1, elapsedMs / totalMs) : 0;
  const elapsedHours = elapsedMs / 3_600_000;
  const dayNumber = Math.min(session.planned_days, Math.floor(elapsedMs / 86_400_000) + 1);
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  return { pct, elapsedMs, elapsedHours, dayNumber, remainingMs, complete: remainingMs <= 0 };
}

export function formatRemaining(ms: number) {
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}