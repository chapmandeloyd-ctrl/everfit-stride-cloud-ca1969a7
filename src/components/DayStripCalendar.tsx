import { useState, useRef, useEffect, useMemo } from "react";
import { format, addDays, isToday, isSameDay, isBefore, startOfDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Dumbbell, Swords, Trophy, CheckSquare, Droplets, MapPin, History, ArrowLeft, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DayStripPastSnapshot } from "@/components/DayStripPastSnapshot";
import { getIconComponent } from "@/components/cardio/cardioActivities";

interface DayStripCalendarProps {
  clientId: string;
  daysAhead: number;
  trainingEnabled: boolean;
  tasksEnabled: boolean;
  onDateChange?: (date: Date | null) => void;
}

interface DayData {
  workouts: any[];
  sportEvents: any[];
  tasks: any[];
  habits: any[];
  cardio: any[];
}

export function DayStripCalendar({ clientId, daysAhead, trainingEnabled, tasksEnabled, onDateChange }: DayStripCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDate, setHistoryDate] = useState<Date | null>(null);

  const today = useMemo(() => new Date(), []);

  // Reset to today on mount / client change
  useEffect(() => {
    setSelectedDate(null);
    setHistoryDate(null);
    setHistoryOpen(false);
    onDateChange?.(null);
  }, [clientId]);

  const handleDateSelect = (date: Date | null) => {
    setSelectedDate(date);
    onDateChange?.(date);
  };

  // Only today + future days in the strip
  const days: Date[] = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i <= daysAhead; i++) {
      result.push(addDays(today, i));
    }
    return result;
  }, [today, daysAhead]);

  // Data range covers the full month (for history) + future days
  const monthStart = startOfMonth(today);
  const endDay = addDays(today, daysAhead);
  const startDate = format(monthStart, "yyyy-MM-dd");
  const endDate = format(endDay, "yyyy-MM-dd");

  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch workouts, sport events, tasks, habits
  const { data: workouts } = useQuery({
    queryKey: ["day-strip-workouts", clientId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select("*, workout_plan:workout_plans(*)")
        .eq("client_id", clientId)
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && trainingEnabled,
  });

  const { data: sportEvents } = useQuery({
    queryKey: ["day-strip-sport-events", clientId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sport_schedule_events")
        .select("*")
        .eq("client_id", clientId)
        .gte("start_time", `${startDate}T00:00:00`)
        .lte("start_time", `${endDate}T23:59:59`)
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  const { data: tasks } = useQuery({
    queryKey: ["day-strip-tasks", clientId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_tasks")
        .select("*")
        .eq("client_id", clientId)
        .gte("due_date", startDate)
        .lte("due_date", endDate);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && tasksEnabled,
  });

  const { data: habits } = useQuery({
    queryKey: ["day-strip-habits", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_habits")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .lte("start_date", endDate);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId && tasksEnabled,
  });

  const { data: cardio } = useQuery({
    queryKey: ["day-strip-cardio", clientId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cardio_sessions" as any)
        .select("id, activity_type, target_type, target_value, scheduled_date, status")
        .eq("client_id", clientId)
        .eq("status", "scheduled")
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  const { data: cardioTypes } = useQuery({
    queryKey: ["day-strip-cardio-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cardio_activity_types")
        .select("name, icon_name");
      if (error) throw error;
      return data as { name: string; icon_name: string }[];
    },
  });
  const cardioIconMap = useMemo(() => {
    const m = new Map<string, string>();
    cardioTypes?.forEach((t) => m.set(t.name.toLowerCase(), t.icon_name));
    return m;
  }, [cardioTypes]);

  // Fetch custom cards
  const { data: restDayCard } = useQuery({
    queryKey: ["day-strip-rest-card", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_rest_day_cards" as any)
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!clientId && trainingEnabled,
  });

  const { data: sportDayCards } = useQuery({
    queryKey: ["day-strip-sport-cards", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_sport_day_cards" as any)
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  const practiceCard = sportDayCards?.find((c: any) => c.card_type === "practice");
  const gameCard = sportDayCards?.find((c: any) => c.card_type === "game");

  function getDayData(date: Date): DayData {
    const dateStr = format(date, "yyyy-MM-dd");
    return {
      workouts: workouts?.filter(w => w.scheduled_date === dateStr) || [],
      sportEvents: sportEvents?.filter(e => e.start_time?.startsWith(dateStr)) || [],
      tasks: tasks?.filter(t => t.due_date === dateStr) || [],
      habits: habits?.filter(h => {
        if (h.end_date && h.end_date < dateStr) return false;
        if (h.start_date > dateStr) return false;
        if (h.frequency === "daily") return true;
        const startDay = new Date(h.start_date + "T00:00:00").getDay();
        return date.getDay() === startDay;
      }) || [],
      cardio: cardio?.filter((c: any) => c.scheduled_date === dateStr) || [],
    };
  }

  function hasDots(date: Date) {
    const data = getDayData(date);
    return {
      hasWorkout: data.workouts.length > 0 || data.cardio.length > 0,
      hasSport: data.sportEvents.length > 0,
      hasTask: data.tasks.length > 0 || data.habits.length > 0,
    };
  }

  function hasAnyActivity(date: Date) {
    const dots = hasDots(date);
    return dots.hasWorkout || dots.hasSport || dots.hasTask;
  }

  function formatEventTime(isoString: string): string {
    const match = isoString.match(/T(\d{2}):(\d{2})/);
    if (!match) return "";
    const hours = parseInt(match[1], 10);
    const displayHour = hours % 12 || 12;
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${displayHour}:${match[2]} ${ampm}`;
  }

  // Viewing state
  const isViewingHistory = historyDate !== null;
  const viewDate = selectedDate || today;
  const viewData = getDayData(viewDate);
  const isViewingToday = isToday(viewDate);
  const isRestDay = viewData.workouts.length === 0 && viewData.sportEvents.length === 0;
  const hasAnything = viewData.workouts.length > 0 || viewData.sportEvents.length > 0 || viewData.tasks.length > 0 || viewData.habits.length > 0;

  // Month calendar days for history sheet
  const monthDays = useMemo(() => {
    const ms = startOfMonth(today);
    const me = endOfMonth(today);
    return eachDayOfInterval({ start: ms, end: me });
  }, [today]);

  const firstDayOfWeek = monthDays[0].getDay(); // 0=Sun

  const handleHistoryDateSelect = (date: Date) => {
    setHistoryDate(date);
    setHistoryOpen(false);
    handleDateSelect(date);
  };

  const handleBackToToday = () => {
    setHistoryDate(null);
    handleDateSelect(null);
  };

  return (
    <div className="space-y-3">
      {/* History banner when viewing a past day */}
      {isViewingHistory && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5"
            onClick={handleBackToToday}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Today
          </Button>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {format(historyDate!, "EEEE, MMM d")}
          </span>
        </div>
      )}

      {/* Day Strip — today + future only (hidden when viewing history) */}
      {!isViewingHistory && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-10 w-10 rounded-xl"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="h-4 w-4 text-muted-foreground" />
          </Button>
          <div ref={scrollRef} className="flex gap-1 overflow-x-auto scrollbar-hide pb-1 flex-1">
            {days.map((day) => {
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : isToday(day);
              const isTodayDay = isToday(day);
              const dots = hasDots(day);
              const hasAny = dots.hasWorkout || dots.hasSport || dots.hasTask;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateSelect(isTodayDay && !selectedDate ? null : day)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-all shrink-0 w-12",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-muted"
                  )}
                >
                  <span className={cn(
                    "text-[10px] font-semibold uppercase tracking-wide",
                    isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {format(day, "EEE")}
                  </span>
                  <span className={cn(
                    "text-lg font-bold leading-none",
                    isSelected ? "text-primary-foreground" : "text-foreground"
                  )}>
                    {format(day, "d")}
                  </span>
                  <div className="flex gap-0.5 h-2 items-center">
                    {dots.hasWorkout && (
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-primary-foreground/70" : "bg-primary"
                      )} />
                    )}
                    {dots.hasSport && (
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-primary-foreground/70" : "bg-destructive"
                      )} />
                    )}
                    {dots.hasTask && (
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-primary-foreground/70" : "bg-accent"
                      )} />
                    )}
                    {!hasAny && <div className="w-1.5 h-1.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Past day snapshot */}
      {isViewingHistory && historyDate && isBefore(startOfDay(historyDate), startOfDay(today)) && (
        <DayStripPastSnapshot
          clientId={clientId}
          date={historyDate}
          trainingEnabled={trainingEnabled}
          tasksEnabled={tasksEnabled}
          restDayCard={restDayCard}
          sportDayCards={sportDayCards || []}
        />
      )}

      {/* Future day preview (from strip selection) */}
      {selectedDate && !isToday(selectedDate) && !isBefore(startOfDay(selectedDate), startOfDay(today)) && !isViewingHistory && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {format(viewDate, "EEEE, MMM d")}
          </p>

          {viewData.sportEvents.map((event: any) => {
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
                  isGame ? "bg-gradient-to-br from-destructive/20 to-destructive/5" : "bg-gradient-to-br from-primary/20 to-primary/5"
                )}>
                  {customCard?.image_url ? (
                    <img src={customCard.image_url} alt={label} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <EventIcon className={cn("h-16 w-16", isGame ? "text-destructive/30" : "text-primary/30")} />
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

          {viewData.workouts.map((w: any) => (
            <Card key={w.id} className="overflow-hidden">
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
                  </p>
                </div>
              </div>
            </Card>
          ))}

          {isRestDay && trainingEnabled && (
            <Card className="overflow-hidden">
              {restDayCard?.image_url ? (
                <div className="relative h-56">
                  <img src={restDayCard.image_url} alt="Rest day" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    {restDayCard?.title && (
                      <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{restDayCard.title}</p>
                    )}
                    {restDayCard?.message && (
                      <p className="text-base font-bold text-white">{restDayCard.message}</p>
                    )}
                  </div>
                </div>
              ) : (
                <CardContent className="p-6 text-center">
                  <Dumbbell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  {restDayCard?.title && <p className="text-lg font-semibold">{restDayCard.title}</p>}
                  {restDayCard?.message && <p className="text-sm text-muted-foreground">{restDayCard.message}</p>}
                </CardContent>
              )}
            </Card>
          )}

          {viewData.tasks.map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg p-3 bg-accent/10 border border-accent/20">
              <div className="p-2 rounded-lg bg-accent/10">
                <CheckSquare className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground">Task</p>
              </div>
            </div>
          ))}

          {viewData.habits.length > 0 && (
            <div className="flex items-center gap-3 rounded-lg p-3 bg-primary/5 border border-primary/10">
              <div className="p-2 rounded-lg bg-primary/10">
                <Droplets className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                  {viewData.habits.length} habit{viewData.habits.length > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {viewData.habits.map((h: any) => h.name).join(", ")}
                </p>
              </div>
            </div>
          )}

          {!hasAnything && !trainingEnabled && (
            <p className="text-sm text-muted-foreground py-2">Nothing scheduled</p>
          )}
        </div>
      )}

      {/* History Sheet — Month Calendar */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          <SheetHeader>
            <SheetTitle className="text-center">{format(today, "MMMM yyyy")}</SheetTitle>
          </SheetHeader>
          <div className="pt-4 pb-6">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for offset */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {monthDays.map((day) => {
                const isTodayDay = isToday(day);
                const isPast = isBefore(startOfDay(day), startOfDay(today));
                const isFuture = !isPast && !isTodayDay;
                const hasActivity = hasAnyActivity(day);

                return (
                  <button
                    key={day.toISOString()}
                    disabled={isFuture || isTodayDay}
                    onClick={() => isPast ? handleHistoryDateSelect(day) : undefined}
                    className={cn(
                      "relative flex flex-col items-center justify-center py-2.5 rounded-xl transition-all",
                      isTodayDay && "bg-primary text-primary-foreground font-bold",
                      isPast && "hover:bg-muted cursor-pointer",
                      isFuture && "opacity-30 cursor-default",
                    )}
                  >
                    <span className={cn(
                      "text-sm font-semibold",
                      isTodayDay ? "text-primary-foreground" : isPast ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {format(day, "d")}
                    </span>
                    {hasActivity && isPast && (
                      <div className="absolute bottom-1 flex gap-0.5">
                        <div className="w-1 h-1 rounded-full bg-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
