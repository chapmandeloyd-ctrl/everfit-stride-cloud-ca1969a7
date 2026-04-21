const LOG_KEY = 'healthReminderLog';
const MAX_ENTRIES = 20;

export type ReminderLogEntry = {
  /** ISO timestamp of when the snap action was tapped */
  tappedAt: string;
  /** Scheduled reminder time "HH:MM" if tied to one, otherwise null (manual snap) */
  reminderTime: string | null;
  /** YYYY-MM-DD of when this happened */
  date: string;
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadReminderLog(): ReminderLogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function appendReminderLog(reminderTime: string | null) {
  const entry: ReminderLogEntry = {
    tappedAt: new Date().toISOString(),
    reminderTime,
    date: todayKey(),
  };
  const existing = loadReminderLog();
  const next = [entry, ...existing].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('health-reminder-log-updated'));
  } catch {
    /* ignore */
  }
}

export function getTodaysLog(): ReminderLogEntry[] {
  const today = todayKey();
  return loadReminderLog().filter((e) => e.date === today);
}

/** Find the most recent reminder time that has passed today (within last 30 min) */
export function findActiveReminderTime(times: string[]): string | null {
  if (!times?.length) return null;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  let best: { time: string; diff: number } | null = null;
  for (const t of times) {
    const [h, m] = t.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) continue;
    const diff = nowMins - (h * 60 + m);
    if (diff >= 0 && diff <= 30) {
      if (!best || diff < best.diff) best = { time: t, diff };
    }
  }
  return best?.time ?? null;
}

export function formatReminderTimeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatTappedAt(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${String(m).padStart(2, '0')} ${period}`;
}
