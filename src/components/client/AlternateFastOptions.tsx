import { useMemo, useState } from "react";
import { ExtendedFastButton } from "@/components/client/extended/ExtendedFastButton";
import { StartJuiceFastButton } from "@/components/client/juice/StartJuiceFastButton";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useClientWeeklySchedule } from "@/hooks/useClientWeeklySchedule";
import { findNextFastStart } from "@/lib/prepRunway";
import { useFastSkippedToday, setFastSkipToday } from "@/components/client/ScheduleCountdownRow";
import { formatHour } from "@/lib/resolveFastingWindow";
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

/**
 * Extended / juice fast entry points.
 * While a fast is scheduled for today they are collapsed behind a small link
 * that cancels the scheduled auto-start first, so the two can never conflict.
 */
export function AlternateFastOptions() {
  const clientId = useEffectiveClientId();
  const { weekly, overrides, planWindow } = useClientWeeklySchedule(clientId);
  const skippedToday = useFastSkippedToday(clientId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const next = useMemo(
    () => findNextFastStart(weekly, overrides, planWindow, new Date()),
    [weekly, overrides, planWindow],
  );

  const scheduledToday = !!next && next.daysAway === 0 && !skippedToday;

  if (scheduledToday) {
    return (
      <>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="mx-auto block text-[11px] font-medium text-muted-foreground underline underline-offset-4"
        >
          Change today's fast instead
        </button>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel today's scheduled fast?</AlertDialogTitle>
              <AlertDialogDescription>
                Your fast is set to start automatically at {formatHour(next!.startHour)}. Cancel it to
                start an extended or juice fast instead. Your weekly plan stays unchanged.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setFastSkipToday(clientId, true);
                  setConfirmOpen(false);
                }}
              >
                Cancel & choose another
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <ExtendedFastButton />
      <StartJuiceFastButton />
    </>
  );
}
