import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, CircleDot, Flag } from "lucide-react";
import { useState } from "react";

type EventItem = {
  date: Date;
  type: "checkin" | "review";
  label: string;
};

export function ProtocolMiniCalendar({ clientId }: { clientId: string }) {
  const [month, setMonth] = useState<Date>(new Date());

  const { data } = useQuery({
    queryKey: ["protocol-mini-calendar", clientId],
    queryFn: async () => {
      const now = new Date();
      const horizon = new Date();
      horizon.setDate(horizon.getDate() + 90);

      const [{ data: schedules }, { data: settings }, { data: homework }] = await Promise.all([
        supabase
          .from("recurring_checkin_schedules")
          .select("schedule_name, next_trigger_at, frequency")
          .eq("client_id", clientId)
          .gte("next_trigger_at", now.toISOString())
          .lte("next_trigger_at", horizon.toISOString())
          .order("next_trigger_at", { ascending: true }),
        supabase
          .from("client_feature_settings")
          .select("protocol_start_date, assigned_protocol_duration_days")
          .eq("client_id", clientId)
          .maybeSingle(),
        supabase
          .from("homework_checkins")
          .select("title, due_at")
          .eq("client_id", clientId)
          .gte("due_at", now.toISOString())
          .lte("due_at", horizon.toISOString())
          .order("due_at", { ascending: true }),
      ]);

      const events: EventItem[] = [];

      // Recurring check-ins: expand by frequency across the horizon
      for (const s of (schedules as any[]) || []) {
        const first = new Date(s.next_trigger_at);
        const stepDays =
          s.frequency === "daily" ? 1 :
          s.frequency === "weekly" ? 7 :
          s.frequency === "biweekly" ? 14 :
          s.frequency === "monthly" ? 30 : 7;
        let d = new Date(first);
        let guard = 0;
        while (d <= horizon && guard < 30) {
          events.push({ date: new Date(d), type: "checkin", label: s.schedule_name || "Check-in" });
          d.setDate(d.getDate() + stepDays);
          guard++;
        }
      }

      // One-off homework check-ins
      for (const h of (homework as any[]) || []) {
        if (h.due_at) {
          events.push({ date: new Date(h.due_at), type: "checkin", label: h.title || "Homework" });
        }
      }

      // Protocol review
      const startDate = (settings as any)?.protocol_start_date as string | null;
      const duration = (settings as any)?.assigned_protocol_duration_days as number | null;
      if (startDate && duration && duration > 0) {
        const rev = new Date(startDate);
        rev.setDate(rev.getDate() + duration);
        if (rev >= now && rev <= horizon) {
          events.push({ date: rev, type: "review", label: "Protocol review" });
        }
      }

      return events;
    },
  });

  const events = data || [];
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const checkinDays = events.filter((e) => e.type === "checkin").map((e) => e.date);
  const reviewDays = events.filter((e) => e.type === "review").map((e) => e.date);

  const upcoming = [...events]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Upcoming Schedule</h3>
        <div className="ml-auto flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CircleDot className="h-3 w-3 text-primary" /> Check-in
          </span>
          <span className="flex items-center gap-1">
            <Flag className="h-3 w-3 text-amber-500" /> Review
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-[auto,1fr]">
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          modifiers={{ checkin: checkinDays, review: reviewDays }}
          modifiersClassNames={{
            checkin:
              "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
            review:
              "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold rounded-md",
          }}
          className="pointer-events-auto p-0"
        />

        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Next 5 events
          </div>
          {upcoming.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2">
              No upcoming check-ins or reviews in the next 90 days.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {upcoming.map((e, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-xs sm:text-sm rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5"
                >
                  {e.type === "review" ? (
                    <Flag className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <CircleDot className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                  <span className="truncate font-medium">{e.label}</span>
                  <span className="ml-auto whitespace-nowrap text-muted-foreground">
                    {e.date.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}