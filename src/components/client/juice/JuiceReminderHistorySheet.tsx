import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertTriangle, Smartphone, Mail, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * JuiceReminderHistorySheet — delivery receipts for juice-log reminders.
 * Shows every attempt (test, scheduled, snoozed) with push/email outcome so
 * a silent reminder can be diagnosed without guessing.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TRIGGER_LABEL: Record<string, string> = {
  test: "Test",
  scheduled: "Scheduled",
  snoozed: "After snooze",
};

export function JuiceReminderHistorySheet({ open, onOpenChange }: Props) {
  const { user } = useAuth();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["juice-reminder-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("juice_fast_reminder_log")
        .select(
          "id, trigger, day_number, planned_days, title, subscription_count, push_delivered_count, push_failed_count, email_sent, email_to, in_app_created, status, error, attempted_at",
        )
        .eq("client_id", user!.id)
        .order("attempted_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && !!user?.id,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Reminder delivery history</SheetTitle>
          <SheetDescription>
            Every test and scheduled juice-log reminder, with what actually reached you.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading history…
            </div>
          ) : !rows?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No reminders sent yet. Send a test reminder to see it appear here.
            </p>
          ) : (
            rows.map((r) => {
              const ok = r.status === "sent";
              return (
                <div key={r.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {TRIGGER_LABEL[r.trigger] ?? r.trigger}
                        </Badge>
                        {r.day_number != null && (
                          <span className="text-xs text-muted-foreground">
                            Day {r.day_number}
                            {r.planned_days ? ` of ${r.planned_days}` : ""}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">{r.title ?? "Juice log reminder"}</p>
                    </div>
                    {ok ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Smartphone className="h-3 w-3" />
                      {r.push_delivered_count}/{r.subscription_count} device
                      {r.subscription_count === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {r.email_sent ? `Emailed${r.email_to ? ` · ${r.email_to}` : ""}` : "No email"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Bell className="h-3 w-3" />
                      {r.in_app_created ? "In-app" : "No in-app"}
                    </span>
                  </div>

                  {r.error && (
                    <p className="mt-2 break-words rounded bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                      {r.error}
                    </p>
                  )}

                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {new Date(r.attempted_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
