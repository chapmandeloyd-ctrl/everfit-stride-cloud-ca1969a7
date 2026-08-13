import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Bell, CheckCircle2, History, Loader2, PenLine, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { JuiceFastHero } from "./JuiceFastHero";
import { JuiceDailyCheckinSheet } from "./JuiceDailyCheckinSheet";
import { JuiceReminderHistorySheet } from "./JuiceReminderHistorySheet";
import { useJuiceFast } from "@/hooks/useJuiceFast";
import { juiceProgress, modeMeta } from "@/lib/juiceFast";

interface Props {
  centerImageSrc: string;
}

/**
 * Renders the active juice fast on the dashboard. Returns null when the
 * client has no juice fast running, so it can be mounted unconditionally.
 */
export function ActiveJuiceFastCard({ centerImageSrc }: Props) {
  const { session, logs, todayLog, endFast, saveDayLog, setLogReminder, snoozeLogReminder } = useJuiceFast();
  const [logOpen, setLogOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [testing, setTesting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const sendTestReminder = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("dispatch-juice-log-reminders", {
        body: { test: true },
      });
      if (error) throw error;
      const parts: string[] = [];
      if (data?.pushed) parts.push(`${data.pushed} push`);
      if (data?.emailed) parts.push(`email to ${data.emailTo}`);
      if (parts.length) toast.success(`Test reminder sent — ${parts.join(" + ")}`);
      else
        toast.warning(
          data?.subscriptions
            ? "No delivery — push failed and email could not be sent."
            : "No push devices registered. Enable notifications, then retry.",
        );
    } catch (e: any) {
      toast.error(e?.message || "Could not send test reminder");
    } finally {
      setTesting(false);
    }
  };

  if (!session) return null;

  const { dayNumber, complete } = juiceProgress(session);
  const meta = modeMeta(session.mode);

  return (
    <Card className="overflow-hidden border-emerald-500/30 bg-black">
      <CardContent className="flex flex-col items-center gap-4 p-4">
        <JuiceFastHero session={session} centerImageSrc={centerImageSrc} />

        <p className="max-w-[34ch] text-center text-[11px] leading-relaxed text-white/45">{meta.description}</p>

        <div className="grid w-full grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setLogOpen(true)}>
            <PenLine className="mr-1.5 h-4 w-4" />
            {todayLog ? "Edit check-in" : "Daily check-in"}
          </Button>
          <Button
            variant={complete ? "default" : "ghost"}
            className={complete ? "" : "text-white/60"}
            onClick={() => (complete ? endFast.mutate({ early: false }) : setConfirmEnd(true))}
            disabled={endFast.isPending}
          >
            {complete ? (
              <>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Complete
              </>
            ) : (
              "End early"
            )}
          </Button>
        </div>

        {/* Daily log reminder */}
        <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-xs font-semibold text-white/85">Daily log reminder</p>
                <p className="text-[10px] text-white/45">Nudges you if the day isn't logged yet.</p>
              </div>
            </div>
            <Switch
              checked={session.log_reminder_enabled !== false}
              onCheckedChange={(v) => setLogReminder.mutate({ enabled: v })}
              disabled={setLogReminder.isPending}
            />
          </div>
          {session.log_reminder_enabled !== false && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[11px] text-white/55">Remind me at</span>
              <input
                type="time"
                value={(session.log_reminder_time || "19:00").slice(0, 5)}
                onChange={(e) => setLogReminder.mutate({ time: e.target.value })}
                className="rounded-lg border border-white/10 bg-black px-2 py-1 text-xs text-white/85"
              />
            </div>
          )}
          {session.log_reminder_snoozed_until &&
            new Date(session.log_reminder_snoozed_until).getTime() > Date.now() && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5">
                <span className="text-[11px] text-amber-300">
                  Snoozed until{" "}
                  {new Date(session.log_reminder_snoozed_until).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-amber-200 underline underline-offset-2"
                  onClick={() => snoozeLogReminder.mutate({ hours: null })}
                  disabled={snoozeLogReminder.isPending}
                >
                  Undo
                </button>
              </div>
            )}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-8 w-full text-[11px] text-emerald-300 hover:text-emerald-200"
            onClick={sendTestReminder}
            disabled={testing}
          >
            {testing ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" />
            )}
            Send test reminder
          </Button>
          <button
            type="button"
            className="mt-1 flex w-full items-center justify-center gap-1.5 text-[11px] text-white/45 hover:text-white/70"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="h-3 w-3" />
            Delivery history
          </button>
        </div>

        {session.includes_refeed && (
          <p className="text-center text-[10px] uppercase tracking-wider text-white/35">
            Refeed day follows day {session.planned_days}
          </p>
        )}
      </CardContent>

      <JuiceReminderHistorySheet open={historyOpen} onOpenChange={setHistoryOpen} />

      <JuiceDailyCheckinSheet
        open={logOpen}
        onOpenChange={setLogOpen}
        session={session}
        dayNumber={dayNumber}
        existing={todayLog}
        loggedDays={logs.length}
        saving={saveDayLog.isPending}
        onSave={(input) => saveDayLog.mutate(input, { onSuccess: () => setLogOpen(false) })}
      />

      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End your juice fast early?</AlertDialogTitle>
            <AlertDialogDescription>
              You're on day {dayNumber} of {session.planned_days}. Ending now logs it as an early finish. Break the fast
              with something light — broth or soft fruit, not a full meal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={() => endFast.mutate({ early: true })}>End fast</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}