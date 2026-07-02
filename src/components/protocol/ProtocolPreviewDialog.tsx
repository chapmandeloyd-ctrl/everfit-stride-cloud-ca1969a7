import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProtocolScheduleTable, ScheduleTotals } from "./ProtocolScheduleTable";
import type { ComputedPlan } from "@/lib/protocolPlan";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>
        {plan ? (
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
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {onConfirm && (
            <Button onClick={() => { onConfirm(); onOpenChange(false); }}>{confirmLabel}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}