import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { formatHour, timeToHour, breakFastHourFor, type WeeklyScheduleDay } from "@/lib/resolveFastingWindow";

function nextOccurrence(hour: number): Date {
  const now = new Date();
  const d = new Date(now);
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Countdown to today's scheduled fast start, driven purely by the client's
 * calendar day (works even when no protocol is assigned).
 */
export function ScheduleCountdownRow({
  day,
  accent = "hsl(var(--primary))",
}: {
  day: WeeklyScheduleDay | null | undefined;
  accent?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!day || day.enabled === false || day.ratio === "eat_all_day") return null;

  const startHour = timeToHour(day.window_start_time);
  const target = nextOccurrence(startHour);
  const breaksAt = breakFastHourFor(day.ratio, startHour);

  return (
    <div
      className="rounded-xl border px-3 py-2.5 text-center"
      style={{ borderColor: `${accent}40`, backgroundColor: `${accent}12` }}
    >
      <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/60">
        <Clock className="h-3 w-3" />
        Fast starts in
      </div>
      <p className="mt-0.5 text-2xl font-black tabular-nums text-white">
        {fmt(target.getTime() - now)}
      </p>
      <p className="mt-0.5 text-[11px] text-white/60">
        Starts {formatHour(startHour)} · breaks {formatHour(breaksAt)}
      </p>
    </div>
  );
}
