import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Trophy,
  Swords,
  Dumbbell,
  Clock,
  MapPin,
  ChevronRight,
  Target,
  Flame,
  Trash2,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  format,
  addDays,
  startOfDay,
  isSameDay,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  isBefore,
  differenceInCalendarDays,
} from "date-fns";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type AgendaItem =
  | { kind: "workout"; id: string; date: Date; data: any }
  | { kind: "task"; id: string; date: Date; data: any }
  | { kind: "habit"; id: string; date: Date; data: any }
  | { kind: "sport"; id: string; date: Date; data: any }
  | { kind: "appointment"; id: string; date: Date; data: any }
  | { kind: "goal"; id: string; date: Date; data: any };

const RANGE_BEFORE_DAYS = 14;
const RANGE_AFTER_DAYS = 60;

function dayLabel(date: Date) {
  if (isToday(date)) return `Today, ${format(date, "MMMM do")}`;
  if (isTomorrow(date)) return `Tomorrow, ${format(date, "MMMM do")}`;
  if (isYesterday(date)) return `Yesterday, ${format(date, "MMMM do")}`;
  return format(date, "EEEE, MMMM do");
}

export default function ClientCalendar() {
  const clientId = useEffectiveClientId();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const todayRef = useRef<HTMLDivElement | null>(null);

  const today = startOfDay(new Date());
  const rangeStart = useMemo(() => addDays(today, -RANGE_BEFORE_DAYS), []);
  const rangeEnd = useMemo(() => addDays(today, RANGE_AFTER_DAYS), []);
  const startStr = format(rangeStart, "yyyy-MM-dd");
  const endStr = format(rangeEnd, "yyyy-MM-dd");

  // Workouts
  const { data: workouts } = useQuery({
    queryKey: ["agenda-workouts", clientId, startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select("id, scheduled_date, completed_at, assigned_by, client_id, workout_plans(id, name, category, duration_minutes, difficulty)")
        .eq("client_id", clientId!)
        .gte("scheduled_date", startStr)
        .lte("scheduled_date", endStr)
        .order("scheduled_date");
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Tasks
  const { data: tasks } = useQuery({
    queryKey: ["agenda-tasks", clientId, startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_tasks")
        .select("*")
        .eq("client_id", clientId!)
        .gte("due_date", startStr)
        .lte("due_date", endStr)
        .order("due_date");
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Habits (active in window)
  const { data: habits } = useQuery({
    queryKey: ["agenda-habits", clientId, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_habits")
        .select("*")
        .eq("client_id", clientId!)
        .eq("is_active", true)
        .lte("start_date", endStr);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Sport events
  const { data: sportEvents } = useQuery({
    queryKey: ["agenda-sport", clientId, startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sport_schedule_events")
        .select("*")
        .eq("client_id", clientId!)
        .gte("start_time", startStr)
        .lte("start_time", `${endStr}T23:59:59`)
        .order("start_time");
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Appointments
  const { data: appointments } = useQuery({
    queryKey: ["agenda-appointments", clientId, startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, appointment_type:appointment_types(name, color, duration_minutes)")
        .eq("client_id", clientId!)
        .gte("start_time", startStr)
        .lte("start_time", `${endStr}T23:59:59`)
        .in("status", ["confirmed", "completed"])
        .order("start_time");
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Goal countdowns ending in window
  const { data: goals } = useQuery({
    queryKey: ["agenda-goals", clientId, startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_goal_countdowns")
        .select("*")
        .eq("client_id", clientId!)
        .gte("end_date", startStr)
        .lte("end_date", endStr)
        .eq("is_completed", false)
        .order("end_date");
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Build day-grouped map
  const grouped = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    const push = (key: string, item: AgendaItem) => {
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    };

    workouts?.forEach((w) => {
      if (!w.scheduled_date) return;
      const d = parseISO(w.scheduled_date);
      push(format(d, "yyyy-MM-dd"), { kind: "workout", id: w.id, date: d, data: w });
    });

    tasks?.forEach((t) => {
      if (!t.due_date) return;
      const d = parseISO(t.due_date);
      push(format(d, "yyyy-MM-dd"), { kind: "task", id: t.id, date: d, data: t });
    });

    sportEvents?.forEach((e: any) => {
      if (!e.start_time) return;
      const d = parseISO(e.start_time);
      push(format(d, "yyyy-MM-dd"), { kind: "sport", id: e.id, date: d, data: e });
    });

    appointments?.forEach((a: any) => {
      if (!a.start_time) return;
      const d = parseISO(a.start_time);
      push(format(d, "yyyy-MM-dd"), { kind: "appointment", id: a.id, date: d, data: a });
    });

    goals?.forEach((g: any) => {
      if (!g.end_date) return;
      const d = parseISO(g.end_date);
      push(format(d, "yyyy-MM-dd"), { kind: "goal", id: g.id, date: d, data: g });
    });

    // Habits — expand each into the days they occur within the window
    if (habits) {
      for (let i = 0; i <= differenceInCalendarDays(rangeEnd, rangeStart); i++) {
        const day = addDays(rangeStart, i);
        const ds = format(day, "yyyy-MM-dd");
        habits.forEach((h: any) => {
          if (h.start_date > ds) return;
          if (h.end_date && h.end_date < ds) return;
          let active = false;
          if (h.frequency === "daily") active = true;
          else {
            const startDay = new Date(h.start_date + "T00:00:00").getDay();
            active = day.getDay() === startDay;
          }
          if (active) {
            push(ds, { kind: "habit", id: `${h.id}-${ds}`, date: day, data: h });
          }
        });
      }
    }

    return map;
  }, [workouts, tasks, habits, sportEvents, appointments, goals, rangeStart, rangeEnd]);

  // List of all days in range (for headers, even empty)
  const allDays = useMemo(() => {
    const arr: Date[] = [];
    const total = differenceInCalendarDays(rangeEnd, rangeStart);
    for (let i = 0; i <= total; i++) arr.push(addDays(rangeStart, i));
    return arr;
  }, [rangeStart, rangeEnd]);

  // Scroll to today on mount
  useEffect(() => {
    const t = setTimeout(() => {
      todayRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    }, 100);
    return () => clearTimeout(t);
  }, []);

  const scrollToToday = () => {
    todayRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  // Toggle task completion
  const toggleTask = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("client_tasks")
        .update({ completed_at: completed ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-tasks"] });
    },
    onError: (e: Error) => toast({ title: "Couldn't update", description: e.message, variant: "destructive" }),
  });

  // Delete a scheduled workout (client_workouts row)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const deleteWorkout = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_workouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-workouts"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-conflicts"] });
      toast({ title: "Workout removed from calendar" });
      setPendingDelete(null);
    },
    onError: (e: Error) =>
      toast({ title: "Couldn't delete", description: e.message, variant: "destructive" }),
  });

  return (
    <ClientLayout>
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold">Calendar</h1>
          <Button variant="ghost" size="sm" onClick={scrollToToday} className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Today
          </Button>
        </div>
      </div>

      <div className="px-4 pb-24">
        {allDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const items = grouped.get(key) ?? [];
          const isCurrentDay = isSameDay(day, today);
          return (
            <div
              key={key}
              ref={isCurrentDay ? todayRef : undefined}
              className="pt-4"
            >
              <div className="flex items-center gap-2 pb-2 border-b">
                {isCurrentDay && <span className="h-2 w-2 rounded-full bg-primary" />}
                <h2 className={cn(
                  "text-base font-semibold",
                  isCurrentDay ? "text-primary" : isBefore(day, today) ? "text-muted-foreground" : "text-foreground"
                )}>
                  {dayLabel(day)}
                </h2>
              </div>

              {items.length === 0 ? (
                <div className="py-3" />
              ) : (
                <div className="py-3 space-y-2">
                  {items
                    .sort((a, b) => a.date.getTime() - b.date.getTime())
                    .map((item) => (
                      <AgendaCard
                        key={`${item.kind}-${item.id}`}
                        item={item}
                        onToggleTask={(id, completed) => toggleTask.mutate({ id, completed })}
                        onOpenWorkout={(id) => navigate(`/client/workouts/${id}`)}
                        onDeleteWorkout={(id, name) => setPendingDelete({ id, name })}
                      />
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from calendar?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.name}" will be removed from this day. The workout itself stays in your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteWorkout.mutate(pendingDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ClientLayout>
  );
}

function AgendaCard({
  item,
  onToggleTask,
  onOpenWorkout,
}: {
  item: AgendaItem;
  onToggleTask: (id: string, completed: boolean) => void;
  onOpenWorkout: (workoutPlanId: string) => void;
}) {
  if (item.kind === "workout") {
    const w = item.data;
    const completed = !!w.completed_at;
    const isTrainerAssigned = w.assigned_by && w.client_id && w.assigned_by !== w.client_id;
    return (
      <Card
        className="p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => w.workout_plans?.id && onOpenWorkout(w.workout_plans.id)}
      >
        <div className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
          completed ? "bg-success/20 text-success" : "bg-primary/20 text-primary"
        )}>
          {completed ? <CheckCircle2 className="h-5 w-5" /> : <Dumbbell className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate flex items-center gap-2">
            <span className="truncate">{w.workout_plans?.name ?? "Workout"}</span>
            {isTrainerAssigned && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 border-primary/40 text-primary">
                Coach
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
            {completed ? (
              <span>Completed</span>
            ) : (
              <span>Complete your scheduled workout.</span>
            )}
            {w.workout_plans?.duration_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {w.workout_plans.duration_minutes}m
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </Card>
    );
  }

  if (item.kind === "task") {
    const t = item.data;
    const completed = !!t.completed_at;
    return (
      <Card className="p-3 flex items-center gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleTask(t.id, !completed);
          }}
          className={cn(
            "h-7 w-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors",
            completed ? "bg-success/20 border-success text-success" : "border-amber-500 text-amber-500 hover:bg-amber-500/10"
          )}
          aria-label={completed ? "Mark incomplete" : "Mark complete"}
        >
          {completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className={cn("font-medium text-sm truncate", completed && "line-through text-muted-foreground")}>
            {t.name}
          </div>
          {t.description && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</div>
          )}
        </div>
      </Card>
    );
  }

  if (item.kind === "habit") {
    const h = item.data;
    const icon = h.icon_url?.startsWith("emoji:") ? h.icon_url.replace("emoji:", "") : "🎯";
    return (
      <Card className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-violet-500/15 flex items-center justify-center text-lg shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{h.name}</div>
          <div className="text-xs text-muted-foreground">
            Habit • {h.goal_value} {h.goal_unit}
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]">Habit</Badge>
      </Card>
    );
  }

  if (item.kind === "sport") {
    const e = item.data;
    const isGame = e.event_type === "game" || e.event_type === "event";
    return (
      <Card className={cn(
        "p-3 flex items-center gap-3",
        isGame ? "border-rose-500/30 bg-rose-500/5" : "border-sky-500/30 bg-sky-500/5"
      )}>
        <div className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
          isGame ? "bg-rose-500/20 text-rose-500" : "bg-sky-500/20 text-sky-500"
        )}>
          {isGame ? <Swords className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{e.title}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(parseISO(e.start_time), "h:mm a")}
            </span>
            {e.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" />
                {e.location}
              </span>
            )}
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]">{isGame ? "Game" : "Practice"}</Badge>
      </Card>
    );
  }

  if (item.kind === "appointment") {
    const a = item.data;
    return (
      <Card className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
          <CalendarIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            {a.appointment_type?.name ?? "Appointment"}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3" />
            {format(parseISO(a.start_time), "h:mm a")} – {format(parseISO(a.end_time), "h:mm a")}
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]">Session</Badge>
      </Card>
    );
  }

  if (item.kind === "goal") {
    const g = item.data;
    return (
      <Card className="p-3 flex items-center gap-3 border-orange-500/30 bg-orange-500/5">
        <div className="h-9 w-9 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
          <Target className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{g.title}</div>
          <div className="text-xs text-muted-foreground">Goal deadline</div>
        </div>
        <Flame className="h-4 w-4 text-orange-500 shrink-0" />
      </Card>
    );
  }

  return null;
}
