import { useState, useMemo, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth,
  startOfWeek, endOfWeek, addMonths, isToday, parseISO, isAfter, isBefore,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  workoutPlanId: string;
  /** Existing client_workouts row id (if this workout already has a schedule entry). */
  existingClientWorkoutId?: string | null;
  /** Initial selected date (defaults to today). */
  initialDate?: Date;
  onScheduled?: (date: Date) => void;
}

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS_TO_RENDER = 12; // 12 months scrollable

export function WorkoutScheduleSheet({
  open, onOpenChange, clientId, workoutPlanId,
  existingClientWorkoutId, initialDate, onScheduled,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"days" | "range">("days");
  // Multi-day pick (keys = yyyy-MM-dd)
  const [selectedDays, setSelectedDays] = useState<Set<string>>(() => {
    const init = initialDate ?? new Date();
    return new Set([format(init, "yyyy-MM-dd")]);
  });
  // Range picker
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  // Days the user has explicitly unchecked in the conflict dialog (yyyy-MM-dd)
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const todayMonthRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && initialDate) {
      setSelectedDays(new Set([format(initialDate, "yyyy-MM-dd")]));
      setRangeStart(null);
      setRangeEnd(null);
      setExcluded(new Set());
      setMode("days");
    }
  }, [open, initialDate]);

  // Months: from current month going forward; clients can also tap past dates
  // since we render the current month first (which includes some prior days).
  const months = useMemo(() => {
    const arr: Date[] = [];
    const start = startOfMonth(new Date());
    for (let i = 0; i < MONTHS_TO_RENDER; i++) arr.push(addMonths(start, i));
    return arr;
  }, []);

  // Fetch all scheduled workouts in the visible window for conflict detection
  const windowStart = months[0];
  const windowEnd = endOfMonth(months[months.length - 1]);
  const { data: existingWorkouts } = useQuery({
    queryKey: ["schedule-conflicts", clientId, format(windowStart, "yyyy-MM"), format(windowEnd, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select("id, scheduled_date, assigned_by, client_id, workout_plans(name)")
        .eq("client_id", clientId)
        .gte("scheduled_date", format(windowStart, "yyyy-MM-dd"))
        .lte("scheduled_date", format(windowEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && !!clientId,
  });

  const workoutsByDay = useMemo(() => {
    const m = new Map<string, any[]>();
    existingWorkouts?.forEach((w: any) => {
      if (!w.scheduled_date) return;
      const k = w.scheduled_date;
      const arr = m.get(k) ?? [];
      arr.push(w);
      m.set(k, arr);
    });
    return m;
  }, [existingWorkouts]);

  // Compute the resolved list of selected dates (range expanded into individual days)
  const resolvedDates = useMemo(() => {
    if (mode === "range" && rangeStart && rangeEnd) {
      const [a, b] = isAfter(rangeStart, rangeEnd) ? [rangeEnd, rangeStart] : [rangeStart, rangeEnd];
      return eachDayOfInterval({ start: a, end: b });
    }
    return Array.from(selectedDays).sort().map((s) => parseISO(s));
  }, [mode, rangeStart, rangeEnd, selectedDays]);

  const finalDates = useMemo(
    () => resolvedDates.filter((d) => !excluded.has(format(d, "yyyy-MM-dd"))),
    [resolvedDates, excluded],
  );

  const scheduleMutation = useMutation({
    mutationFn: async (dates: Date[]) => {
      if (dates.length === 0) throw new Error("Pick at least one day");
      // If editing an existing entry: move it to the FIRST date, then duplicate to the rest.
      const [first, ...rest] = dates;
      if (existingClientWorkoutId) {
        const { error: moveErr } = await supabase
          .from("client_workouts")
          .update({ scheduled_date: format(first, "yyyy-MM-dd") })
          .eq("id", existingClientWorkoutId);
        if (moveErr) throw moveErr;
      } else {
        const { error: insertErr } = await supabase
          .from("client_workouts")
          .insert({
            client_id: clientId,
            workout_plan_id: workoutPlanId,
            assigned_by: clientId,
            scheduled_date: format(first, "yyyy-MM-dd"),
          });
        if (insertErr) throw insertErr;
      }
      if (rest.length > 0) {
        const rows = rest.map((d) => ({
          client_id: clientId,
          workout_plan_id: workoutPlanId,
          assigned_by: clientId,
          scheduled_date: format(d, "yyyy-MM-dd"),
        }));
        const { error: bulkErr } = await supabase.from("client_workouts").insert(rows);
        if (bulkErr) throw bulkErr;
      }
      return { firstDate: first, count: dates.length };
    },
    onSuccess: ({ firstDate, count }) => {
      queryClient.invalidateQueries({ queryKey: ["agenda-workouts"] });
      queryClient.invalidateQueries({ queryKey: ["client-workout-for-plan"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-conflicts"] });
      toast({
        title: count === 1 ? "Workout scheduled" : `Scheduled on ${count} days`,
        description: count === 1 ? format(firstDate, "EEEE, MMMM d") : `Starting ${format(firstDate, "MMM d")}`,
      });
      onScheduled?.(firstDate);
      onOpenChange(false);
      setConfirming(false);
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't schedule", description: err.message, variant: "destructive" });
    },
  });

  const conflictsByDate = useMemo(() => {
    const out = new Map<string, any[]>();
    resolvedDates.forEach((d) => {
      const k = format(d, "yyyy-MM-dd");
      const c = (workoutsByDay.get(k) ?? []).filter((w) => w.id !== existingClientWorkoutId);
      if (c.length > 0) out.set(k, c);
    });
    return out;
  }, [resolvedDates, workoutsByDay, existingClientWorkoutId]);

  const handleMove = () => {
    if (resolvedDates.length === 0) return;
    if (conflictsByDate.size > 0) {
      // Reset exclusions so the user starts fresh per save
      setExcluded(new Set());
      setConfirming(true);
      return;
    }
    scheduleMutation.mutate(resolvedDates);
  };

  const toggleDay = (day: Date) => {
    if (mode === "range") {
      // First tap sets start, second sets end, third resets to a new start
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(day);
        setRangeEnd(null);
      } else {
        setRangeEnd(day);
      }
    } else {
      const k = format(day, "yyyy-MM-dd");
      setSelectedDays((prev) => {
        const next = new Set(prev);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        return next;
      });
    }
  };

  const isDaySelected = (day: Date) => {
    if (mode === "range") {
      if (rangeStart && rangeEnd) {
        const [a, b] = isAfter(rangeStart, rangeEnd) ? [rangeEnd, rangeStart] : [rangeStart, rangeEnd];
        return !isBefore(day, a) && !isAfter(day, b);
      }
      return rangeStart ? isSameDay(day, rangeStart) : false;
    }
    return selectedDays.has(format(day, "yyyy-MM-dd"));
  };

  const renderMonth = (monthDate: Date) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
    const isCurrentMonth = isSameMonth(monthDate, new Date());

    return (
      <div
        key={format(monthDate, "yyyy-MM")}
        ref={isCurrentMonth ? todayMonthRef : undefined}
        className="px-4 pb-6"
      >
        <h3 className="text-center text-base font-semibold text-foreground py-3">
          {format(monthDate, "MMMM yyyy")}
        </h3>
        <div className="grid grid-cols-7 mb-1">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="text-center text-xs text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-2">
          {days.map((day) => {
            const inMonth = isSameMonth(day, monthDate);
            const isSel = isDaySelected(day);
            const today = isToday(day);
            const dateStr = format(day, "yyyy-MM-dd");
            const hasWorkout = (workoutsByDay.get(dateStr) ?? []).length > 0;
            return (
              <button
                key={day.toISOString()}
                onClick={() => inMonth && toggleDay(day)}
                disabled={!inMonth}
                className={cn(
                  "relative h-10 w-10 mx-auto rounded-full flex items-center justify-center text-sm transition-colors",
                  !inMonth && "opacity-0 pointer-events-none",
                  isSel && "bg-primary text-primary-foreground font-semibold",
                  !isSel && today && "font-bold text-foreground",
                  !isSel && !today && "text-foreground hover:bg-muted",
                )}
                aria-label={format(day, "PPP")}
              >
                {format(day, "d")}
                {hasWorkout && !isSel && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Scroll to current month when sheet opens
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      todayMonthRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[92vh] p-0 flex flex-col rounded-t-2xl">
          {/* Top bar: Cancel / Today / Move */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
            <button
              onClick={() => onOpenChange(false)}
              className="text-base text-foreground font-normal"
            >
              Cancel
            </button>
            <SheetHeader className="flex-1">
              <SheetTitle className="text-center text-base font-semibold">
                {isToday(selected) ? "Today" : format(selected, "MMM d")}
              </SheetTitle>
            </SheetHeader>
            <button
              onClick={handleMove}
              disabled={scheduleMutation.isPending}
              className="text-base text-primary font-semibold disabled:opacity-40"
            >
              {existingClientWorkoutId ? "Move" : "Schedule"}
            </button>
          </div>

          {/* Scrollable months */}
          <div className="flex-1 overflow-y-auto">
            {months.map(renderMonth)}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!pendingConflict} onOpenChange={(o) => !o && setPendingConflict(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Day already has a workout</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingConflict && (
                <>
                  You already have{" "}
                  <span className="font-semibold">
                    "{pendingConflict.existing[0]?.workout_plans?.name ?? "a workout"}"
                  </span>{" "}
                  scheduled on {format(pendingConflict.date, "EEEE, MMMM d")}. Add another?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingConflict && scheduleMutation.mutate(pendingConflict.date)}
            >
              Add anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}