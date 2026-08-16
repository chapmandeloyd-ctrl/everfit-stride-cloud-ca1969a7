import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, X } from "lucide-react";
import { formatHour, timeToHour, breakFastHourFor, endHourFor, type WeeklyScheduleDay } from "@/lib/resolveFastingWindow";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { supabase } from "@/integrations/supabase/client";
import { CancelFastSheet, type CancelAction } from "@/components/fasting/CancelFastSheet";
import { emitActivityEvent } from "@/lib/activityEvents";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStartFast } from "@/hooks/useStartFast";

function hourToTime(h: number): string {
  const total = ((h % 24) + 24) % 24;
  const hr = Math.floor(total);
  const mn = Math.round((total - hr) * 60);
  return `${String(hr).padStart(2, "0")}:${String(mn).padStart(2, "0")}:00`;
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

export function nextOccurrence(hour: number): Date {
  const now = new Date();
  const d = new Date(now);
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  d.setHours(h, m, 0, 0);
  return d;
}

export function fastSkipKey(clientId: string | null | undefined): string {
  return `autostart_skipped_${clientId ?? "anon"}_${localDateKey(new Date())}`;
}

/** Cancel (or restore) today's scheduled auto-start, locally + server-side. */
export function setFastSkipToday(clientId: string | null | undefined, value: boolean) {
  if (typeof window !== "undefined") {
    const key = fastSkipKey(clientId);
    if (value) window.localStorage.setItem(key, "1");
    else window.localStorage.setItem(key, "0"); // explicit restore beats the saved date
    window.dispatchEvent(new Event("apex-fast-skip-changed"));
  }
  if (clientId) {
    void supabase
      .from("client_feature_settings")
      .update({ auto_fast_skip_date: value ? localDateKey(new Date()) : null } as any)
      .eq("client_id", clientId);
  }
}

/**
 * Live "is today's fast cancelled" flag, synced across components.
 * Local storage answers instantly; the saved `auto_fast_skip_date` makes the
 * cancellation survive reloads and other devices.
 */
export function useFastSkippedToday(clientId: string | null | undefined): boolean {
  const key = useMemo(() => fastSkipKey(clientId), [clientId]);
  const [local, setLocal] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const read = () => setLocal(window.localStorage.getItem(key));
    read();
    window.addEventListener("apex-fast-skip-changed", read);
    return () => window.removeEventListener("apex-fast-skip-changed", read);
  }, [key]);

  const { data: remoteSkipDate } = useQuery({
    queryKey: ["auto-fast-skip-date", clientId],
    enabled: !!clientId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("auto_fast_skip_date")
        .eq("client_id", clientId!)
        .maybeSingle();
      return ((data as any)?.auto_fast_skip_date as string | null) ?? null;
    },
  });

  if (local === "1") return true;
  if (local === "0") return false;
  return !!remoteSkipDate && String(remoteSkipDate).slice(0, 10) === localDateKey(new Date());
}

/**
 * Countdown to today's scheduled fast start, driven purely by the client's
 * calendar day (works even when no protocol is assigned).
 */
export function ScheduleCountdownRow({
  day,
  accent = "hsl(var(--primary))",
  /** Undo is only offered when the day came from a full assigned plan. */
  hasFullPlan = false,
}: {
  day: WeeklyScheduleDay | null | undefined;
  accent?: string;
  hasFullPlan?: boolean;
}) {
  const clientId = useEffectiveClientId();
  const qc = useQueryClient();
  const startFast = useStartFast();
  const autoStartFired = useRef(false);
  const skipped = useFastSkippedToday(clientId);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [stage, setStage] = useState<"confirm" | "options" | "summary">("options");
  const [summary, setSummary] = useState<{ title: string; body: string } | null>(null);

  const setSkip = (value: boolean) => setFastSkipToday(clientId, value);

  if (!day || day.enabled === false || day.ratio === "eat_all_day") return null;

  const startHour = timeToHour(day.window_start_time);
  const breaksAt = breakFastHourFor(day.ratio, startHour);
  const fastHours = Math.round((((breaksAt - startHour) + 24) % 24) * 10) / 10;

  // Calendar-only schedules do not pass through the assigned-plan gate. Start
  // them here when today's scheduled moment arrives, preserving that exact
  // timestamp if the app was asleep or closed at the time.
  useEffect(() => {
    if (skipped || autoStartFired.current || startFast.isPending) return;
    const scheduledAt = nextOccurrence(startHour);
    if (scheduledAt.getTime() > Date.now()) return;
    const firedKey = `calendar_autostart_fired_${clientId ?? "anon"}_${localDateKey(scheduledAt)}`;
    if (typeof window !== "undefined" && window.localStorage.getItem(firedKey) === "1") return;
    autoStartFired.current = true;
    if (typeof window !== "undefined") window.localStorage.setItem(firedKey, "1");
    startFast.mutate(scheduledAt.toISOString());
  }, [clientId, skipped, startFast, startHour]);

  const stats = [
    { label: "Scheduled start", value: formatHour(startHour) },
    { label: "Planned break", value: formatHour(breaksAt) },
    { label: "Planned length", value: `${fastHours}h` },
    { label: "Time fasted", value: "0h — never started" },
  ];

  const baseMeta = {
    ratio: day.ratio,
    start_hour: startHour,
    break_hour: breaksAt,
    planned_hours: fastHours,
    started: false,
    source: hasFullPlan ? "assigned_plan" : "calendar",
  };

  const handleAction = async (action: CancelAction, reason: string, newStartTime?: string) => {
    const reasonLabel = reason || "No reason given";

    if (action === "reschedule" && newStartTime) {
      const newHour = timeToHour(`${newStartTime}:00`);
      if (clientId) {
        // Single-day change only: write a date-scoped override so the client's
        // recurring weekly template (every future same weekday) is untouched.
        const todayKey = localDateKey(new Date());
        const dow = new Date().getDay();
        const editedDay = {
          day_of_week: dow,
          ratio: day.ratio,
          window_start_time: hourToTime(newHour),
          window_end_time: hourToTime(endHourFor(day.ratio, breakFastHourFor(day.ratio, newHour))),
          enabled: true,
        };
        const { data: existing } = await supabase
          .from("client_schedule_overrides" as any)
          .select("id, schedule")
          .eq("client_id", clientId)
          .eq("start_date", todayKey)
          .eq("end_date", todayKey)
          .maybeSingle();
        const prior = ((existing as any)?.schedule ?? []) as any[];
        const schedule = prior.some((d) => d?.day_of_week === dow)
          ? prior.map((d) => (d?.day_of_week === dow ? editedDay : d))
          : [...prior, editedDay];
        await supabase.from("client_schedule_overrides" as any).upsert({
          ...((existing as any)?.id ? { id: (existing as any).id } : {}),
          client_id: clientId,
          label: "Start later today",
          start_date: todayKey,
          end_date: todayKey,
          schedule,
          active: true,
        });
        void emitActivityEvent({
          clientId,
          eventType: "fast_rescheduled",
          title: "Fast rescheduled",
          subtitle: `${formatHour(startHour)} → ${formatHour(newHour)} · ${reasonLabel}`,
          category: "fasting",
          icon: "clock",
          metadata: { ...baseMeta, action: "reschedule", reason: reasonLabel, new_start_hour: newHour },
        });
        qc.invalidateQueries({ queryKey: ["client-schedule-overrides", clientId] });
      }
      setSkip(false);
      setSummary({
        title: "Fast rescheduled",
        body: `Today's fast now starts at ${formatHour(newHour)} and breaks at ${formatHour(breakFastHourFor(day.ratio, newHour))}. It still counts.`,
      });
      setStage("summary");
      return;
    }

    if (action === "push") {
      if (clientId) {
        const { data } = await supabase
          .from("client_feature_settings")
          .select("protocol_start_date")
          .eq("client_id", clientId)
          .maybeSingle();
        const current = (data as any)?.protocol_start_date;
        if (current) {
          const d = new Date(`${String(current).slice(0, 10)}T00:00:00`);
          d.setDate(d.getDate() + 1);
          await supabase
            .from("client_feature_settings")
            .update({ protocol_start_date: localDateKey(d) } as any)
            .eq("client_id", clientId);
        }
        void emitActivityEvent({
          clientId,
          eventType: "plan_pushed_forward",
          title: "Plan pushed forward a day",
          subtitle: `${day.ratio} skipped today · ${reasonLabel}`,
          category: "fasting",
          icon: "calendar",
          metadata: { ...baseMeta, action: "push", reason: reasonLabel },
        });
        qc.invalidateQueries({ queryKey: ["ccp-settings", clientId] });
        qc.invalidateQueries({ queryKey: ["client-plan-window", clientId] });
      }
      setSkip(true);
      setSummary({
        title: "Plan pushed forward",
        body: "Today is off and your whole plan shifted one day later, so you don't lose a day.",
      });
      setStage("summary");
      return;
    }

    // Skip today
    setSkip(true);
    if (clientId) {
      void emitActivityEvent({
        clientId,
        eventType: "fast_cancelled",
        title: "Scheduled fast cancelled",
        subtitle: `${day.ratio} · was set to start ${formatHour(startHour)} · ${reasonLabel}`,
        category: "fasting",
        icon: "x-circle",
        metadata: { ...baseMeta, action: "skip", reason: reasonLabel },
      });
    }
    setSummary({
      title: "Fast cancelled",
      body: "No fast today. It still counts toward your score — you can make it up tomorrow.",
    });
    setStage("summary");
  };

  const sheet = (
    <CancelFastSheet
      open={sheetOpen}
      onOpenChange={(o) => {
        setSheetOpen(o);
        if (!o) {
          setStage("options");
          setSummary(null);
        }
      }}
      variant="scheduled"
      stage={stage}
      stats={stats}
      defaultStartTime={hourToTime(startHour).slice(0, 5)}
      onAction={(a, r, t) => void handleAction(a, r, t)}
      summaryTitle={summary?.title}
      summaryBody={summary?.body}
      onDone={() => {
        setSheetOpen(false);
        setStage("options");
        setSummary(null);
      }}
    />
  );

  if (skipped) {
    if (!hasFullPlan) return sheet;
    return (
      <>
      <div
        className="rounded-xl border px-3 py-2.5 text-center"
        style={{ borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.05)" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">
          Fast cancelled for today
        </p>
        <button
          type="button"
          onClick={() => {
            setSkip(false);
            if (clientId) {
              void emitActivityEvent({
                clientId,
                eventType: "fast_cancel_undone",
                title: "Cancelled fast restored",
                subtitle: `${day.ratio} · back on for ${formatHour(startHour)}`,
                category: "fasting",
                icon: "play",
                metadata: { ...baseMeta, action: "undo" },
              });
            }
          }}
          className="mt-1.5 text-xs font-bold text-white underline underline-offset-4"
        >
          Undo
        </button>
      </div>
      {sheet}
      </>
    );
  }

  return (
    <>
    <div
      className="rounded-xl border px-3 py-2.5 text-center"
      style={{ borderColor: `${accent}40`, backgroundColor: `${accent}12` }}
    >
      <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/60">
        <Clock className="h-3 w-3" />
        Scheduled fast
      </div>
      <p className="mt-0.5 text-[11px] text-white/60">
        Starts {formatHour(startHour)} · breaks {formatHour(breaksAt)}
      </p>
      <button
        type="button"
        onClick={() => {
          setStage("options");
          setSheetOpen(true);
        }}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/80 hover:bg-black/60"
      >
        <X className="h-3 w-3" />
        Cancel today's fast
      </button>
    </div>
    {sheet}
    </>
  );
}
