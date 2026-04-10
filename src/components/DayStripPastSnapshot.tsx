import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Dumbbell, Swords, Trophy, CheckSquare, Droplets, MapPin,
  Moon, Heart, Footprints, Scale, Activity, Utensils
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DaySnapshotProps {
  clientId: string;
  date: Date;
  trainingEnabled: boolean;
  tasksEnabled: boolean;
  restDayCard: any;
  sportDayCards: any[];
}

export function DayStripPastSnapshot({
  clientId,
  date,
  trainingEnabled,
  tasksEnabled,
  restDayCard,
  sportDayCards,
}: DaySnapshotProps) {
  const dateStr = format(date, "yyyy-MM-dd");

  const practiceCard = sportDayCards?.find((c: any) => c.card_type === "practice");
  const gameCard = sportDayCards?.find((c: any) => c.card_type === "game");

  // Workouts for this day
  const { data: workouts } = useQuery({
    queryKey: ["snapshot-workouts", clientId, dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select("*, workout_plan:workout_plans(*)")
        .eq("client_id", clientId)
        .eq("scheduled_date", dateStr);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && trainingEnabled,
  });

  // Sport events
  const { data: sportEvents } = useQuery({
    queryKey: ["snapshot-sport-events", clientId, dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sport_schedule_events")
        .select("*")
        .eq("client_id", clientId)
        .gte("start_time", `${dateStr}T00:00:00`)
        .lte("start_time", `${dateStr}T23:59:59`)
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  // Tasks
  const { data: tasks } = useQuery({
    queryKey: ["snapshot-tasks", clientId, dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_tasks")
        .select("*")
        .eq("client_id", clientId)
        .eq("due_date", dateStr);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && tasksEnabled,
  });

  // Habit completions for this day
  const { data: habitCompletions } = useQuery({
    queryKey: ["snapshot-habit-completions", clientId, dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_completions")
        .select("*, habit:client_habits(*)")
        .eq("client_id", clientId)
        .eq("completion_date", dateStr);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId && tasksEnabled,
  });

  // Daily checkin
  const { data: checkin } = useQuery({
    queryKey: ["snapshot-checkin", clientId, dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("client_id", clientId)
        .eq("checkin_date", dateStr)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Metric entries for the day
  const { data: metricEntries } = useQuery({
    queryKey: ["snapshot-metrics", clientId, dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metric_entries")
        .select("*, client_metric:client_metrics(*, metric_definition:metric_definitions(*))")
        .eq("client_id", clientId)
        .gte("recorded_at", `${dateStr}T00:00:00`)
        .lte("recorded_at", `${dateStr}T23:59:59`);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  function formatEventTime(isoString: string): string {
    const match = isoString.match(/T(\d{2}):(\d{2})/);
    if (!match) return "";
    const hours = parseInt(match[1], 10);
    const displayHour = hours % 12 || 12;
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${displayHour}:${match[2]} ${ampm}`;
  }

  const isRestDay = (workouts?.length || 0) === 0 && (sportEvents?.length || 0) === 0;
  const completedTasks = tasks?.filter(t => t.completed_at) || [];
  const incompleteTasks = tasks?.filter(t => !t.completed_at) || [];

  const hasTraining = (workouts?.length || 0) > 0 || (sportEvents?.length || 0) > 0;
  const hasTasks = (tasks?.length || 0) > 0;
  const hasHabits = (habitCompletions?.length || 0) > 0;
  const hasCheckin = !!checkin;
  const hasMetrics = (metricEntries?.length || 0) > 0;
  const hasAnything = hasTraining || hasTasks || hasHabits || hasCheckin || hasMetrics || (isRestDay && trainingEnabled);

  const metricIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("weight")) return Scale;
    if (n.includes("sleep")) return Moon;
    if (n.includes("heart")) return Heart;
    if (n.includes("step")) return Footprints;
    if (n.includes("calor")) return Utensils;
    return Activity;
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {format(date, "EEEE, MMM d")}
      </p>

      {/* Sport Event Cards */}
      {sportEvents?.map((event: any) => {
        const isGame = event.event_type === "game" || event.event_type === "event";
        const customCard = isGame ? gameCard : practiceCard;
        const EventIcon = isGame ? Swords : Trophy;
        const label = isGame ? "Game Day" : "Practice";
        const startTime = formatEventTime(event.start_time);
        const endTime = event.end_time ? formatEventTime(event.end_time) : null;
        const timeDisplay = endTime && endTime !== startTime ? `${startTime} - ${endTime}` : startTime;

        return (
          <Card key={event.id} className="overflow-hidden">
            <div className={cn(
              "relative h-56",
              isGame ? "bg-gradient-to-br from-rose-500/20 to-rose-500/5" : "bg-gradient-to-br from-sky-500/20 to-sky-500/5"
            )}>
              {customCard?.image_url ? (
                <img src={customCard.image_url} alt={label} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <EventIcon className={cn("h-16 w-16", isGame ? "text-rose-400/30" : "text-sky-400/30")} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{label}</p>
                <p className="text-lg font-bold text-white">{event.title}</p>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-white/80">{timeDisplay}</p>
                  {event.location && (
                    <p className="text-sm text-white/80 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </p>
                  )}
                </div>
                {customCard?.message && (
                  <p className="text-xs text-white/70 mt-1">{customCard.message}</p>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {/* Workout Cards — horizontal carousel if multiple */}
      {workouts && workouts.length > 0 && (() => {
        const hasMultiple = workouts.length > 1;
        return (
          <div>
            <div
              ref={workoutScrollRef}
              className={hasMultiple ? "flex overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide" : ""}
              onScroll={() => {
                if (workoutScrollRef.current && hasMultiple) {
                  const scrollLeft = workoutScrollRef.current.scrollLeft;
                  const width = workoutScrollRef.current.clientWidth;
                  setWorkoutActiveIndex(Math.round(scrollLeft / width));
                }
              }}
            >
              {workouts.map((w: any) => (
                <Card
                  key={w.id}
                  className={cn(
                    "overflow-hidden shrink-0 snap-center",
                    hasMultiple ? "w-full min-w-full" : "w-full"
                  )}
                >
                  <div className="relative h-56 bg-gradient-to-br from-primary/20 to-primary/5">
                    {w.workout_plan?.image_url ? (
                      <img src={w.workout_plan.image_url} alt={w.workout_plan.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Dumbbell className="h-16 w-16 text-primary/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Workout</p>
                      <p className="text-lg font-bold text-white">
                        {w.workout_plan?.name || "Workout"}
                        {w.completed_at && " ✅"}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {hasMultiple && (
              <div className="flex justify-center gap-1.5 mt-3">
                {workouts.map((_: any, i: number) => (
                  <button
                    key={i}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      i === workoutActiveIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
                    )}
                    onClick={() => {
                      workoutScrollRef.current?.scrollTo({ left: i * (workoutScrollRef.current?.clientWidth || 0), behavior: "smooth" });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Rest Day Card */}
      {isRestDay && trainingEnabled && (
        <Card className="overflow-hidden">
          {restDayCard?.image_url ? (
            <div className="relative h-56">
              <img src={restDayCard.image_url} alt="Rest day" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Rest Day</p>
                <p className="text-base font-bold text-white">
                  {restDayCard?.message || "No workouts scheduled. Enjoy your rest!"}
                </p>
              </div>
            </div>
          ) : (
            <CardContent className="p-6 text-center">
              <Dumbbell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-lg font-semibold">Rest Day</p>
              <p className="text-sm text-muted-foreground">
                {restDayCard?.message || "No workouts scheduled. Enjoy your rest!"}
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {/* Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-2">
          {completedTasks.map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg p-3 bg-emerald-500/5 border border-emerald-500/10">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckSquare className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{t.name} ✅</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {incompleteTasks.length > 0 && (
        <div className="space-y-2">
          {incompleteTasks.map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg p-3 bg-amber-500/5 border border-amber-500/10">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <CheckSquare className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground">Not completed</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Habit completions */}
      {hasHabits && (
        <div className="flex items-center gap-3 rounded-lg p-3 bg-emerald-500/5 border border-emerald-500/10">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Droplets className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {habitCompletions!.length} habit{habitCompletions!.length > 1 ? "s" : ""} completed ✅
            </p>
            <p className="text-xs text-muted-foreground">
              {habitCompletions!.map((h: any) => h.habit?.name || "Habit").join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Daily Check-in */}
      {hasCheckin && (
        <div className="rounded-lg border border-border/50 p-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Daily Check-in</p>
          <div className="grid grid-cols-2 gap-2">
            {checkin.sleep_hours != null && (
              <div className="flex items-center gap-2 text-sm">
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
                <span className="text-muted-foreground">Sleep:</span>
                <span className="font-semibold">{checkin.sleep_hours}h</span>
              </div>
            )}
            {checkin.sleep_quality != null && (
              <div className="flex items-center gap-2 text-sm">
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
                <span className="text-muted-foreground">Quality:</span>
                <span className="font-semibold">{checkin.sleep_quality}/5</span>
              </div>
            )}
            {checkin.nutrition_on_track != null && (
              <div className="flex items-center gap-2 text-sm">
                <Utensils className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-muted-foreground">Nutrition:</span>
                <span className="font-semibold">{checkin.nutrition_on_track ? "On track ✅" : "Off track"}</span>
              </div>
            )}
            {checkin.recovery_completed != null && (
              <div className="flex items-center gap-2 text-sm">
                <Heart className="h-3.5 w-3.5 text-rose-400" />
                <span className="text-muted-foreground">Recovery:</span>
                <span className="font-semibold">{checkin.recovery_completed ? "Done ✅" : "Skipped"}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metric entries — health data */}
      {hasMetrics && (
        <div className="rounded-lg border border-border/50 p-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Health Data</p>
          <div className="grid grid-cols-2 gap-2">
            {metricEntries!.map((entry: any) => {
              const defName = entry.client_metric?.metric_definition?.name || "Metric";
              const unit = entry.client_metric?.metric_definition?.unit || "";
              const Icon = metricIcon(defName);
              return (
                <div key={entry.id} className="flex items-center gap-2 text-sm">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground truncate">{defName}:</span>
                  <span className="font-semibold">{entry.value}{unit ? ` ${unit}` : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Nothing at all */}
      {!hasAnything && (
        <p className="text-sm text-muted-foreground py-2">Nothing recorded for this day</p>
      )}
    </div>
  );
}
