import { useEffect, useMemo, useState } from "react";
import { Clock, X } from "lucide-react";
import { formatHour, timeToHour, breakFastHourFor, type WeeklyScheduleDay } from "@/lib/resolveFastingWindow";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { supabase } from "@/integrations/supabase/client";

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

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
  const clientId = useEffectiveClientId();
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const skipKey = useMemo(
    () => `autostart_skipped_${clientId ?? "anon"}_${localDateKey(new Date())}`,
    [clientId],
  );
  const [skipped, setSkipped] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setSkipped(window.localStorage.getItem(skipKey) === "1");
  }, [skipKey]);

  const setSkip = (value: boolean) => {
    if (typeof window !== "undefined") {
      if (value) window.localStorage.setItem(skipKey, "1");
      else window.localStorage.removeItem(skipKey);
    }
    setSkipped(value);
    if (clientId) {
      void supabase
        .from("client_feature_settings")
        .update({ auto_fast_skip_date: value ? localDateKey(new Date()) : null } as any)
        .eq("client_id", clientId);
    }
  };

  if (!day || day.enabled === false || day.ratio === "eat_all_day") return null;

  const startHour = timeToHour(day.window_start_time);
  const target = nextOccurrence(startHour);
  const breaksAt = breakFastHourFor(day.ratio, startHour);

  if (skipped) {
    return (
      <div
        className="rounded-xl border px-3 py-2.5 text-center"
        style={{ borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.05)" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">
          Fast cancelled for today
        </p>
        <button
          type="button"
          onClick={() => setSkip(false)}
          className="mt-1.5 text-xs font-bold text-white underline underline-offset-4"
        >
          Undo
        </button>
      </div>
    );
  }

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
      <button
        type="button"
        onClick={() => setSkip(true)}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/80 hover:bg-black/60"
      >
        <X className="h-3 w-3" />
        Cancel today's fast
      </button>
    </div>
  );
}
