import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, ChevronDown, ChevronUp, Pencil, Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useClientWeeklySchedule } from "@/hooks/useClientWeeklySchedule";
import {
  formatHour,
  RATIO_LABEL,
  RATIO_FAST_HOURS,
  RATIO_EAT_HOURS,
} from "@/lib/resolveFastingWindow";
import { findNextFastStart, runwayContent, runwayPhaseFor } from "@/lib/prepRunway";
import { useFastSkippedToday } from "@/components/client/ScheduleCountdownRow";
import { useActiveFastElapsed } from "@/hooks/useActiveFastElapsed";
import { EditTodayScheduleSheet } from "@/components/client/EditTodayScheduleSheet";
import { useStartFast } from "@/hooks/useStartFast";
import { usePrepChecklist } from "@/hooks/usePrepChecklist";
import { AlternateFastOptions } from "@/components/client/AlternateFastOptions";
import lionBg from "@/assets/fasting-timer-bg.png";

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
 * Shared truth for "is an eating window open right now" so the dashboard hero
 * and this card agree on which one hosts the countdown.
 */
export function useEatingWindowOpen(): boolean {
  const clientId = useEffectiveClientId();
  const { isFasting } = useActiveFastElapsed();
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
  return !isFasting && !!windowEndsAt && new Date(windowEndsAt).getTime() > Date.now();
}

/**
 * "Runway to your first fast" — a coaching card that fills the wait between
 * finishing onboarding and the fast actually starting. Content changes by how
 * many days out the start is; checked items persist per start-day + phase.
 */
export function PrepRunwayCard({ embedded = false }: { embedded?: boolean }) {
  const clientId = useEffectiveClientId();
  const { weekly, overrides, planWindow } = useClientWeeklySchedule(clientId);
  const skippedToday = useFastSkippedToday(clientId);
  const { isFasting } = useActiveFastElapsed();

  // Is an eating window open right now? (used only to pick the card's voice —
  // the countdown target still comes from the schedule so both agree.)
  const eatingWindowOpen = useEatingWindowOpen();

  // Tick every second so the countdown reads live down to the second.
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

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const startFast = useStartFast();
  const { checked, toggle } = usePrepChecklist(clientId, storageKey);

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
        ...(days > 0 ? [] : [{ v: hours, l: "hrs" }]),
        ...(days > 0 ? [{ v: hours, l: "hrs" }] : []),
        { v: minutes, l: "min" },
        ...(days > 0 ? [] : [{ v: seconds, l: "sec" }]),
      ];
  const doneCount = content.items.filter((i) => checked.includes(i.id)).length;

  const ratio = next.day.ratio;
  const fastHours = RATIO_FAST_HOURS[ratio];
  const eatHours = RATIO_EAT_HOURS[ratio];
  const breakTime = formatHour(next.breakHour);
  const showStartNow = !isFasting;

  return (
    <div
      className={
        embedded
          ? "relative"
          : "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4"
      }
    >
      {/* Faint lion watermark so this reads as the hero card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-[0.07]"
        style={{ backgroundImage: `url(${lionBg})`, backgroundSize: "150%" }}
      />
      <div className="relative">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
            <CalendarClock className="h-3 w-3" />
            {content.eyebrow}
          </div>
          {!eatingWindowOpen && (
            <h3 className="mt-1 text-base font-bold text-foreground">{content.headline}</h3>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-white/15 bg-black/30 px-2 py-1 text-[10px] font-bold tracking-wide text-foreground">
            {RATIO_LABEL[ratio]} · {fastHours}h
          </span>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            aria-label="Edit today's fasting plan"
            className="flex items-center gap-1 rounded-full border border-white/15 bg-black/30 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--primary))]"
          >
            <Pencil className="h-3 w-3" />
            Edit today's plan
          </button>
        </div>
      </div>

      {/* Countdown */}
      <div className="mt-3 rounded-xl border border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.07)] px-3 py-2.5">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          <span>
            Now{" "}
            <span className="tabular-nums text-foreground">
              {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })}
            </span>
          </span>
          <span className="h-px flex-1 bg-white/10" />
          <span>
            {eatingWindowOpen ? "Closes" : "Starts"}{" "}
            <span className="tabular-nums text-foreground">{startTime}</span>
          </span>
        </div>
        <div className="text-center text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          {eatingWindowOpen ? (
            "Remaining"
          ) : (
            <>
              {isFasting ? "Next fast starts" : "Fast starts"}{" "}
              <span className="text-foreground">
                {next.daysAway <= 1
                  ? dayLabel
                  : next.at.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </>
          )}
        </div>
        <div className="mt-1.5 flex items-end justify-center gap-5">
          {segments.map((seg) => (
            <div key={seg.l} className="text-center">
              <div className="text-3xl font-bold leading-none tabular-nums text-foreground">
                {String(seg.v).padStart(2, "0")}
              </div>
              <div className="mt-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">{seg.l}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">{content.blurb}</p>

      {showStartNow && (
        <button
          type="button"
          disabled={startFast.isPending}
          onClick={() => startFast.mutate(undefined)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          <Play className="h-4 w-4" />
          Start fast now
        </button>
      )}

      {/* Checklist toggle — always visible so the prep list is discoverable */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-left"
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {isFasting
            ? "When you break it"
            : `Do this ${next.daysAway === 0 ? "before you start" : "today"}`}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[11px] font-bold tabular-nums text-foreground">
            {doneCount}/{content.items.length}
          </span>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </span>
      </button>

      {open && (
        <>
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

      {phase === "eating_window" && (
        <div className="mt-3">
          <AlternateFastOptions />
        </div>
      )}
      </div>
      <EditTodayScheduleSheet open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

export default PrepRunwayCard;
