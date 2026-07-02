import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ProtocolScheduleTable, ScheduleTotals } from "./ProtocolScheduleTable";
import type { ComputedPlan } from "@/lib/protocolPlan";
import { useIsMobile } from "@/hooks/use-mobile";
import { CalendarCheck } from "lucide-react";

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

  const uniform = plan ? isUniformRecurring(plan) : false;
  const body = (
    plan ? (
      <div className="space-y-4">
        <ScheduleTotals plan={plan} />
        {uniform ? (
          <UniformSummary plan={plan} />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <ProtocolScheduleTable plan={plan} compact />
            <p className="text-[11px] text-muted-foreground px-3 py-2 border-t border-border bg-muted/30">
              Swipe the table sideways to see macros →
            </p>
          </div>
        )}
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

function isUniformRecurring(plan: ComputedPlan): boolean {
  if (plan.extended) return false;
  if (!plan.days || plan.days.length < 2) return false;
  const first = plan.days[0];
  if (first.adFast || first.isRefeed) return false;
  return plan.days.every(
    (d) =>
      !d.adFast &&
      !d.isRefeed &&
      d.fastWindow === first.fastWindow &&
      d.eatStart === first.eatStart &&
      d.eatEnd === first.eatEnd &&
      d.cal === first.cal &&
      d.proteinG === first.proteinG &&
      d.carbG === first.carbG &&
      d.fatG === first.fatG,
  );
}

function UniformSummary({ plan }: { plan: ComputedPlan }) {
  const d = plan.days[0];
  const dayCount = plan.days.length;
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-primary">
        <CalendarCheck className="h-3.5 w-3.5" />
        Every day this cycle
      </div>
      <div className="text-sm">
        <span className="font-semibold">All {dayCount} days</span>
        <span className="text-muted-foreground"> · {d.fastWindow} · {d.eatStart} – {d.eatEnd}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 pt-1">
        <SummaryTile label="Cal" value={String(d.cal)} accent />
        <SummaryTile label="Protein" value={`${d.proteinG}g`} />
        <SummaryTile label="Carbs" value={`${d.carbG}g`} />
        <SummaryTile label="Fat" value={`${d.fatG}g`} />
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug pt-1">
        Your schedule repeats identically each day — no fast/refeed rotation on this protocol.
      </p>
    </div>
  );
}

function SummaryTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-md border p-2 text-center ${accent ? "border-primary/30 bg-primary/5" : "border-border bg-background/50"}`}>
      <p className="text-base font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
    </div>
  );
}