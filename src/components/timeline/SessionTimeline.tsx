import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, formatDistanceToNowStrict } from "date-fns";
import { Flame, Utensils, Dumbbell, Award, Scale, Edit3, Pencil, type LucideIcon } from "lucide-react";
import { getEventVisual } from "./eventConfig";

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
  endEventType?: string; // fast_completed | fast_ended_early | session_ended_early
  durationMinutes?: number | null;
  events: RawEvent[];
}

function formatDayHeader(date: Date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE, MMM d");
}

function fmtDuration(mins: number | null | undefined) {
  if (!mins || mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
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
 * - fast_started opens a fast segment
 * - fast_completed / fast_ended_early / session_ended_early closes the current fast and opens an eating segment
 * - eating_window_opened opens an eating segment (if none open)
 * - All other events are bucketed into the segment whose [start, end] window contains them
 */
function buildSegments(events: RawEvent[], activeFastStartAt: string | null): Segment[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );

  const segments: Segment[] = [];
  let current: Segment | null = null;

  const open = (type: SegmentType, at: Date, sourceId: string) => {
    if (current && current.endedAt === null) {
      // Force-close the dangling segment at this boundary.
      current.endedAt = at;
      current.durationMinutes = (at.getTime() - current.startedAt.getTime()) / 60000;
    }
    current = {
      id: sourceId,
      type,
      startedAt: at,
      endedAt: null,
      events: [],
    };
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
          // Open the eating window that follows
          open("eating", at, `eating-${ev.id}`);
        } else {
          // No matching fast — treat as a bare event in whatever segment exists
          (current ?? open("eating", at, `eating-${ev.id}`)) && current?.events.push(ev);
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

  // If user is currently fasting per client_feature_settings but no open fast segment, force one open.
  if (activeFastStartAt) {
    const startMs = new Date(activeFastStartAt).getTime();
    const last = segments[segments.length - 1];
    if (!last || last.type !== "fast" || last.endedAt !== null || Math.abs(last.startedAt.getTime() - startMs) > 60_000) {
      segments.push({
        id: `live-fast-${activeFastStartAt}`,
        type: "fast",
        startedAt: new Date(activeFastStartAt),
        endedAt: null,
        events: [],
      });
    }
  }

  return segments.reverse(); // newest first for rendering
}

function SegmentEventRow({ ev }: { ev: RawEvent }) {
  const visual = getEventVisual(ev.event_type, ev.category, ev.icon);
  const Icon = visual.icon;
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <div className={cn("h-6 w-6 rounded-md flex items-center justify-center shrink-0", visual.iconBg)}>
        <Icon className={cn("h-3.5 w-3.5", visual.iconFg)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[13px] text-foreground truncate">{ev.title}</p>
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
            {format(new Date(ev.occurred_at), "h:mm a")}
          </span>
        </div>
        {ev.subtitle && <p className="text-[11px] text-muted-foreground truncate">{ev.subtitle}</p>}
      </div>
    </div>
  );
}

function SegmentCard({ segment }: { segment: Segment }) {
  const live = segment.endedAt === null;
  useTicker(live);

  const isFast = segment.type === "fast";
  const Icon: LucideIcon = isFast ? Flame : Utensils;

  const accent = isFast ? "border-primary/40 bg-primary/5" : "border-amber-500/40 bg-amber-500/5";
  const dot = isFast ? "bg-primary text-primary-foreground" : "bg-amber-500 text-black";
  const labelClr = isFast ? "text-primary" : "text-amber-400";

  const title = isFast ? "Fasting window" : "Eating window";
  const liveDuration = live
    ? formatDistanceToNowStrict(segment.startedAt, { unit: "minute" })
    : null;
  const finalDuration = !live ? fmtDuration(segment.durationMinutes ?? null) : null;

  const endLabel =
    segment.endEventType === "fast_completed"
      ? "Completed"
      : segment.endEventType === "fast_ended_early" || segment.endEventType === "session_ended_early"
      ? "Ended early"
      : null;

  return (
    <div className={cn("relative rounded-xl border-2 p-3.5", accent)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0", dot)}>
            <Icon className="h-4.5 w-4.5" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn("text-xs font-bold uppercase tracking-wider", labelClr)}>
                {title}
              </span>
              {live && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  LIVE
                </span>
              )}
              {endLabel && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0">
                  {endLabel}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {format(segment.startedAt, "h:mm a")}
              {segment.endedAt && ` → ${format(segment.endedAt, "h:mm a")}`}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold tabular-nums text-foreground leading-none">
            {liveDuration ?? finalDuration ?? "—"}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
            {live ? "elapsed" : "total"}
          </p>
        </div>
      </div>

      {/* Nested events */}
      {segment.events.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/60 divide-y divide-border/40">
          {segment.events
            .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
            .map((ev) => (
              <SegmentEventRow key={ev.id} ev={ev} />
            ))}
        </div>
      )}
    </div>
  );
}

function LiveStatusHeader({ activeFastStartAt }: { activeFastStartAt: string | null }) {
  useTicker(!!activeFastStartAt);
  if (!activeFastStartAt) {
    return (
      <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center">
          <Utensils className="h-5 w-5 text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Eating window</p>
          <p className="text-[11px] text-muted-foreground">No active fast — log meals as you eat.</p>
        </div>
      </div>
    );
  }
  const elapsed = formatDistanceToNowStrict(new Date(activeFastStartAt), { unit: "minute" });
  return (
    <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-3 flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
        <Flame className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Currently fasting</p>
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        </div>
        <p className="text-[11px] text-muted-foreground">Started {format(new Date(activeFastStartAt), "h:mm a")}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold tabular-nums text-foreground leading-none">{elapsed}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">elapsed</p>
      </div>
    </div>
  );
}

export function SessionTimeline({ clientId }: SessionTimelineProps) {
  const { data: events = [], isLoading } = useQuery({
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
      return data?.active_fast_start_at ?? null;
    },
    refetchInterval: 60_000,
  });

  const segments = useMemo(() => buildSegments(events, activeFastStartAt), [events, activeFastStartAt]);

  // Group segments by day (using start date)
  const grouped = useMemo(() => {
    const map = new Map<string, Segment[]>();
    for (const seg of segments) {
      const key = format(seg.startedAt, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(seg);
    }
    return Array.from(map.entries()).map(([day, items]) => ({
      day,
      date: new Date(day + "T00:00:00"),
      items,
    }));
  }, [segments]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <LiveStatusHeader activeFastStartAt={activeFastStartAt} />

      {grouped.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Pencil className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No sessions yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Start a fast and your timeline will fill in with sessions, meals, workouts and badges.
          </p>
        </div>
      )}

      {grouped.map((group) => (
        <div key={group.day} className="flex gap-3">
          {/* Gutter */}
          <div className="w-12 shrink-0 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">
              {formatDayHeader(group.date).split(", ")[0]}
            </p>
            <p className="text-[10px] text-muted-foreground/70 leading-tight">
              {format(group.date, "MMM d")}
            </p>
          </div>
          {/* Segments */}
          <div className="flex-1 min-w-0 space-y-3 relative">
            {/* Vertical rail */}
            <div className="absolute -left-3 top-3 bottom-3 w-px bg-border" />
            {group.items.map((seg) => (
              <SegmentCard key={seg.id} segment={seg} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}