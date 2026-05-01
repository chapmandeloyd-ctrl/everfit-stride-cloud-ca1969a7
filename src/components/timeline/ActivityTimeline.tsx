import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, formatDistanceToNowStrict } from "date-fns";
import { Camera, Pencil, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

import { CATEGORY_FILTERS, getEventVisual, type EventCategory } from "./eventConfig";
import { toast } from "sonner";

interface ActivityTimelineProps {
  clientId: string;
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
  metadata: Record<string, any> | null;
  source: string;
  edited: boolean;
}

interface ActiveTimelineState {
  active_fast_start_at: string | null;
  eating_window_ends_at: string | null;
}

const MOOD_EMOJI: Record<string, string> = {
  good: "🙂",
  energized: "⚡",
  happy: "😄",
  calm: "😌",
  tired: "😴",
  stressed: "😖",
};

const MEAL_QUALITY_EMOJI: Record<string, string> = {
  clean: "🥗",
  balanced: "🍽️",
  hungry: "🥕",
  indulgent: "🍔",
  light: "🍃",
};

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

  const { data: activeState } = useQuery({
    queryKey: ["client-timeline-active-state", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("active_fast_start_at, eating_window_ends_at")
        .eq("client_id", clientId)
        .maybeSingle();

      if (error) throw error;
      return (data ?? {
        active_fast_start_at: null,
        eating_window_ends_at: null,
      }) as ActiveTimelineState;
    },
    refetchInterval: 60_000,
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

  const dedupedEvents = useMemo(() => {
    const seen = new Set<string>();

    return events.filter((event) => {
      const meta = event.metadata ?? {};
      const fingerprint = [
        event.event_type,
        meta.journal_id ?? "",
        meta.snapshot_id ?? "",
        meta.fasting_log_id ?? "",
        event.occurred_at,
        event.title,
      ].join("::");

      if (seen.has(fingerprint)) return false;
      seen.add(fingerprint);
      return true;
    });
  }, [events]);

  return (
    <div className="space-y-5">
      {trainerMode && (
        <div className="flex items-center justify-between gap-2">
          <ScrollArea className="flex-1">
            <div className="flex items-center gap-2 pb-2">
              {CATEGORY_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    filter === f.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
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
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", backfillMutation.isPending && "animate-spin")} />
            Backfill
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-16 shrink-0 pt-3">
                <Skeleton className="h-14 w-12 ml-auto" />
              </div>
              <Skeleton className="h-40 w-full rounded-[2rem]" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="space-y-5">
          <div className="flex gap-3">
            <DateGutter date={new Date()} />
            <div className="relative min-w-0 flex-1 pl-4">
              <Rail />
              <LiveStatusInline
                activeFastStartAt={activeState?.active_fast_start_at ?? null}
                eatingWindowEndsAt={activeState?.eating_window_ends_at ?? null}
              />
            </div>
          </div>

          {dedupedEvents.map((event) => (
            <div key={event.id} className="flex gap-3">
              <DateGutter date={new Date(event.occurred_at)} />
              <div className="relative min-w-0 flex-1 pl-4">
                <Rail />
                <TimelineEventCard event={event} />
              </div>
            </div>
          ))}

          {dedupedEvents.length === 0 && (
            <div className="flex gap-3">
              <div className="w-16 shrink-0" />
              <div className="relative min-w-0 flex-1 pl-4">
                <Rail />
                <div className="rounded-[2rem] border border-border bg-card/40 p-5">
                  <p className="text-base font-bold text-foreground">Welcome to your Timeline</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Every fast, meal, workout, journal, and health update will show up here as you use the app.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TimelineEventCard({ event }: { event: TimelineEvent }) {
  if (event.event_type === "ai_snapshot_imported") {
    return <SnapshotEventCard event={event} />;
  }

  if (event.event_type === "journal_entry" || event.category === "journal") {
    return <JournalEventCard event={event} />;
  }

  return <GenericEventCard event={event} />;
}

function LiveStatusInline({
  activeFastStartAt,
  eatingWindowEndsAt,
}: {
  activeFastStartAt: string | null;
  eatingWindowEndsAt: string | null;
}) {
  const hasEatingWindow = !!eatingWindowEndsAt && new Date(eatingWindowEndsAt).getTime() > Date.now();

  if (activeFastStartAt) {
    return (
      <div className="py-2">
        <h3 className="text-2xl font-bold text-foreground">Currently fasting</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Since {format(new Date(activeFastStartAt), "MMM d 'at' h:mm a")} · {formatDistanceToNowStrict(new Date(activeFastStartAt))} elapsed
        </p>
      </div>
    );
  }

  if (hasEatingWindow) {
    return (
      <div className="py-2">
        <h3 className="text-2xl font-bold text-foreground">Fuel Phase open</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Open until {format(new Date(eatingWindowEndsAt), "h:mm a")}. Meals and logs will keep stacking here.
        </p>
      </div>
    );
  }

  return (
    <div className="py-2">
      <h3 className="text-2xl font-bold text-foreground">Not tracking right now</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Start a fast or log anything today and it will appear here in your timeline.
      </p>
    </div>
  );
}

function JournalEventCard({ event }: { event: TimelineEvent }) {
  const meta = event.metadata ?? {};
  const moodEmoji = typeof meta.mood === "string" ? MOOD_EMOJI[meta.mood] ?? "📓" : "📓";
  const mealEmoji = typeof meta.meals_quality === "string" ? MEAL_QUALITY_EMOJI[meta.meals_quality] ?? "🍽️" : null;
  const bodyFeelings = Array.isArray(meta.body_feelings) ? meta.body_feelings.slice(0, 2) : [];
  const mealsCount = meta.meals_count;
  const snacksCount = typeof meta.snacks_count === "number" ? meta.snacks_count : null;

  return (
    <div className="rounded-[2rem] border border-border bg-card/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {format(new Date(event.occurred_at), "MMM d 'at' h:mm a")}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-md text-primary">
          <Pencil className="h-4 w-4" />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
          {moodEmoji}
        </div>
        {mealEmoji && (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">
            {mealEmoji}
          </div>
        )}
        {bodyFeelings.map((item) => (
          <Pill key={item}>{String(item)}</Pill>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {mealsCount ? <Pill>{mealsCount}+ meals</Pill> : null}
        {snacksCount !== null ? <Pill>{snacksCount} snacks</Pill> : null}
      </div>

      {event.subtitle ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{event.subtitle}</p>
      ) : null}
    </div>
  );
}

function SnapshotEventCard({ event }: { event: TimelineEvent }) {
  const meta = event.metadata ?? {};
  const metrics = (meta.metrics ?? {}) as Record<string, number>;
  const chips: Array<{ label: string; value: string }> = [];

  if (toNumber(metrics["Steps"]) > 0) chips.push({ label: "Steps", value: Math.round(toNumber(metrics["Steps"])).toLocaleString() });
  if (toNumber(metrics["Weight"]) > 0) chips.push({ label: "Weight", value: `${trimNumber(toNumber(metrics["Weight"]))} lb` });
  if (toNumber(metrics["Sleep"]) > 0) chips.push({ label: "Sleep", value: `${trimNumber(toNumber(metrics["Sleep"]))}h` });
  if (toNumber(metrics["Caloric Burn"]) > 0) chips.push({ label: "Burn", value: `${Math.round(toNumber(metrics["Caloric Burn"])).toLocaleString()} cal` });
  if (toNumber(metrics["Caloric Intake"]) > 0) chips.push({ label: "Intake", value: `${Math.round(toNumber(metrics["Caloric Intake"])).toLocaleString()} cal` });

  const visual = getEventVisual(event.event_type, event.category, event.icon);

  return (
    <div className="rounded-[2rem] border border-border bg-card/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {format(new Date(event.occurred_at), "MMM d 'at' h:mm a")}
        </span>
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", visual.iconFg)}>
          <Camera className="h-4 w-4" />
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-full text-xl", visual.iconBg)}>
          📸
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight text-foreground">AI Snapshot imported</p>
          <p className="text-sm text-muted-foreground">Health metrics auto-filled</p>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <Pill key={chip.label}>
              {chip.label}: <span className="text-muted-foreground">{chip.value}</span>
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}

function GenericEventCard({ event }: { event: TimelineEvent }) {
  const visual = getEventVisual(event.event_type, event.category, event.icon);
  const Icon = visual.icon;
  const chips = buildMetadataChips(event);

  return (
    <div className="rounded-[2rem] border border-border bg-card/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {format(new Date(event.occurred_at), "MMM d 'at' h:mm a")}
        </span>
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", visual.iconFg)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mb-3 flex items-start gap-3">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full", visual.iconBg)}>
          <Icon className={cn("h-5 w-5", visual.iconFg)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-2xl font-bold leading-tight text-foreground">{event.title}</p>
            {event.edited ? <Badge variant="outline" className="h-5 px-1.5 py-0 text-[10px]">edited</Badge> : null}
          </div>
          {event.subtitle ? <p className="mt-1 text-sm text-muted-foreground">{event.subtitle}</p> : null}
          <p className="mt-2 text-xs text-muted-foreground/70">
            {formatDistanceToNow(new Date(event.occurred_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <Pill key={chip.label}>
              {chip.label}: <span className="text-muted-foreground">{chip.value}</span>
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}

function buildMetadataChips(event: TimelineEvent) {
  const meta = event.metadata ?? {};
  const chips: Array<{ label: string; value: string }> = [];

  if (toNumber(meta.target_hours) > 0 && event.event_type === "fast_started") {
    chips.push({ label: "Target", value: `${trimNumber(toNumber(meta.target_hours))}h` });
  }

  if (toNumber(meta.actual_hours) > 0 && event.event_type !== "fast_started") {
    chips.push({ label: "Duration", value: `${trimNumber(toNumber(meta.actual_hours))}h` });
  }

  if (toNumber(meta.completion_pct) > 0) {
    chips.push({ label: "Completion", value: `${Math.round(toNumber(meta.completion_pct))}%` });
  }

  if (toNumber(meta.window_hours) > 0) {
    chips.push({ label: "Window", value: `${trimNumber(toNumber(meta.window_hours))}h` });
  }

  if (typeof meta.reason === "string" && meta.reason.trim()) {
    chips.push({ label: "Reason", value: meta.reason.trim().split("_").join(" ") });
  }

  return chips;
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-muted px-3 py-2 text-sm font-semibold text-foreground">{children}</span>;
}

function DateGutter({ date }: { date: Date }) {
  return (
    <div className="w-16 shrink-0 pt-3 pr-1 text-right">
      <p className="text-xs font-bold uppercase leading-none text-muted-foreground">{format(date, "MMM")}</p>
      <p className="mt-1 text-5xl font-extrabold leading-none tabular-nums text-foreground">{format(date, "d")}</p>
    </div>
  );
}

function Rail() {
  return <span className="absolute bottom-0 left-0 top-0 w-px bg-border" />;
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function trimNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
}
