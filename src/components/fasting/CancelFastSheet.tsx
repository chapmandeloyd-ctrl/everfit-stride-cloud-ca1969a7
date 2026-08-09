import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, XCircle, SkipForward, Clock, CalendarPlus } from "lucide-react";
import { useState } from "react";

export interface CancelFastStat {
  label: string;
  value: string;
}

export type CancelAction = "skip" | "reschedule" | "push";

const REASONS = [
  "Not feeling well",
  "Social event / meal out",
  "Travel",
  "Too hungry / low energy",
  "Work schedule",
  "Just need a break",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "scheduled" = fast never started, "active" = a running fast was stopped early */
  variant: "scheduled" | "active";
  /** Parent-controlled: warning → make-up options → cancelled status view */
  stage: "confirm" | "options" | "summary";
  stats: CancelFastStat[];
  onConfirm?: () => void;
  /** Called from the options stage with the chosen make-up path + reason */
  onAction?: (action: CancelAction, reason: string, newStartTime?: string) => void;
  /** Default value for the "start later today" time picker (HH:MM) */
  defaultStartTime?: string;
  summaryTitle?: string;
  summaryBody?: string;
  onDone: () => void;
}

/**
 * Full slide-up sheet used for BOTH cancelling a scheduled fast and stopping an
 * active fast early. Stage 1 warns, stage 2 shows the cancelled status + stats
 * and returns the user to the Today screen.
 */
export function CancelFastSheet({
  open,
  onOpenChange,
  variant,
  stage,
  stats,
  onConfirm,
  onAction,
  defaultStartTime = "12:00",
  summaryTitle,
  summaryBody,
  onDone,
}: Props) {
  const isScheduled = variant === "scheduled";
  const [reason, setReason] = useState<string>("");
  const [customReason, setCustomReason] = useState("");
  const [newTime, setNewTime] = useState(defaultStartTime);
  const finalReason = (customReason.trim() || reason).trim();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-black border-t p-0 max-h-[92vh] overflow-y-auto"
        style={{ borderColor: "hsl(var(--primary) / 0.35)" }}
      >
        <div className="px-5 pt-7 pb-9 max-w-md mx-auto space-y-6">
          {stage === "options" ? (
            <>
              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/40">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Can&apos;t fast right now?</h2>
                <p className="text-sm text-white/60">
                  Pick how you want to make it up. Today still counts toward your score either way.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">Why?</p>
                <div className="flex flex-wrap gap-2">
                  {REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(reason === r ? "" : r)}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                        reason === r
                          ? "border-primary bg-primary/20 text-white"
                          : "border-white/15 bg-white/[0.04] text-white/70"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <Input
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Add your own reason (optional)"
                  className="h-10 bg-white/[0.04] border-white/15 text-sm text-white placeholder:text-white/35"
                />
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => onAction?.("skip", finalReason)}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] p-4 text-left hover:bg-white/[0.07]"
                >
                  <p className="flex items-center gap-2 text-sm font-bold text-white">
                    <SkipForward className="h-4 w-4 text-primary" /> Skip today
                  </p>
                  <p className="mt-1 text-[11px] text-white/55">No fast today. Your plan stays on the same dates.</p>
                </button>

                <div className="rounded-xl border border-white/15 bg-white/[0.04] p-4 space-y-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-bold text-white">
                      <Clock className="h-4 w-4 text-primary" /> Start later today
                    </p>
                    <p className="mt-1 text-[11px] text-white/55">Move today&apos;s start time — same fast, later clock.</p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="h-10 flex-1 bg-black/50 border-white/15 text-sm text-white"
                    />
                    <Button className="h-10" onClick={() => onAction?.("reschedule", finalReason, newTime)}>
                      Reschedule
                    </Button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onAction?.("push", finalReason)}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] p-4 text-left hover:bg-white/[0.07]"
                >
                  <p className="flex items-center gap-2 text-sm font-bold text-white">
                    <CalendarPlus className="h-4 w-4 text-primary" /> Push my plan forward a day
                  </p>
                  <p className="mt-1 text-[11px] text-white/55">
                    Everything shifts one day later so you don&apos;t lose a day of the program.
                  </p>
                </button>
              </div>

              <Button
                variant="ghost"
                className="w-full h-11 text-sm font-bold uppercase tracking-widest bg-transparent border border-white/20 text-white hover:bg-white/5"
                onClick={() => onOpenChange(false)}
              >
                Keep fast
              </Button>
            </>
          ) : stage === "confirm" ? (
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
                <h2 className="text-2xl font-bold text-foreground">{summaryTitle ?? "Fast cancelled"}</h2>
                <p className="text-sm text-white/60">
                  {summaryBody ??
                    (isScheduled
                    ? "No fast will start today. Nothing was logged."
                    : "Logged as a partial fast — no Fuel Phase was opened.")}
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
