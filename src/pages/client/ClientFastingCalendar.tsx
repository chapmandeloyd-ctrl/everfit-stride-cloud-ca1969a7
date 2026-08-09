import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles, LifeBuoy, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useClientWeeklySchedule } from "@/hooks/useClientWeeklySchedule";
import { useSmartPace } from "@/hooks/useSmartPace";
import { resolveDayState } from "@/lib/resolveFastingWindow";
import { toast } from "@/hooks/use-toast";
import DayEditorSheet, { type ApplyScope } from "@/components/client/calendar/DayEditorSheet";
import LifeHappensSheet from "@/components/client/calendar/LifeHappensSheet";
import {
  addDays,
  dateKey,
  stateHeadline,
  defaultWeek,
  monthGrid,
  startOfWeek,
  computeEnd,
  type WeeklyScheduleDay,
} from "@/components/client/calendar/calendarUtils";

type View = "month" | "week" | "day";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

export default function ClientFastingCalendar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = useEffectiveClientId();
  const { weekly, overrides, planWindow, saveWeekly, saveOverride } = useClientWeeklySchedule(clientId);
  const { data: pace } = useSmartPace();

  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [lifeOpen, setLifeOpen] = useState(false);

  // Deep link: /client/calendar?date=YYYY-MM-DD opens that day's editor
  useEffect(() => {
    const raw = searchParams.get("date");
    if (!raw) return;
    const [y, m, d] = raw.split("-").map(Number);
    if (!y || !m || !d) return;
    const target = new Date(y, m - 1, d);
    setAnchor(target);
    setSelected(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Only the days the client actually saved. Missing days stay missing so the
  // calendar can render "—" instead of an invented 8 PM fast.
  const savedWeek = weekly ?? [];
  const week = savedWeek.length === 7
    ? savedWeek
    : defaultWeek().map((d) => savedWeek.find((s) => s.day_of_week === d.day_of_week) ?? d);
  const saving = saveWeekly.isPending || saveOverride.isPending;

  const resolve = (d: Date) => resolveDayState(savedWeek, overrides, d, planWindow);

  const grid = useMemo(() => monthGrid(anchor), [anchor]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i)),
    [anchor],
  );

  const shift = (n: number) => {
    if (view === "month") {
      setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + n, 1));
    } else if (view === "week") {
      setAnchor(addDays(anchor, n * 7));
    } else {
      setAnchor(addDays(anchor, n));
    }
  };

  const handleSaveDay = async (day: WeeklyScheduleDay, scope: ApplyScope) => {
    if (!selected) return;
    try {
      if (scope === "day") {
        const key = dateKey(selected);
        const existing = (overrides ?? []).find(
          (o) => o.start_date === key && o.end_date === key,
        );
        const schedule = week.map((d) =>
          d.day_of_week === selected.getDay() ? { ...day } : d,
        );
        await saveOverride.mutateAsync({
          ...(existing?.id ? { id: existing.id } : {}),
          label: "Day edit",
          start_date: key,
          end_date: key,
          schedule,
          active: true,
        } as any);
      } else {
        const target = (dow: number) =>
          scope === "week" ||
          (scope === "weekdays" && dow >= 1 && dow <= 5) ||
          (scope === "weekends" && (dow === 0 || dow === 6));
        const next = week.map((d) =>
          target(d.day_of_week) ? { ...day, day_of_week: d.day_of_week } : d,
        );
        await saveWeekly.mutateAsync(next);
      }
      toast({ title: "Schedule updated" });
      setSelected(null);
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e.message, variant: "destructive" });
    }
  };

  const handleLife = async ({
    mode,
    start,
    end,
    label,
  }: {
    mode: "pause" | "travel";
    start: string;
    end: string;
    label: string;
  }) => {
    try {
      const schedule = week.map((d) =>
        mode === "pause"
          ? { ...d, enabled: false }
          : {
              ...d,
              enabled: true,
              ratio: "16:8" as const,
              window_start_time: "20:00:00",
              window_end_time: computeEnd("16:8", "20:00:00"),
            },
      );
      await saveOverride.mutateAsync({
        label,
        start_date: start,
        end_date: end,
        schedule,
        active: true,
      } as any);
      toast({ title: mode === "pause" ? "Plan paused" : "Travel mode on" });
      setLifeOpen(false);
    } catch (e: any) {
      toast({ title: "Couldn't apply", description: e.message, variant: "destructive" });
    }
  };

  const dotClass = (d: Date) => {
    const r = resolve(d);
    if (r.state !== "scheduled" || !r.day) return "bg-muted-foreground/30";
    if (r.adjusted) return "bg-amber-400";
    if (r.day.ratio === "eat_all_day") return "bg-emerald-400";
    return "bg-primary";
  };

  const todayKey = dateKey(new Date());

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/client/dashboard")} aria-label="Back">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold">My Fasting Calendar</h1>
            <p className="truncate text-[11px] text-muted-foreground">
              You're in control — tap any day to change it.
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-muted/30 p-1">
          {(["month", "week", "day"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg py-2 text-xs font-semibold capitalize ${
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button onClick={() => shift(-1)} aria-label="Previous" className="p-2">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="text-sm font-semibold">
            {view === "day"
              ? anchor.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
              : anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </div>
          <button onClick={() => shift(1)} aria-label="Next" className="p-2">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="px-4 pt-4">
        {view === "month" && (
          <div>
            <div className="mb-1 grid grid-cols-7 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
              {DOW.map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {grid.map((d) => {
                const inMonth = d.getMonth() === anchor.getMonth();
                const isToday = dateKey(d) === todayKey;
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => setSelected(d)}
                    className={`flex aspect-square flex-col items-center justify-center rounded-xl border text-sm ${
                      isToday ? "border-primary" : "border-border/50"
                    } ${inMonth ? "bg-muted/20" : "opacity-35"}`}
                  >
                    <span className={inMonth ? "font-semibold" : ""}>{d.getDate()}</span>
                    <span className={`mt-1 h-1.5 w-1.5 rounded-full ${dotClass(d)}`} />
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-primary" /> Fasting</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-400" /> Eat all day</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-amber-400" /> Adjusted</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Rest</span>
            </div>
          </div>
        )}

        {view === "week" && (
          <div className="space-y-2">
            {weekDays.map((d) => (
              <button
                key={d.toISOString()}
                onClick={() => setSelected(d)}
                className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-left"
              >
                <div>
                  <div className="text-sm font-semibold">
                    {d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {(() => { const r = resolve(d); return stateHeadline(r.state, r.day); })()}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {view === "day" && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Plan</div>
              <div className="mt-1 text-lg font-bold">
                {(() => { const r = resolve(anchor); return stateHeadline(r.state, r.day); })()}
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => setSelected(anchor)}
              className="h-14 w-full rounded-2xl text-base font-semibold"
            >
              Edit this day
            </Button>
          </div>
        )}

        {pace?.goal && (
          <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="text-[11px] uppercase tracking-wider text-primary">Smart Pace impact</div>
            <div className="mt-1 text-sm text-foreground">
              {pace.projectedDate
                ? `On this schedule you land on ${pace.projectedDate.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}.`
                : "Keep logging weigh-ins to see your projected date."}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{pace.reason}</div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-border/60 bg-muted/20 p-4">
          <div className="text-sm font-bold">Don't want to build it yourself?</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Let APEXBEAST AI design your full week around your goal, or ask your coach to set it up for you.
            You can still change any day, any time.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/client/onboarding")}
            className="mt-3 h-12 w-full rounded-2xl text-sm font-semibold"
          >
            <Sparkles className="mr-2 h-4 w-4" /> Let APEXBEAST AI build my plan
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/client/messages")}
            className="mt-1 h-10 w-full rounded-2xl text-xs font-semibold text-muted-foreground"
          >
            Ask my coach to build it
          </Button>
        </div>

        <div className="mt-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("/client/plan-builder")}
            className="h-14 w-full rounded-2xl text-sm font-semibold"
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" /> Build or reset my full plan
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            This rebuilds the full weekly pattern. For one-day tweaks, tap any day above.
          </p>
        </div>

        <div className="mt-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setLifeOpen(true)}
            className="h-14 w-full rounded-2xl text-sm font-semibold"
          >
            <LifeBuoy className="mr-2 h-4 w-4" /> Life happens
          </Button>
        </div>
      </main>

      <DayEditorSheet
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        date={selected}
        day={selected ? resolve(selected).day : null}
        saving={saving}
        onSave={handleSaveDay}
      />
      <LifeHappensSheet
        open={lifeOpen}
        onOpenChange={setLifeOpen}
        saving={saving}
        onApply={handleLife}
      />
    </div>
  );
}