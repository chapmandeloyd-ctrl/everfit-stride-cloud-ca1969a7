import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { Pencil, RefreshCw } from "lucide-react";
import { CATEGORY_FILTERS, getEventVisual, type EventCategory } from "./eventConfig";
import { toast } from "sonner";

interface ActivityTimelineProps {
  clientId: string;
  /** When true, trainer can edit/backfill */
  trainerMode?: boolean;
}

interface TimelineEvent {
  id: string;
  client_id: string;
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

function formatDayHeader(date: Date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d");
}

export function ActivityTimeline({ clientId, trainerMode = false }: ActivityTimelineProps) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<EventCategory | "all">("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["activity-events", clientId, filter],
    queryFn: async () => {
      let q = supabase
        .from("activity_events")
        .select("*")
        .eq("client_id", clientId)
        .order("occurred_at", { ascending: false })
        .limit(200);
      if (filter !== "all") q = q.eq("category", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as TimelineEvent[];
    },
  });

  const backfillMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("backfill_activity_events", { p_client_id: clientId });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      toast.success(`Backfilled ${count} historical events`);
      queryClient.invalidateQueries({ queryKey: ["activity-events", clientId] });
    },
    onError: (e: any) => toast.error(e.message || "Backfill failed"),
  });

  // Group events by day
  const groupedDays = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();
    for (const ev of events) {
      const dayKey = format(new Date(ev.occurred_at), "yyyy-MM-dd");
      if (!groups.has(dayKey)) groups.set(dayKey, []);
      groups.get(dayKey)!.push(ev);
    }
    return Array.from(groups.entries()).map(([day, items]) => ({
      day,
      date: new Date(day + "T00:00:00"),
      items,
    }));
  }, [events]);

  return (
    <div className="space-y-4">
      {/* Trainer-only controls (filters + backfill) */}
      {trainerMode && (
        <div className="flex items-center justify-between gap-2">
          <ScrollArea className="flex-1">
            <div className="flex items-center gap-2 pb-2">
              {CATEGORY_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    filter === f.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </ScrollArea>
          <Button
            size="sm"
            variant="outline"
            onClick={() => backfillMutation.mutate()}
            disabled={backfillMutation.isPending}
            className="shrink-0"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", backfillMutation.isPending && "animate-spin")} />
            Backfill
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Pencil className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your fasts, meals, workouts and badges will show up here.
          </p>
          {trainerMode && (
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => backfillMutation.mutate()}
              disabled={backfillMutation.isPending}
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", backfillMutation.isPending && "animate-spin")} />
              Backfill from history
            </Button>
          )}
        </div>
      )}

      {/* Timeline rail */}
      {!isLoading && groupedDays.length > 0 && (
        <div className="space-y-6">
          {groupedDays.map((group) => (
            <div key={group.day}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {formatDayHeader(group.date)}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Events */}
              <div className="relative pl-4">
                {/* Vertical rail */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
                <div className="space-y-3">
                  {group.items.map((ev) => {
                    const visual = getEventVisual(ev.event_type, ev.category, ev.icon);
                    const Icon = visual.icon;
                    return (
                      <div key={ev.id} className="relative flex items-start gap-3">
                        {/* Icon dot */}
                        <div
                          className={cn(
                            "relative z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ring-4 ring-background",
                            visual.iconBg,
                          )}
                        >
                          <Icon className={cn("h-4 w-4", visual.iconFg)} />
                        </div>

                        {/* Card */}
                        <div className="flex-1 min-w-0 bg-card border border-border rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-foreground">{ev.title}</span>
                                {ev.edited && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                    edited
                                  </Badge>
                                )}
                                {ev.source === "trainer" && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-purple-400 border-purple-500/30">
                                    by trainer
                                  </Badge>
                                )}
                              </div>
                              {ev.subtitle && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{ev.subtitle}</p>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                              {format(new Date(ev.occurred_at), "h:mm a")}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {formatDistanceToNow(new Date(ev.occurred_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}