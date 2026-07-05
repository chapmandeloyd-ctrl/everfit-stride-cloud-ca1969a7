import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, X, Utensils, Clock, Flame, Info, CalendarDays, Check, AlertTriangle, Lock, Trophy } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ComputedPlan, PlanDay } from "@/lib/protocolPlan";
import { StartFastGate } from "@/components/client/StartFastGate";
import { useStartFast } from "@/hooks/useStartFast";
import confetti from "canvas-confetti";
import { PlanCompletionSummary } from "@/components/client/PlanCompletionSummary";

type DayState = "eat" | "fast" | "refeed" | "lowcal";
const STATE_COLOR: Record<DayState, string> = {
  eat: "#22c55e",
  fast: "#ef4444",
  refeed: "#3b82f6",
  lowcal: "#eab308",
};
const STATE_LABEL: Record<DayState, string> = {
  eat: "Eat",
  fast: "Fast",
  refeed: "Refeed",
  lowcal: "Low-cal",
};

function dayState(d: PlanDay): DayState {
  if (d.isRefeed) return "refeed";
  if (d.adFast) return "fast";
  if (typeof d.fastWindow === "string" && d.fastWindow.toLowerCase().startsWith("low-cal")) return "lowcal";
  return "eat";
}
function shortDayLabel(d: PlanDay, s: DayState): string {
  if (s === "refeed") return "Refeed";
  if (s === "fast") {
    const m = /(\d+)\s*h/i.exec(d.fastWindow || "");
    return m ? `${m[1]}h` : "Fast";
  }
  if (s === "lowcal") return "Low-cal";
  const m = /^(\d+):(\d+)/.exec(d.fastWindow || "");
  return m ? `${m[1]}:${m[2]}` : "Eat";
}

function startOfMonthGrid(anchor: Date): Date {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const wd = first.getDay(); // 0 = Sun
  const d = new Date(first);
  d.setDate(first.getDate() - wd);
  return d;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function daysBetween(a: Date, b: Date) {
  const ms = 24 * 3600 * 1000;
  const ax = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bx = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((bx - ax) / ms);
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function parseDateOnlyLocal(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return new Date(value);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  plan: ComputedPlan;
  todayIndex: number;
  accent: string;
  protocolName?: string;
  ketoName?: string;
  onStartFast?: () => void;
  protocolStartDate?: string | null;
  assignedDurationDays?: number | null;
  runMode?: "one_time" | "recurring";
  fastingLogs?: Array<{
    started_at: string;
    ended_at: string;
    target_hours: number;
    actual_hours: number;
    completion_pct: number;
    status: string;
  }>;
  clientName?: string;
}

type HistoryStatus = "completed" | "partial" | "missed" | null;

/** Phase 1: Live Schedule — Month view + tap-to-detail day sheet. */
export function LiveScheduleDialog({
  open, onOpenChange, plan, todayIndex, accent, protocolName, ketoName, onStartFast,
  protocolStartDate, assignedDurationDays, runMode = "one_time", fastingLogs, clientName,
}: Props) {
  const isMobile = useIsMobile();
  const startFast = useStartFast();
  const handleStart = onStartFast ?? (() => startFast.mutate());
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const startDate = useMemo(() => {
    if (protocolStartDate) return startOfDay(parseDateOnlyLocal(protocolStartDate));
    // Safety fallback: if an assignment has a duration but the saved start date
    // is missing, treat today as Day 1 instead of rendering the whole calendar active.
    return assignedDurationDays ? startOfDay(today) : null;
  }, [protocolStartDate, assignedDurationDays, today]);
  const endDate = useMemo(() => {
    // Recurring plans never "end" — they cycle weekly forever.
    if (!startDate || !assignedDurationDays || runMode === "recurring") return null;
    const e = new Date(startDate);
    e.setDate(e.getDate() + assignedDurationDays - 1);
    return e;
  }, [startDate, assignedDurationDays, runMode]);
  const dayInProtocol = startDate ? Math.max(1, daysBetween(startDate, today) + 1) : null;
  const isComplete = endDate ? startOfDay(today) > endDate : false;

  const logsByDay = useMemo(() => {
    const map = new Map<string, { actual: number; target: number; pct: number; status: string }>();
    for (const log of fastingLogs || []) {
      const key = dateKey(new Date(log.ended_at));
      const prev = map.get(key);
      if (!prev || Number(log.completion_pct) > prev.pct) {
        map.set(key, {
          actual: Number(log.actual_hours),
          target: Number(log.target_hours),
          pct: Number(log.completion_pct),
          status: log.status,
        });
      }
    }
    return map;
  }, [fastingLogs]);

  const cells = useMemo(() => {
    const start = startOfMonthGrid(cursor);
    return Array.from({ length: 42 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const len = plan.days.length;
  const dayFor = (d: Date): { plan: PlanDay; idx: number } => {
    const delta = daysBetween(today, d);
    const idx = ((todayIndex + delta) % len + len) % len;
    return { plan: plan.days[idx], idx };
  };

  const fastDayIndexes = useMemo(() => {
    if (!startDate || !assignedDurationDays) return [] as number[];
    const out: number[] = [];
    for (let i = 0; i < assignedDurationDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const { plan: pd } = dayFor(d);
      const st = dayState(pd);
      if (st === "fast" || st === "refeed") out.push(i);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, assignedDurationDays, todayIndex, len]);

  const categorize = (d: Date): {
    inWindow: boolean; beforeStart: boolean; afterEnd: boolean; offRecurring: boolean; history: HistoryStatus;
  } => {
    const day = startOfDay(d);
    const beforeStart = startDate ? day < startDate : false;
    const afterEnd = endDate ? day > endDate : false;
    // Recurring mode: only the first `assignedDurationDays` weekdays of each
    // week (counted from the start date) count as active. The rest are "off".
    const offRecurringDay =
      runMode === "recurring" && startDate && assignedDurationDays
        ? (((daysBetween(startDate, day) % 7) + 7) % 7) >= assignedDurationDays
        : false;
    const inWindow = !beforeStart && !afterEnd && !offRecurringDay;
    const isPast = day < startOfDay(today);
    let history: HistoryStatus = null;
    if (inWindow && isPast) {
      const { plan: pd } = dayFor(d);
      const st = dayState(pd);
      if (st === "fast" || st === "refeed") {
        const log = logsByDay.get(dateKey(d));
        if (!log) history = "missed";
        else if (log.pct >= 100) history = "completed";
        else history = "partial";
      }
    }
    return {
      inWindow,
      beforeStart,
      // Treat weekly off-days as "afterEnd" for rendering purposes (greyed + lock/dash).
      afterEnd: afterEnd || offRecurringDay,
      offRecurring: offRecurringDay && !beforeStart && !afterEnd,
      history,
    };
  };

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const monthNav = (dir: -1 | 1) => {
    const c = new Date(cursor);
    c.setMonth(c.getMonth() + dir);
    setCursor(c);
  };

  const selected = selectedDate
    ? { date: selectedDate, ...dayFor(selectedDate), meta: categorize(selectedDate) }
    : null;

  const firedRef = useRef(false);
  useEffect(() => {
    if (!open || !isComplete || firedRef.current) return;
    firedRef.current = true;
    const end = Date.now() + 1200;
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors: [accent, "#ffffff"] });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors: [accent, "#ffffff"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [open, isComplete, accent]);

  const body = (
    <div className="space-y-4">
      {startDate && assignedDurationDays && (
        isComplete ? (
          <PlanCompletionSummary
            accent={accent}
            protocolName={protocolName}
            ketoName={ketoName}
            startDate={startDate}
            durationDays={assignedDurationDays}
            fastingLogs={fastingLogs}
            fastDayIndexes={fastDayIndexes}
            clientName={clientName}
          />
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
            <p className="text-xs font-semibold whitespace-nowrap">
              Day <span style={{ color: accent }}>{Math.min(dayInProtocol!, assignedDurationDays)}</span> of {assignedDurationDays}
            </p>
            <div className="h-1.5 flex-1 mx-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (dayInProtocol! / assignedDurationDays) * 100)}%`,
                  background: accent,
                }} />
            </div>
            <p className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
              {Math.max(0, assignedDurationDays - dayInProtocol!)}d left
            </p>
          </div>
        )
      )}

      {/* Header row: month nav */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => monthNav(-1)}
          className="h-8 w-8 rounded-full border border-border/60 flex items-center justify-center hover:bg-muted/40"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" style={{ color: accent }} />
          <p className="text-sm font-bold">{monthLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => monthNav(1)}
          className="h-8 w-8 rounded-full border border-border/60 flex items-center justify-center hover:bg-muted/40"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold text-center">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const { plan: pd } = dayFor(d);
          const st = dayState(pd);
          const color = STATE_COLOR[st];
          const isToday = isSameDay(d, today);
          const isPast = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const isSel = selectedDate ? isSameDay(d, selectedDate) : false;
          const meta = categorize(d);
          const outOfWindow = meta.beforeStart || meta.afterEnd;
          const historyColor =
            meta.history === "completed" ? "#22c55e" :
            meta.history === "partial" ? "#f59e0b" :
            meta.history === "missed" ? "#ef4444" : null;
          const cellLabel = outOfWindow
            ? (meta.beforeStart ? "Before start" : meta.offRecurring ? "Off" : "Done")
            : STATE_LABEL[st];
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedDate(d)}
              className="relative aspect-square rounded-md border text-left p-1 transition-all min-w-0"
              style={{
                borderColor: isToday || isSel ? accent : "hsl(var(--border) / 0.5)",
                background: meta.history === "missed"
                  ? "rgba(239, 68, 68, 0.10)"
                  : outOfWindow
                    ? "hsl(var(--muted) / 0.08)"
                    : isToday ? `${accent}18` : isSel ? `${accent}10` : "hsl(var(--muted) / 0.15)",
                opacity: !inMonth ? 0.3 : outOfWindow ? 0.55 : 1,
                boxShadow: isToday ? `0 0 0 1px ${accent}66, 0 0 10px ${accent}33` : undefined,
              }}
              aria-label={`${d.toDateString()} — ${cellLabel}`}
            >
              {outOfWindow ? (
                <Lock className="absolute top-1 right-1 h-2.5 w-2.5 text-muted-foreground" />
              ) : historyColor ? (
                meta.history === "completed" ? (
                  <Check className="absolute top-0.5 right-0.5 h-3 w-3" style={{ color: historyColor }} />
                ) : meta.history === "missed" ? (
                  <X className="absolute top-0.5 right-0.5 h-3 w-3" style={{ color: historyColor }} />
                ) : (
                  <AlertTriangle className="absolute top-0.5 right-0.5 h-2.5 w-2.5" style={{ color: historyColor }} />
                )
              ) : (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full"
                  style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
              )}
              <p
                className="text-[11px] font-bold leading-none tabular-nums"
                style={{ color: isToday ? accent : undefined }}
              >
                {d.getDate()}
              </p>
              <p className="text-[8px] uppercase tracking-wider mt-1 truncate"
                style={{
                  color: meta.history === "missed" ? "#ef4444"
                    : outOfWindow || isPast ? "hsl(var(--muted-foreground))" : undefined
                }}>
                {outOfWindow
                  ? (meta.beforeStart ? "—" : meta.offRecurring ? "Off" : "Done")
                  : meta.history === "missed" ? "Missed"
                  : shortDayLabel(pd, st)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
        {(["eat", "lowcal", "fast", "refeed"] as DayState[]).map((s) => (
          <div key={s} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: STATE_COLOR[s], boxShadow: `0 0 4px ${STATE_COLOR[s]}66` }}
            />
            {STATE_LABEL[s]}
          </div>
        ))}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Check className="h-2.5 w-2.5 text-emerald-500" /> Completed
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <AlertTriangle className="h-2.5 w-2.5 text-amber-500" /> Partial
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <X className="h-2.5 w-2.5 text-red-500" /> Missed
        </div>
        <span className="text-[10px] text-muted-foreground ml-auto">Tap any day for details</span>
      </div>

      {/* Day detail panel (inline on desktop, sheet-style on mobile) */}
      {selected && (
        <DayDetail
          date={selected.date}
          day={selected.plan}
          today={today}
          accent={accent}
          onClose={() => setSelectedDate(null)}
          onStartFast={handleStart}
          meta={selected.meta}
          log={logsByDay.get(dateKey(selected.date))}
        />
      )}
    </div>
  );

  const title = "Live Schedule";
  const subtitle = [protocolName, ketoName].filter(Boolean).join(" · ");

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95vh] flex flex-col p-0 gap-0 rounded-t-2xl">
          <SheetHeader className="px-4 pt-5 pb-3 border-b border-border text-left">
            <SheetTitle className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
              {title}
            </SheetTitle>
            {subtitle && <SheetDescription>{subtitle}</SheetDescription>}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">{body}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
            {title}
          </DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}

function DayDetail({
  date, day, today, accent, onClose, onStartFast, meta, log,
}: {
  date: Date; day: PlanDay; today: Date; accent: string;
  onClose: () => void; onStartFast?: () => void;
  meta: { inWindow: boolean; beforeStart: boolean; afterEnd: boolean; offRecurring?: boolean; history: HistoryStatus };
  log?: { actual: number; target: number; pct: number; status: string };
}) {
  const st = dayState(day);
  const isToday = isSameDay(date, today);
  const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isFuture = !isToday && !isPast;
  const dateLabel = date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const outOfWindow = meta.beforeStart || meta.afterEnd;

  return (
    <div
      className="rounded-xl border p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2"
      style={{ borderColor: `${accent}55`, background: `${accent}0A` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: accent }}>
            {meta.beforeStart ? "Before start" : meta.afterEnd ? "After plan" : isToday ? "Today" : isPast ? "Past" : "Upcoming"}
          </p>
          <p className="text-base font-bold">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {meta.history === "missed" ? (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-red-500 text-red-500">Missed</Badge>
          ) : meta.history === "completed" ? (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-emerald-500 text-emerald-500">Completed</Badge>
          ) : meta.history === "partial" ? (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-amber-500 text-amber-500">Partial</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5"
              style={{ borderColor: STATE_COLOR[st], color: STATE_COLOR[st] }}>
              {STATE_LABEL[st]}
            </Badge>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-6 w-6 rounded-full hover:bg-muted/40 flex items-center justify-center"
            aria-label="Close day detail"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {st === "fast" ? (
        <div className="rounded-lg border border-border/60 p-3 bg-background/40">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">{day.fastWindow}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Water + electrolytes. No calories.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <MiniTile icon={<Utensils className="h-3.5 w-3.5" />} label="Break fast" value={day.eatStart || "—"} />
            <MiniTile icon={<Clock className="h-3.5 w-3.5" />} label="Last meal by" value={day.eatEnd || "—"} />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <MacroTile label="Cal" value={String(day.cal)} accent />
            <MacroTile label="Protein" value={`${day.proteinG}g`} />
            <MacroTile label="Carbs" value={`${day.carbG}g`} />
            <MacroTile label="Fat" value={`${day.fatG}g`} />
          </div>
        </>
      )}

      {day.isRefeed && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 p-2">
          <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-foreground/80 leading-snug">
            Refeed day — prioritize clean carbs & lean protein. Avoid sugar and seed oils.
          </p>
        </div>
      )}

      {isPast && log && (
        <div className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Your log</p>
          <p className="text-sm font-bold tabular-nums">
            {log.actual.toFixed(1)}h <span className="text-muted-foreground font-normal">/ {log.target.toFixed(1)}h target</span>
          </p>
          <p className="text-[11px] text-muted-foreground">{log.pct.toFixed(0)}% of target</p>
        </div>
      )}
      {isPast && !log && meta.history === "missed" && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-2">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-foreground/80 leading-snug">
            No fast was logged for this day. Only your coach can adjust this.
          </p>
        </div>
      )}

      {/* Start Fast lives here — only on today, within the window */}
      {isToday && !outOfWindow && onStartFast && (
        <div className="pt-1">
          <StartFastGate onStart={onStartFast} />
        </div>
      )}

      {isFuture && !outOfWindow && (
        <p className="text-[11px] text-muted-foreground">
          You'll be able to start this day's fast when the time arrives.
        </p>
      )}
      {isPast && !meta.history && (
        <p className="text-[11px] text-muted-foreground">
          Past day — read-only history.
        </p>
      )}
      {meta.beforeStart && (
        <p className="text-[11px] text-muted-foreground">Your plan hasn't started yet.</p>
      )}
      {meta.afterEnd && (
        <p className="text-[11px] text-muted-foreground">
          Your assigned plan is complete. Check in with your coach for what's next.
        </p>
      )}
    </div>
  );
}

function MiniTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-2.5 bg-background/40 min-w-0">
      <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
        <span className="shrink-0">{icon}</span>
        <p className="text-[10px] uppercase tracking-wider font-medium truncate">{label}</p>
      </div>
      <p className="text-sm font-bold mt-1 tabular-nums truncate">{value}</p>
    </div>
  );
}

function MacroTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-md border p-1.5 text-center ${accent ? "border-primary/30 bg-primary/5" : "border-border/60 bg-background/40"}`}>
      <p className="text-sm font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
    </div>
  );
}