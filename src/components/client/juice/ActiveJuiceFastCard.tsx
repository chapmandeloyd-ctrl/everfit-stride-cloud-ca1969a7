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
import { Bell, CheckCircle2, PenLine } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { JuiceFastHero } from "./JuiceFastHero";
import { JuiceDayLogSheet } from "./JuiceDayLogSheet";
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
  const { session, todayLog, endFast, saveDayLog, setLogReminder } = useJuiceFast();
  const [logOpen, setLogOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

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
            {todayLog ? "Edit today" : "Log day"}
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
        </div>

        {session.includes_refeed && (
          <p className="text-center text-[10px] uppercase tracking-wider text-white/35">
            Refeed day follows day {session.planned_days}
          </p>
        )}
      </CardContent>

      <JuiceDayLogSheet
        open={logOpen}
        onOpenChange={setLogOpen}
        session={session}
        dayNumber={dayNumber}
        existing={todayLog}
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