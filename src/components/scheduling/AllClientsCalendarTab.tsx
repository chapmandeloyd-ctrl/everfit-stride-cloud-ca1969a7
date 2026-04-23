import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  startOfDay,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Dumbbell, Activity, Filter, Users, X } from "lucide-react";

type ActivityFilter = "all" | "workouts" | "cardio";

export function AllClientsCalendarTab() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const rangeStart = startOfWeek(monthStart);
  const rangeEnd = endOfWeek(monthEnd);

  // Fetch trainer's clients
  const { data: clients } = useQuery({
    queryKey: ["all-clients-cal-clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("client_id, profiles!client_feature_settings_client_id_fkey(id, full_name, email)")
        .eq("trainer_id", user!.id);
      if (error) throw error;
      return (data || [])
        .map((row: any) => row.profiles)
        .filter(Boolean)
        .sort((a: any, b: any) => (a.full_name || a.email || "").localeCompare(b.full_name || b.email || ""));
    },
    enabled: !!user?.id,
  });

  const clientIds = useMemo(() => (clients || []).map((c: any) => c.id), [clients]);
  const clientMap = useMemo(() => {
    const m: Record<string, any> = {};
    (clients || []).forEach((c: any) => { m[c.id] = c; });
    return m;
  }, [clients]);

  const activeClientIds = useMemo(() => {
    if (selectedClientIds.size === 0) return clientIds;
    return clientIds.filter((id) => selectedClientIds.has(id));
  }, [clientIds, selectedClientIds]);

  // Fetch all scheduled workouts for trainer's clients in month
  const { data: workouts } = useQuery({
    queryKey: ["all-clients-cal-workouts", user?.id, format(monthStart, "yyyy-MM"), clientIds.join(",")],
    queryFn: async () => {
      if (!clientIds.length) return [];
      const { data, error } = await supabase
        .from("client_workouts")
        .select("id, client_id, scheduled_date, completed_at, workout_plans(name)")
        .in("client_id", clientIds)
        .gte("scheduled_date", format(monthStart, "yyyy-MM-dd"))
        .lte("scheduled_date", format(monthEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && clientIds.length > 0,
  });

  // Fetch all scheduled cardio for trainer's clients in month
  const { data: cardio } = useQuery({
    queryKey: ["all-clients-cal-cardio", user?.id, format(monthStart, "yyyy-MM"), clientIds.join(",")],
    queryFn: async () => {
      if (!clientIds.length) return [];
      const { data, error } = await supabase
        .from("cardio_sessions")
        .select("id, client_id, activity_type, target_type, target_value, scheduled_date, status")
        .in("client_id", clientIds)
        .eq("status", "scheduled")
        .gte("scheduled_date", format(monthStart, "yyyy-MM-dd"))
        .lte("scheduled_date", format(monthEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && clientIds.length > 0,
  });

  // Build per-day events filtered by active filters
  const eventsByDate = useMemo(() => {
    const map: Record<string, Array<{ type: "workout" | "cardio"; data: any }>> = {};
    const add = (key: string, ev: any) => {
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    };
    if (activityFilter !== "cardio") {
      (workouts || []).forEach((w: any) => {
        if (!activeClientIds.includes(w.client_id)) return;
        if (!w.scheduled_date) return;
        add(w.scheduled_date, { type: "workout", data: w });
      });
    }
    if (activityFilter !== "workouts") {
      (cardio || []).forEach((c: any) => {
        if (!activeClientIds.includes(c.client_id)) return;
        if (!c.scheduled_date) return;
        add(c.scheduled_date, { type: "cardio", data: c });
      });
    }
    return map;
  }, [workouts, cardio, activeClientIds, activityFilter]);

  // Build calendar days
  const days: Date[] = [];
  let d = rangeStart;
  while (d <= rangeEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const today = startOfDay(new Date());
  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedEvents = selectedDateStr ? eventsByDate[selectedDateStr] || [] : [];

  const toggleClient = (id: string) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatActivityName = (slug: string) =>
    slug.split(/[-_\s]/).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");

  const formatTarget = (c: any) => {
    if (!c.target_value) return "";
    if (c.target_type === "duration") return `${c.target_value} min`;
    if (c.target_type === "distance") return `${c.target_value} mi`;
    if (c.target_type === "calories") return `${c.target_value} kcal`;
    return `${c.target_value}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[160px] text-center">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Activity filter */}
          <div className="flex gap-1">
            <Button variant={activityFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setActivityFilter("all")}>
              All
            </Button>
            <Button variant={activityFilter === "workouts" ? "default" : "outline"} size="sm" onClick={() => setActivityFilter("workouts")}>
              <Dumbbell className="h-3 w-3 mr-1" /> Workouts
            </Button>
            <Button variant={activityFilter === "cardio" ? "default" : "outline"} size="sm" onClick={() => setActivityFilter("cardio")}>
              <Activity className="h-3 w-3 mr-1" /> Cardio
            </Button>
          </div>

          {/* Client filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Users className="h-3 w-3 mr-1" />
                {selectedClientIds.size === 0 ? "All clients" : `${selectedClientIds.size} client${selectedClientIds.size > 1 ? "s" : ""}`}
                <Filter className="h-3 w-3 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <div className="p-2 border-b flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Filter by client</span>
                {selectedClientIds.size > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setSelectedClientIds(new Set())}>
                    Clear
                  </Button>
                )}
              </div>
              <ScrollArea className="h-64">
                <div className="p-2 space-y-1">
                  {(clients || []).map((c: any) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedClientIds.has(c.id)}
                        onCheckedChange={() => toggleClient(c.id)}
                      />
                      <span className="text-sm truncate">{c.full_name || c.email}</span>
                    </label>
                  ))}
                  {(!clients || clients.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-4">No clients yet</p>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active filter chips */}
      {selectedClientIds.size > 0 && (
        <div className="flex flex-wrap gap-1">
          {Array.from(selectedClientIds).map((id) => (
            <Badge key={id} variant="secondary" className="gap-1">
              {clientMap[id]?.full_name || clientMap[id]?.email || "Client"}
              <button onClick={() => toggleClient(id)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-xs font-medium text-muted-foreground text-center py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const events = eventsByDate[dateStr] || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const woCount = events.filter((e) => e.type === "workout").length;
          const carCount = events.filter((e) => e.type === "cardio").length;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(day)}
              className={`bg-background p-2 min-h-[80px] text-left transition-colors hover:bg-accent/50 ${
                !isCurrentMonth ? "opacity-40" : ""
              } ${isSelected ? "ring-2 ring-primary ring-inset" : ""}`}
            >
              <span
                className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                  isToday ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-0.5">
                {woCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Dumbbell className="h-2.5 w-2.5 text-primary" />
                    <span className="text-[10px] text-muted-foreground truncate">
                      {woCount} workout{woCount > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {carCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Activity className="h-2.5 w-2.5" style={{ color: "hsl(var(--destructive))" }} />
                    <span className="text-[10px] text-muted-foreground truncate">
                      {carCount} cardio
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Dumbbell className="h-3 w-3 text-primary" />
          <span>Workout</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Activity className="h-3 w-3" style={{ color: "hsl(var(--destructive))" }} />
          <span>Cardio</span>
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
            <span className="text-muted-foreground font-normal ml-2">
              · {selectedEvents.length} item{selectedEvents.length === 1 ? "" : "s"}
            </span>
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nothing scheduled</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev, i) => {
                const client = clientMap[ev.data.client_id];
                const clientName = client?.full_name || client?.email || "Client";
                if (ev.type === "workout") {
                  return (
                    <Card key={`w-${i}`}>
                      <CardContent className="py-3 flex items-center gap-3">
                        <div className="w-1 h-10 rounded-full bg-primary" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Dumbbell className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium truncate">
                              {ev.data.workout_plans?.name || "Workout"}
                            </span>
                            <Badge variant="outline" className="text-xs">Workout</Badge>
                            {ev.data.completed_at && <Badge variant="secondary" className="text-xs">Done</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">{clientName}</div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
                return (
                  <Card key={`c-${i}`}>
                    <CardContent className="py-3 flex items-center gap-3">
                      <div className="w-1 h-10 rounded-full" style={{ backgroundColor: "hsl(var(--destructive))" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Activity className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium truncate">
                            {formatActivityName(ev.data.activity_type || "Cardio")}
                          </span>
                          <Badge variant="outline" className="text-xs">Cardio</Badge>
                          {formatTarget(ev.data) && (
                            <span className="text-xs text-muted-foreground">{formatTarget(ev.data)} target</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{clientName}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
