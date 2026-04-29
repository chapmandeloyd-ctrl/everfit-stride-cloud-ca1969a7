import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Droplet, Pencil, ChevronRight, Sparkles } from "lucide-react";

interface SessionTimelineProps {
  clientId: string;
}

interface RawEvent {
  id: string;
  occurred_at: string;
  event_type: string;
  category: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  metadata: any;
  source: string;
  edited: boolean;
}

type SegmentType = "fast" | "eating";

interface Segment {
  id: string;
  type: SegmentType;
  startedAt: Date;
  endedAt: Date | null; // null = ongoing
  endEventType?: string;
  durationMinutes?: number | null;
  events: RawEvent[];
}

interface MealLogRow {
  id: string;
  log_date: string;
  meal_name: string;
  calories: number | null;
  notes: string | null;
  created_at: string;
}

interface WaterRow {
  id: string;
  amount_oz: number;
  logged_at: string;
}

function isSnack(m: MealLogRow): boolean {
  const blob = `${m.notes ?? ""} ${m.meal_name ?? ""}`.toLowerCase();
  if (blob.includes("snack")) return true;
  if (m.calories != null && m.calories > 0 && m.calories < 200) return true;
  return false;
}

function hoursLabel(mins: number | null | undefined): string {
  if (!mins || mins <= 0) return "0";
  const h = mins / 60;
  return (Math.round(h * 10) / 10).toString();
}

function useTicker(active: boolean, intervalMs = 30_000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
}

/**
 * Walk events oldest-first, building alternating fast/eating segments.
 */
function buildSegments(events: RawEvent[], activeFastStartAt: string | null): Segment[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );

  const segments: Segment[] = [];
  let current: Segment | null = null;

  const open = (type: SegmentType, at: Date, sourceId: string) => {
    if (current && current.endedAt === null) {
      current.endedAt = at;
      current.durationMinutes = (at.getTime() - current.startedAt.getTime()) / 60000;
    }
    current = { id: sourceId, type, startedAt: at, endedAt: null, events: [] };
    segments.push(current);
  };

  for (const ev of sorted) {
    const at = new Date(ev.occurred_at);
    switch (ev.event_type) {
      case "fast_started":
        open("fast", at, ev.id);
        break;
      case "fast_completed":
      case "fast_ended_early":
      case "session_ended_early":
        if (current && current.type === "fast" && current.endedAt === null) {
          current.endedAt = at;
          current.endEventType = ev.event_type;
          current.durationMinutes =
            ev.metadata?.duration_minutes ??
            (at.getTime() - current.startedAt.getTime()) / 60000;
          open("eating", at, `eating-${ev.id}`);
        } else if (current) {
          current.events.push(ev);
        }
        break;
      case "eating_window_opened":
        if (!current || current.type !== "eating" || current.endedAt !== null) {
          open("eating", at, ev.id);
        }
        break;
      case "eating_window_closed":
        if (current && current.type === "eating" && current.endedAt === null) {
          current.endedAt = at;
          current.durationMinutes = (at.getTime() - current.startedAt.getTime()) / 60000;
        }
        break;
      default:
        if (current) current.events.push(ev);
        break;
    }
  }

  if (activeFastStartAt) {
    const startMs = new Date(activeFastStartAt).getTime();
    const last = segments[segments.length - 1];
    if (
      !last ||
      last.type !== "fast" ||
      last.endedAt !== null ||
      Math.abs(last.startedAt.getTime() - startMs) > 60_000
    ) {
      segments.push({
        id: `live-fast-${activeFastStartAt}`,
        type: "fast",
        startedAt: new Date(activeFastStartAt),
        endedAt: null,
        events: [],
      });
    }
  }

  return segments.reverse(); // newest first
}

/** Group meal_logs that fall inside a date range, by calendar day. */
function mealsByDay(meals: MealLogRow[], from: Date, to: Date) {
  const map = new Map<string, MealLogRow[]>();
  for (const m of meals) {
    const t = new Date(m.created_at).getTime();
    if (t < from.getTime() || t > to.getTime()) continue;
    const key = format(new Date(m.created_at), "yyyy-MM-dd");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return Array.from(map.entries())
    .map(([day, items]) => ({
      day,
      date: new Date(items[0].created_at),
      items: items.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

function waterTotal(water: WaterRow[], from: Date, to: Date): number {
  return water.reduce((sum, w) => {
    const t = new Date(w.logged_at).getTime();
    if (t < from.getTime() || t > to.getTime()) return sum;
    return sum + Number(w.amount_oz || 0);
  }, 0);
}

/* ──────────── Sub-components ──────────── */

function MealDayCard({
  date,
  meals,
}: {
  date: Date;
  meals: MealLogRow[];
}) {
  const snacks = meals.filter(isSnack);
  const realMeals = meals.filter((m) => !isSnack(m));

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
      {/* header row: timestamp + edit */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {format(date, "MMM d 'at' h:mm a")}
        </span>
        <button
          type="button"
          className="h-6 w-6 rounded-md flex items-center justify-center text-accent hover:bg-accent/10 transition-colors"
          aria-label="Edit log"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* food emoji circle */}
      <div className="flex items-center gap-2 mb-2">
        <div className="h-9 w-9 rounded-full bg-emerald-500/15 flex items-center justify-center text-base">
          🥕
        </div>
      </div>

      {/* chips */}
      <div className="flex flex-wrap gap-1.5">
        {realMeals.length > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-muted text-foreground text-[11px] font-medium">
            {realMeals.length} {realMeals.length === 1 ? "meal" : "meals"}
          </span>
        )}
        {snacks.length > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-muted text-foreground text-[11px] font-medium">
            {snacks.length} {snacks.length === 1 ? "snack" : "snacks"}
          </span>
        )}
        {realMeals.length === 0 && snacks.length === 0 && (
          <span className="px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground text-[11px]">
            no items
          </span>
        )}
      </div>
    </div>
  );
}

function FastSessionCard({
  segment,
  meals,
  water,
  isLive,
}: {
  segment: Segment;
  meals: MealLogRow[];
  water: WaterRow[];
  isLive: boolean;
}) {
  useTicker(isLive);

  const liveMins = isLive
    ? (Date.now() - segment.startedAt.getTime()) / 60000
    : segment.durationMinutes ?? 0;
  const hours = hoursLabel(liveMins);
  const endDate = segment.endedAt ?? new Date();

  const dayGroups = mealsByDay(meals, segment.startedAt, endDate);
  const totalWater = Math.round(waterTotal(water, segment.startedAt, endDate));

  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 p-4 bg-card/40",
        isLive ? "border-primary shadow-[0_0_24px_-8px_hsl(var(--primary)/0.6)]" : "border-border",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-foreground leading-tight">
            {hours} hour {segment.type === "fast" ? "fast" : "eating window"}
            {isLive && <span className="ml-2 text-[10px] font-bold text-primary tracking-wider">LIVE</span>}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            from {format(segment.startedAt, "h:mm a, MMM d")}
            <br />
            to {segment.endedAt ? format(segment.endedAt, "h:mm a, MMM d") : "now"}
          </p>
        </div>
        <button
          type="button"
          className="h-7 w-7 rounded-lg bg-muted/40 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="View details"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Water summary pill */}
      {totalWater > 0 && (
        <div className="rounded-xl border border-dashed border-border/60 bg-background/30 px-3 py-2.5 flex items-center gap-2 mb-3">
          <Droplet className="h-4 w-4 text-sky-400" />
          <span className="text-sm font-semibold text-foreground">
            {totalWater}fl oz of water
          </span>
        </div>
      )}

      {/* Per-day meal sub-cards */}
      {dayGroups.length > 0 && (
        <div className="space-y-2">
          {dayGroups.map((g) => (
            <MealDayCard key={g.day} date={g.date} meals={g.items} />
          ))}
        </div>
      )}

      {dayGroups.length === 0 && totalWater === 0 && !isLive && (
        <p className="text-[11px] text-muted-foreground italic">
          No meals or water logged in this window.
        </p>
      )}
    </div>
  );
}

function LiveStatusInline({ activeFastStartAt }: { activeFastStartAt: string | null }) {
  useTicker(true);
  if (activeFastStartAt) {
    const elapsed = formatDistanceToNowStrict(new Date(activeFastStartAt));
    return (
      <div>
        <h3 className="text-lg font-bold text-foreground">Currently fasting..</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          since {format(new Date(activeFastStartAt), "h:mm a 'on' MMMM d")}
        </p>
        <p className="text-xs text-muted-foreground">{elapsed} elapsed</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-lg font-bold text-foreground">Currently eating..</h3>
      <p className="text-xs text-muted-foreground mt-0.5">
        Log meals as you eat to fill in this window.
      </p>
    </div>
  );
}

function JourneyFooter({
  firstFastDate,
  totalEatingWindows,
  totalFastedHours,
}: {
  firstFastDate: Date | null;
  totalEatingWindows: number;
  totalFastedHours: number;
}) {
  if (!firstFastDate) return null;
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-6 text-center">
      <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <p className="text-sm font-semibold text-foreground leading-snug">
        Your intermittent fasting journey began on {format(firstFastDate, "MMMM d")}.
      </p>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
        Since then, you've logged {totalEatingWindows} eating{" "}
        {totalEatingWindows === 1 ? "window" : "windows"} and fasted for{" "}
        {Math.round(totalFastedHours * 10) / 10} hours. Keep it up!
      </p>
    </div>
  );
}

/* ──────────── Main ──────────── */

export function SessionTimeline({ clientId }: SessionTimelineProps) {
  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["session-timeline-events", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_events")
        .select("*")
        .eq("client_id", clientId)
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as RawEvent[];
    },
    refetchInterval: 60_000,
  });

  const { data: activeFastStartAt = null } = useQuery({
    queryKey: ["active-fast-start", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("active_fast_start_at")
        .eq("client_id", clientId)
        .maybeSingle();
      return (data as any)?.active_fast_start_at ?? null;
    },
    refetchInterval: 60_000,
  });

  const { data: meals = [] } = useQuery({
    queryKey: ["session-timeline-meals", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("id, log_date, meal_name, calories, notes, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as MealLogRow[];
    },
  });

  const { data: water = [] } = useQuery({
    queryKey: ["session-timeline-water", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("water_log_entries")
        .select("id, amount_oz, logged_at")
        .eq("client_id", clientId)
        .order("logged_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as WaterRow[];
    },
  });

  const segments = useMemo(
    () => buildSegments(events, activeFastStartAt),
    [events, activeFastStartAt],
  );

  // Stats for footer
  const fastSegments = segments.filter((s) => s.type === "fast");
  const eatingSegments = segments.filter((s) => s.type === "eating");
  const totalFastedHours = fastSegments.reduce(
    (sum, s) => sum + (s.durationMinutes ?? 0) / 60,
    0,
  );
  const firstFastDate =
    [...segments].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())[0]?.startedAt ??
    null;

  if (loadingEvents) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  // Render: gutter (date) + rail + cards
  return (
    <div className="relative">
      {/* Live status (inline, no card) */}
      <div className="flex gap-3 mb-5">
        <DateGutter date={new Date()} />
        <div className="flex-1 min-w-0 relative pl-4">
          <Rail accent="muted" />
          <LiveStatusInline activeFastStartAt={activeFastStartAt} />
        </div>
      </div>

      {/* Segments — render fast segments as containers */}
      <div className="space-y-5">
        {fastSegments.map((seg, idx) => {
          const isLive = seg.endedAt === null;
          // Find the eating window AFTER this fast (chronologically). segments are newest-first.
          // The eating window that follows a fast in time is the one immediately *before* it in the array.
          const eatingAfter =
            idx > 0 && eatingSegments.find((e) => e.startedAt.getTime() === seg.endedAt?.getTime());

          return (
            <div key={seg.id} className="flex gap-3">
              <DateGutter date={seg.startedAt} />
              <div className="flex-1 min-w-0 relative pl-4">
                <Rail accent={isLive ? "primary" : "muted"} bracket={isLive} />
                <FastSessionCard
                  segment={seg}
                  meals={meals}
                  water={water}
                  isLive={isLive}
                />
                {eatingAfter && (
                  <div className="mt-3 ml-1">
                    <h4 className="text-base font-bold text-foreground">
                      {hoursLabel(eatingAfter.durationMinutes)} hour eating window
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                      {format(eatingAfter.startedAt, "HH:mm")} –{" "}
                      {eatingAfter.endedAt ? format(eatingAfter.endedAt, "HH:mm") : "now"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {fastSegments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-foreground">No fasting sessions yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Start a fast and your timeline will fill in here.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3">
          <div className="w-14 shrink-0" />
          <div className="flex-1 min-w-0 relative pl-4">
            <Rail accent="muted" />
            <JourneyFooter
              firstFastDate={firstFastDate}
              totalEatingWindows={eatingSegments.length}
              totalFastedHours={totalFastedHours}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────── Gutter + Rail ──────────── */

function DateGutter({ date }: { date: Date }) {
  return (
    <div className="w-14 shrink-0 pt-3 text-right pr-1">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground leading-none">
        {format(date, "MMM")}
      </p>
      <p className="text-2xl font-extrabold text-foreground tabular-nums leading-none mt-1">
        {format(date, "d")}
      </p>
    </div>
  );
}

function Rail({
  accent,
  bracket = false,
}: {
  accent: "primary" | "muted";
  bracket?: boolean;
}) {
  return (
    <>
      {/* base rail */}
      <span
        className={cn(
          "absolute left-0 top-0 bottom-0 w-px",
          accent === "primary" ? "bg-primary" : "bg-border",
        )}
      />
      {bracket && (
        <>
          {/* thicker bracket overlay */}
          <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary" />
          {/* top + bottom caps */}
          <span className="absolute left-0 top-2 h-[3px] w-3 rounded-full bg-primary" />
          <span className="absolute left-0 bottom-2 h-[3px] w-3 rounded-full bg-primary" />
        </>
      )}
    </>
  );
}
