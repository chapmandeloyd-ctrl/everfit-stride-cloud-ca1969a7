import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useClientWeeklySchedule } from "@/hooks/useClientWeeklySchedule";
import { formatHour } from "@/lib/resolveFastingWindow";
import { findNextFastStart, runwayContent, runwayPhaseFor } from "@/lib/prepRunway";
import { useFastSkippedToday } from "@/components/client/ScheduleCountdownRow";
import { useActiveFastElapsed } from "@/hooks/useActiveFastElapsed";

function dayLabelFor(date: Date, daysAway: number): string {
  if (daysAway === 0) return "today";
  if (daysAway === 1) return "tomorrow";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function useTick(ms = 30_000) {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

function countdownParts(target: Date, now: Date) {
  const ms = Math.max(0, target.getTime() - now.getTime());
  const totalMin = Math.floor(ms / 60000);
  return {
    ms,
    days: Math.floor(totalMin / 1440),
    hours: Math.floor((totalMin % 1440) / 60),
    minutes: totalMin % 60,
    seconds: Math.floor((ms % 60000) / 1000),
  };
}

/**
 * "Runway to your first fast" — a coaching card that fills the wait between
 * finishing onboarding and the fast actually starting. Content changes by how
 * many days out the start is; checked items persist per start-day + phase.
 */
export function PrepRunwayCard() {
  const clientId = useEffectiveClientId();
  const { weekly, overrides, planWindow } = useClientWeeklySchedule(clientId);
  const skippedToday = useFastSkippedToday(clientId);
  const { isFasting } = useActiveFastElapsed();

  // Is an eating window open right now? (used only to pick the card's voice —
  // the countdown target still comes from the schedule so both agree.)
  const { data: windowEndsAt } = useQuery({
    queryKey: ["prep-runway-eating-window", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("eating_window_ends_at")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return data?.eating_window_ends_at ?? null;
    },
  });
  const eatingWindowOpen =
    !isFasting && !!windowEndsAt && new Date(windowEndsAt).getTime() > Date.now();

  // Tick every second inside the final 15 minutes so the MM:SS readout is live.
  useTick(1_000);

  const now = new Date();
  const next = useMemo(
    () => findNextFastStart(weekly, overrides, planWindow, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekly, overrides, planWindow, Math.floor(now.getTime() / 60000)],
  );

  const phase = next
    ? isFasting
      ? ("in_fast" as const)
      : eatingWindowOpen
        ? ("eating_window" as const)
        : runwayPhaseFor(next.daysAway)
    : null;
  const storageKey = next
    ? `apex_prep_${clientId ?? "anon"}_${next.at.toDateString()}_${phase}`
    : "";

  const [checked, setChecked] = useState<string[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      setChecked(JSON.parse(window.localStorage.getItem(storageKey) ?? "[]"));
    } catch {
      setChecked([]);
    }
  }, [storageKey]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const nextVal = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (storageKey && typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(nextVal));
      }
      return nextVal;
    });
  };

  if (!next || !phase) return null;
  if (!isFasting && next.daysAway === 0 && skippedToday) return null;

  const dayLabel = dayLabelFor(next.at, next.daysAway);
  const startTime = formatHour(next.startHour);
  const content = runwayContent(phase, { dayLabel, startTime, daysAway: next.daysAway });
  const { ms, days, hours, minutes, seconds } = countdownParts(next.at, now);
  const finalStretch = ms > 0 && ms <= 15 * 60_000;
  const segments = finalStretch
    ? [
        { v: minutes, l: "min" },
        { v: seconds, l: "sec" },
      ]
    : [
        ...(days > 0 ? [{ v: days, l: "days" }] : []),
        { v: hours, l: "hrs" },
        { v: minutes, l: "min" },
      ];
  const doneCount = content.items.filter((i) => checked.includes(i.id)).length;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
            <CalendarClock className="h-3 w-3" />
            {content.eyebrow}
          </div>
          <h3 className="mt-1 text-base font-bold text-foreground">{content.headline}</h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Collapse" : "Expand"}
          className="rounded-lg border border-white/10 p-1.5 text-muted-foreground"
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Countdown */}
      <div className="mt-3 flex items-end gap-3 rounded-xl border border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.07)] px-3 py-2.5">
        {segments.map((seg) => (
          <div key={seg.l} className="text-center">
            <div className="text-2xl font-bold leading-none tabular-nums text-foreground">
              {String(seg.v).padStart(2, "0")}
            </div>
            <div className="mt-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">{seg.l}</div>
          </div>
        ))}
        <div className="ml-auto text-right text-[11px] leading-tight text-muted-foreground">
          {isFasting ? "Next fast starts" : eatingWindowOpen ? "Window closes" : "Fast starts"}
          <br />
          <span className="font-semibold text-foreground">
            {next.daysAway <= 1 ? dayLabel : next.at.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {startTime}
          </span>
        </div>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">{content.blurb}</p>

      {open && (
        <>
          <div className="mt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <span>
              {isFasting
                ? "When you break it"
                : `Do this ${next.daysAway === 0 ? "before you start" : "today"}`}
            </span>
            <span>
              {doneCount}/{content.items.length}
            </span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {content.items.map((item) => {
              const isDone = checked.includes(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className="flex w-full items-start gap-2.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-left transition-colors hover:bg-black/40"
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border ${
                        isDone
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]"
                          : "border-white/25"
                      }`}
                    >
                      {isDone && <Check className="h-3 w-3 text-primary-foreground" />}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-[13px] font-medium ${
                          isDone ? "text-muted-foreground line-through" : "text-foreground"
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.hint && (
                        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                          {item.hint}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export default PrepRunwayCard;
