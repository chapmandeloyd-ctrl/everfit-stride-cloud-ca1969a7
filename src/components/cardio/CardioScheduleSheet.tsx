import { useState, useMemo, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  /** Activity slug (lowercased + underscored) — what we save into cardio_sessions.activity_type */
  activityType: string;
  /** Pretty name for toasts */
  activityName: string;
  targetType?: "none" | "distance" | "time";
  targetValue?: number | null;
  initialDate?: Date;
  onScheduled?: (date: Date) => void;
}

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS_TO_RENDER = 12;

export function CardioScheduleSheet({
  open, onOpenChange, clientId, activityType, activityName,
  targetType = "none", targetValue = null, initialDate, onScheduled,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"days" | "range">("days");
  const [selectedDays, setSelectedDays] = useState<Set<string>>(() => {
    const init = initialDate ?? new Date();
    return new Set([format(init, "yyyy-MM-dd")]);
  });
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const todayMonthRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      const init = initialDate ?? new Date();
      setSelectedDays(new Set([format(init, "yyyy-MM-dd")]));
      setRangeStart(null);
      setRangeEnd(null);
      setExcluded(new Set());
      setMode("days");
    }
  }, [open, initialDate]);

  const months = useMemo(() => {
    const arr: Date[] = [];
    const start = startOfMonth(new Date());
    for (let i = 0; i < MONTHS_TO_RENDER; i++) arr.push(addMonths(start, i));
    return arr;
  }, []);

  const windowStart = months[0];
  const windowEnd = endOfMonth(months[months.length - 1]);

  // Conflict detection: existing scheduled cardio in window
  const { data: existingCardio } = useQuery({
    queryKey: ["cardio-schedule-conflicts", clientId, format(windowStart, "yyyy-MM"), format(windowEnd, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cardio_sessions" as any)
        .select("id, scheduled_date, activity_type")
        .eq("client_id", clientId)
        .eq("status", "scheduled")
        .gte("scheduled_date", format(windowStart, "yyyy-MM-dd"))
        .lte("scheduled_date", format(windowEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: open && !!clientId,
  });

  const cardioByDay = useMemo(() => {
    const m = new Map<string, any[]>();
    existingCardio?.forEach((c: any) => {
      if (!c.scheduled_date) return;
      const arr = m.get(c.scheduled_date) ?? [];
      arr.push(c);
      m.set(c.scheduled_date, arr);
    });
    return m;
  }, [existingCardio]);

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
      const rows = dates.map((d) => ({
        client_id: clientId,
        activity_type: activityType,
        target_type: targetType,
        target_value: targetValue ?? null,
        status: "scheduled",
        scheduled_date: format(d, "yyyy-MM-dd"),
      }));
      const { error } = await supabase.from("cardio_sessions" as any).insert(rows);
      if (error) throw error;
      return { firstDate: dates[0], count: dates.length };
    },
    onSuccess: ({ firstDate, count }) => {
      queryClient.invalidateQueries({ queryKey: ["cardio-sessions-today"] });
      queryClient.invalidateQueries({ queryKey: ["cardio-schedule-conflicts"] });
      queryClient.invalidateQueries({ queryKey: ["coaching-cardio"] });
      toast({
        title: count === 1 ? `${activityName} scheduled` : `Scheduled on ${count} days`,
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
      const c = cardioByDay.get(k) ?? [];
      if (c.length > 0) out.set(k, c);
    });
    return out;
  }, [resolvedDates, cardioByDay]);

  const handleSchedule = () => {
    if (resolvedDates.length === 0) return;
    if (conflictsByDate.size > 0) {
      setExcluded(new Set());
      setConfirming(true);
      return;
    }
    scheduleMutation.mutate(resolvedDates);
  };

  const toggleDay = (day: Date) => {
    if (mode === "range") {
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
            <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-2">
          {days.map((day) => {
            const inMonth = isSameMonth(day, monthDate);
            const isSel = isDaySelected(day);
            const today = isToday(day);
            const dateStr = format(day, "yyyy-MM-dd");
            const hasCardio = (cardioByDay.get(dateStr) ?? []).length > 0;
            return (
              <button
                key={day.toISOString()}
                onClick={() => inMonth && toggleDay(day)}
                disabled={!inMonth}
                className={cn(
                  "relative h-10 w-10 mx-auto rounded-full flex items-center justify-center text-sm transition-colors",
                  !inMonth && "opacity-0 pointer-events-none",
                  isSel && "bg-destructive text-white font-semibold",
                  !isSel && today && "font-bold text-foreground",
                  !isSel && !today && "text-foreground hover:bg-muted",
                )}
                aria-label={format(day, "PPP")}
              >
                {format(day, "d")}
                {hasCardio && !isSel && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-destructive" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

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
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
            <button
              onClick={() => onOpenChange(false)}
              className="text-base text-foreground font-normal"
            >
              Cancel
            </button>
            <SheetHeader className="flex-1">
              <SheetTitle className="text-center text-base font-semibold">
                {finalDates.length === 0
                  ? "Pick days"
                  : finalDates.length === 1
                    ? (isToday(finalDates[0]) ? "Today" : format(finalDates[0], "MMM d"))
                    : `${finalDates.length} days selected`}
              </SheetTitle>
            </SheetHeader>
            <button
              onClick={handleSchedule}
              disabled={scheduleMutation.isPending || resolvedDates.length === 0}
              className="text-base text-destructive font-semibold disabled:opacity-40"
            >
              Schedule
            </button>
          </div>

          <div className="flex gap-2 px-4 py-2 border-b bg-background">
            <button
              onClick={() => { setMode("days"); setRangeStart(null); setRangeEnd(null); }}
              className={cn(
                "flex-1 text-xs font-medium py-1.5 rounded-full transition-colors",
                mode === "days" ? "bg-destructive text-white" : "bg-muted text-muted-foreground",
              )}
            >
              Tap days
            </button>
            <button
              onClick={() => { setMode("range"); setSelectedDays(new Set()); }}
              className={cn(
                "flex-1 text-xs font-medium py-1.5 rounded-full transition-colors",
                mode === "range" ? "bg-destructive text-white" : "bg-muted text-muted-foreground",
              )}
            >
              Pick a range
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {months.map(renderMonth)}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirming} onOpenChange={(o) => !o && setConfirming(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {conflictsByDate.size === 1 ? "Day already has cardio" : `${conflictsByDate.size} days have cardio`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Uncheck any day you don't want to add another cardio to. Checked days will get this activity added.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2 py-2">
            {Array.from(conflictsByDate.entries()).map(([dateStr, items]) => {
              const isOff = excluded.has(dateStr);
              return (
                <label
                  key={dateStr}
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={!isOff}
                    onCheckedChange={(c) => {
                      setExcluded((prev) => {
                        const next = new Set(prev);
                        if (c) next.delete(dateStr);
                        else next.add(dateStr);
                        return next;
                      });
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {format(parseISO(dateStr), "EEEE, MMM d")}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      Already has: {items.map((i: any) => (i.activity_type || "Cardio").replace(/_/g, " ")).join(", ")}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground">
            Will schedule on <span className="font-semibold text-foreground">{finalDates.length}</span> day{finalDates.length === 1 ? "" : "s"}.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => finalDates.length > 0 && scheduleMutation.mutate(finalDates)}
              disabled={finalDates.length === 0}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}