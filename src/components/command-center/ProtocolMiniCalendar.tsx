import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, CircleDot, Flag, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { EventDetailDrawer } from "./EventDetailDrawer";

type EventItem = {
  date: Date;
  type: "checkin" | "review";
  label: string;
  sourceId?: string;
  sourceKind?: "recurring" | "homework" | "review";
  frequency?: string | null;
};

export function ProtocolMiniCalendar({ clientId }: { clientId: string }) {
  const [month, setMonth] = useState<Date>(new Date());
  const [pending, setPending] = useState<EventItem | null>(null);
  const [detail, setDetail] = useState<EventItem | null>(null);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["protocol-mini-calendar", clientId],
    queryFn: async () => {
      const now = new Date();
      const horizon = new Date();
      horizon.setDate(horizon.getDate() + 90);

      const [{ data: schedules }, { data: settings }, { data: homework }] = await Promise.all([
        supabase
          .from("recurring_checkin_schedules")
          .select("id, schedule_name, next_trigger_at, frequency")
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
          .select("id, subject, checkin_date, completed")
          .eq("client_id", clientId)
          .eq("completed", false)
          .gte("checkin_date", now.toISOString().slice(0, 10))
          .lte("checkin_date", horizon.toISOString().slice(0, 10))
          .order("checkin_date", { ascending: true }),
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
          events.push({
            date: new Date(d),
            type: "checkin",
            label: s.schedule_name || "Check-in",
            sourceId: s.id,
            sourceKind: "recurring",
            frequency: s.frequency,
          });
          d.setDate(d.getDate() + stepDays);
          guard++;
        }
      }

      // One-off homework check-ins
      for (const h of (homework as any[]) || []) {
        if (h.checkin_date) {
          events.push({
            date: new Date(h.checkin_date + "T09:00:00"),
            type: "checkin",
            label: h.subject || "Homework",
            sourceId: h.id,
            sourceKind: "homework",
          });
        }
      }

      // Protocol review
      const startDate = (settings as any)?.protocol_start_date as string | null;
      const duration = (settings as any)?.assigned_protocol_duration_days as number | null;
      if (startDate && duration && duration > 0) {
        const rev = new Date(startDate);
        rev.setDate(rev.getDate() + duration);
        if (rev >= now && rev <= horizon) {
          events.push({
            date: rev,
            type: "review",
            label: "Protocol review",
            sourceKind: "review",
          });
        }
      }

      return events;
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (evt: EventItem) => {
      const now = new Date();
      if (evt.sourceKind === "recurring" && evt.sourceId) {
        const stepDays =
          evt.frequency === "daily" ? 1 :
          evt.frequency === "weekly" ? 7 :
          evt.frequency === "biweekly" ? 14 :
          evt.frequency === "monthly" ? 30 : 7;
        const next = new Date(evt.date);
        next.setDate(next.getDate() + stepDays);
        const { error } = await supabase
          .from("recurring_checkin_schedules")
          .update({
            last_triggered_at: now.toISOString(),
            next_trigger_at: next.toISOString(),
          })
          .eq("id", evt.sourceId);
        if (error) throw error;
      } else if (evt.sourceKind === "homework" && evt.sourceId) {
        const { error } = await supabase
          .from("homework_checkins")
          .update({ completed: true })
          .eq("id", evt.sourceId);
        if (error) throw error;
      } else if (evt.sourceKind === "review") {
        // Renew the protocol cycle: start today, keep duration
        const today = now.toISOString().slice(0, 10);
        const { error } = await supabase
          .from("client_feature_settings")
          .update({ protocol_start_date: today })
          .eq("client_id", clientId);
        if (error) throw error;
      }
    },
    onSuccess: (_res, evt) => {
      toast.success(
        evt.sourceKind === "review"
          ? "Protocol review completed — cycle renewed"
          : "Check-in marked completed"
      );
      qc.invalidateQueries({ queryKey: ["protocol-mini-calendar", clientId] });
      qc.invalidateQueries({ queryKey: ["active-protocol-summary", clientId] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update");
    },
    onSettled: () => setPending(null),
  });

  const events = data || [];

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
          onDayClick={(day) => {
            const hit = events.find(
              (ev) =>
                ev.date.getFullYear() === day.getFullYear() &&
                ev.date.getMonth() === day.getMonth() &&
                ev.date.getDate() === day.getDate()
            );
            if (hit) setDetail(hit);
          }}
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
                  <button
                    type="button"
                    onClick={() => setDetail(e)}
                    className="truncate font-medium min-w-0 text-left hover:text-primary transition-colors"
                  >
                    {e.label}
                  </button>
                  <span className="whitespace-nowrap text-muted-foreground ml-auto">
                    {e.date.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 shrink-0"
                    onClick={() => setPending(e)}
                    title={e.sourceKind === "review" ? "Mark review complete" : "Mark completed"}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <EventDetailDrawer
        clientId={clientId}
        event={detail}
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        onComplete={(e) => {
          setDetail(null);
          setPending(e);
        }}
        completing={completeMutation.isPending}
      />

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.sourceKind === "review"
                ? "Mark protocol review completed?"
                : "Mark this check-in completed?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.sourceKind === "review"
                ? "This renews the current protocol cycle — the start date resets to today and the next review is pushed out by the assigned duration."
                : pending?.sourceKind === "recurring"
                ? `“${pending?.label}” will be marked done and the next occurrence will be scheduled automatically.`
                : `“${pending?.label}” will be marked completed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (pending) completeMutation.mutate(pending);
              }}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? "Saving…" : "Mark completed"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}