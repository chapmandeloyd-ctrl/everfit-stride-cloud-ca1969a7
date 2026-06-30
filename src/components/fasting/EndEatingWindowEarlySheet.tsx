import { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** ms remaining in the eating window when the sheet opened */
  remainingMs: number;
  windowHours: number;
  /** total elapsed ms inside the eating window so far */
  elapsedMs: number;
  /** Title varies by entry point ("End eating window" vs "Choose next fast") */
  intent: "end_window" | "choose_next_fast";
  onConfirm: (meta: { reason: string; note: string; elapsedHours: number }) => void;
}

const REASONS: { id: string; label: string }[] = [
  { id: "done_eating", label: "Done eating" },
  { id: "not_hungry", label: "Not hungry" },
  { id: "extend_fast", label: "Want to extend my fast" },
  { id: "schedule", label: "Schedule changed" },
  { id: "other", label: "Other" },
];

export function EndEatingWindowEarlySheet({
  open,
  onOpenChange,
  remainingMs,
  windowHours,
  elapsedMs,
  intent,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setReason(null);
      setNote("");
    }
  }, [open]);

  const remainH = Math.floor(remainingMs / 3_600_000);
  const remainM = Math.floor((remainingMs % 3_600_000) / 60_000);
  const elapsedHours = Math.round((elapsedMs / 3_600_000) * 100) / 100;

  const title = intent === "choose_next_fast" ? "Start next fast early?" : "End eating window early?";
  const subtitle =
    remainingMs > 0
      ? `${remainH > 0 ? `${remainH}h ` : ""}${remainM}m left in your ${windowHours}h window`
      : `Your ${windowHours}h window is closing`;

  const handleConfirm = () => {
    onConfirm({
      reason: reason ?? "unspecified",
      note: note.trim(),
      elapsedHours,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-black border-t p-0 max-h-[88vh] overflow-y-auto"
        style={{ borderColor: "hsl(var(--primary) / 0.35)" }}
      >
        <div className="px-5 pt-6 pb-8 max-w-md mx-auto space-y-5">
          <div className="space-y-1.5 text-center">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary"
            >
              Quick check
            </p>
            <h2
              className="text-2xl font-light"
              style={{ fontFamily: "Georgia, serif", color: "hsl(var(--foreground))" }}
            >
              {title}
            </h2>
            <p className="text-xs text-white/60">{subtitle}</p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/50 px-1">
              Why?
            </p>
            {REASONS.map((r) => {
              const selected = reason === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors"
                  style={{
                    borderColor: selected ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.25)",
                    backgroundColor: selected ? "hsl(var(--primary) / 0.12)" : "transparent",
                    color: selected ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                  }}
                >
                  <span className="text-sm flex-1">{r.label}</span>
                  {selected && (
                    <span
                      className="h-2 w-2 rounded-full bg-primary"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              variant="ghost"
              className="h-12 text-sm font-medium uppercase tracking-widest bg-transparent border border-primary/40 text-white hover:bg-primary/5"
              onClick={() => onOpenChange(false)}
            >
              Stay
            </Button>
            <Button
              className="h-12 text-sm font-bold uppercase tracking-widest text-primary-foreground bg-gradient-to-b from-primary via-primary to-primary/80 ring-1 ring-primary/70 shadow-[0_1px_8px_-1px_hsl(var(--primary)/0.55)] hover:brightness-110"
              disabled={!reason}
              onClick={handleConfirm}
            >
              {intent === "choose_next_fast" ? "Choose next fast" : "End window"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}