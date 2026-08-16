import { useMemo, useState } from "react";
import { ChevronDown, PlayCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ExtendedFastButton } from "@/components/client/extended/ExtendedFastButton";
import { StartJuiceFastButton } from "@/components/client/juice/StartJuiceFastButton";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useClientWeeklySchedule } from "@/hooks/useClientWeeklySchedule";
import { findNextFastStart } from "@/lib/prepRunway";
import { useFastSkippedToday, setFastSkipToday } from "@/components/client/ScheduleCountdownRow";
import { formatHour } from "@/lib/resolveFastingWindow";
import { resolveDayForDate, timeToHour } from "@/lib/resolveFastingWindow";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * Extended / juice fast entry points.
 * While a fast is scheduled for today they are collapsed behind a small link
 * that cancels the scheduled auto-start first, so the two can never conflict.
 */
export function AlternateFastOptions() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startParam = searchParams.get("start");
  const { weekly, overrides, planWindow } = useClientWeeklySchedule(clientId);
  const skippedToday = useFastSkippedToday(clientId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [open, setOpen] = useState(startParam === "extended" || startParam === "juice");

  const next = useMemo(
    () => findNextFastStart(weekly, overrides, planWindow, new Date()),
    [weekly, overrides, planWindow],
  );

  // A start time that has just passed is still today's scheduled fast. Using
  // only `findNextFastStart` made this flip to tomorrow and exposed conflicting
  // alternate-fast buttons immediately after the scheduled time.
  const today = useMemo(
    () => resolveDayForDate(weekly ?? null, overrides ?? null, new Date()),
    [weekly, overrides],
  );
  const scheduledToday = !!today && today.enabled !== false && today.ratio !== "eat_all_day" && !skippedToday;
  const todayStartHour = today ? timeToHour(today.window_start_time) : next?.startHour;

  if (scheduledToday) {
    return (
      <>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="mx-auto block text-[11px] font-medium text-muted-foreground underline underline-offset-4"
        >
          Switch fast type (extended or juice)
        </button>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel today's scheduled fast?</AlertDialogTitle>
              <AlertDialogDescription>
                Your fast is set to start automatically at {formatHour(todayStartHour ?? 0)}. Cancel it to
                start an extended or juice fast instead. Your weekly plan stays unchanged.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  await setFastSkipToday(clientId, true);
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
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full h-11 rounded-xl border border-border bg-card/60 px-4 flex items-center justify-between text-sm font-semibold"
        >
          <span>More ways to fast</span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2">
        <div className="space-y-1">
          <ExtendedFastButton autoOpen={startParam === "extended"} />
          <button
            type="button"
            onClick={() => navigate("/client/extended-fast-demo")}
            className="flex w-full items-center justify-center gap-1.5 py-1 text-[11px] font-medium text-muted-foreground underline underline-offset-4"
          >
            <PlayCircle className="h-3 w-3" />
            How extended fasting works
          </button>
        </div>
        <div className="space-y-1">
          <StartJuiceFastButton autoOpen={startParam === "juice"} />
          <button
            type="button"
            onClick={() => navigate("/client/juice-fast-demo")}
            className="flex w-full items-center justify-center gap-1.5 py-1 text-[11px] font-medium text-muted-foreground underline underline-offset-4"
          >
            <PlayCircle className="h-3 w-3" />
            How juice fasting works
          </button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
