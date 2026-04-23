import { Sheet, SheetContent } from "@/components/ui/sheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityName: string;
  onSchedule: () => void;
  onStartNow: () => void;
}

export function CardioActionsSheet({
  open, onOpenChange, activityName, onSchedule, onStartNow,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-8 pt-4">
        <div className="px-6 pb-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {activityName}
          </p>
        </div>
        <div className="flex flex-col">
          <button
            onClick={() => { onOpenChange(false); onSchedule(); }}
            className="px-6 py-4 text-left text-base text-foreground hover:bg-muted/50 active:bg-muted transition-colors border-b border-border"
          >
            Schedule for a day
          </button>
          <button
            onClick={() => { onOpenChange(false); onStartNow(); }}
            className="px-6 py-4 text-left text-base text-foreground hover:bg-muted/50 active:bg-muted transition-colors"
          >
            Start now
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}