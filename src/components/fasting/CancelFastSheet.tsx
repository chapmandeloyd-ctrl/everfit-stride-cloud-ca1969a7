import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AlertTriangle, XCircle } from "lucide-react";

export interface CancelFastStat {
  label: string;
  value: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "scheduled" = fast never started, "active" = a running fast was stopped early */
  variant: "scheduled" | "active";
  /** Parent-controlled: warning first, then the cancelled status view */
  stage: "confirm" | "summary";
  stats: CancelFastStat[];
  onConfirm?: () => void;
  onDone: () => void;
}

/**
 * Full slide-up sheet used for BOTH cancelling a scheduled fast and stopping an
 * active fast early. Stage 1 warns, stage 2 shows the cancelled status + stats
 * and returns the user to the Today screen.
 */
export function CancelFastSheet({ open, onOpenChange, variant, stage, stats, onConfirm, onDone }: Props) {
  const isScheduled = variant === "scheduled";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-black border-t p-0 max-h-[92vh] overflow-y-auto"
        style={{ borderColor: "hsl(var(--primary) / 0.35)" }}
      >
        <div className="px-5 pt-7 pb-9 max-w-md mx-auto space-y-6">
          {stage === "confirm" ? (
            <>
              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/40">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  {isScheduled ? "Cancel today's fast?" : "Cancel this fast?"}
                </h2>
                <p className="text-sm text-white/60">
                  {isScheduled
                    ? "Your scheduled fast won't start automatically today. You can always rebuild your plan."
                    : "Stopping now ends your fast before the target. It will be logged as a partial fast."}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.04] divide-y divide-white/10">
                {stats.map((s) => (
                  <div key={s.label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">{s.label}</span>
                    <span className="text-sm font-semibold text-white">{s.value}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  className="h-12 text-sm font-bold uppercase tracking-widest bg-transparent border border-white/20 text-white hover:bg-white/5"
                  onClick={() => onOpenChange(false)}
                >
                  Keep fast
                </Button>
                <Button variant="destructive" className="h-12 text-sm font-bold uppercase tracking-widest" onClick={onConfirm}>
                  Yes, cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 ring-1 ring-destructive/40">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">Status</p>
                <h2 className="text-2xl font-bold text-foreground">Fast cancelled</h2>
                <p className="text-sm text-white/60">
                  {isScheduled
                    ? "No fast will start today. Nothing was logged."
                    : "Logged as a partial fast — no Fuel Phase was opened."}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.04] divide-y divide-white/10">
                {stats.map((s) => (
                  <div key={s.label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">{s.label}</span>
                    <span className="text-sm font-semibold text-white">{s.value}</span>
                  </div>
                ))}
              </div>

              <Button className="w-full h-12 text-sm font-bold uppercase tracking-widest" onClick={onDone}>
                Back to Today
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
