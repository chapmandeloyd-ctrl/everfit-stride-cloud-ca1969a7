import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ProtocolScheduleTable, ScheduleTotals } from "./ProtocolScheduleTable";
import type { ComputedPlan } from "@/lib/protocolPlan";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  plan: ComputedPlan | null;
  title?: string;
  subtitle?: string;
  onConfirm?: () => void;
  confirmLabel?: string;
}

export function ProtocolPreviewDialog({ open, onOpenChange, plan, title = "Full Schedule Preview", subtitle, onConfirm, confirmLabel = "Save Protocol" }: Props) {
  const isMobile = useIsMobile();

  const body = (
    plan ? (
      <div className="space-y-4">
        <ScheduleTotals plan={plan} />
        <div className="rounded-lg border border-border overflow-hidden">
          <ProtocolScheduleTable plan={plan} />
        </div>
        {plan.extended && plan.needsRefeed && (
          <p className="text-xs text-muted-foreground">
            An auto-generated refeed day is included at the end for safe re-entry (≈70% target calories, 1g/lb protein, 30g carbs).
          </p>
        )}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">No plan available.</p>
    )
  );

  const actions = (
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Close</Button>
      {onConfirm && (
        <Button onClick={() => { onConfirm(); onOpenChange(false); }} className="w-full sm:w-auto">{confirmLabel}</Button>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[95vh] flex flex-col p-0 gap-0 rounded-t-2xl"
        >
          <SheetHeader className="px-4 pt-5 pb-3 border-b border-border text-left">
            <SheetTitle>{title}</SheetTitle>
            {subtitle && <SheetDescription>{subtitle}</SheetDescription>}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4">{body}</div>
          <SheetFooter className="px-4 py-3 border-t border-border bg-background flex-row gap-2 pb-[calc(env(safe-area-inset-bottom)+12px)]">
            {actions}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>
        {body}
        <DialogFooter>{actions}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}