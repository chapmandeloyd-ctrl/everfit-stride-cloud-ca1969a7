import { useState, useEffect } from "react";
import { X, ArrowDown } from "lucide-react";

export type PasteableField = "sets" | "target" | "rest" | "weight" | "tempo" | "rpe" | "distance";

interface PasteFieldsSheetProps {
  open: boolean;
  /** Friendly preview of what will get pasted (e.g. "4 × 10 reps · 60s rest · 135 lbs") */
  sourceSummary?: string;
  /** Friendly name of the row that will receive the values */
  targetName?: string;
  /** Fields that actually have a value on the source — others are disabled */
  availableFields: PasteableField[];
  onConfirm: (fields: PasteableField[]) => void;
  onClose: () => void;
}

const FIELD_LABELS: Record<PasteableField, string> = {
  sets: "Sets",
  target: "Reps / Time / Target",
  rest: "Rest",
  weight: "Weight",
  tempo: "Tempo",
  rpe: "RPE",
  distance: "Distance",
};

export function PasteFieldsSheet({
  open,
  sourceSummary,
  targetName,
  availableFields,
  onConfirm,
  onClose,
}: PasteFieldsSheetProps) {
  const [selected, setSelected] = useState<Set<PasteableField>>(new Set());

  useEffect(() => {
    if (open) {
      // Default: select everything that has a value
      setSelected(new Set(availableFields));
    }
  }, [open, availableFields]);

  if (!open) return null;

  const toggle = (f: PasteableField) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  const allOptions: PasteableField[] = ["sets", "target", "rest", "weight", "tempo", "rpe", "distance"];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background/95 backdrop-blur-lg rounded-t-2xl px-6 pt-6 pb-10 space-y-4 animate-in slide-in-from-bottom duration-200">
        <button onClick={onClose} className="absolute top-4 left-4 text-muted-foreground">
          <X className="h-5 w-5" />
        </button>
        <button
          onClick={() => {
            onConfirm(Array.from(selected));
            onClose();
          }}
          disabled={selected.size === 0}
          className="absolute top-4 right-4 text-sm font-semibold text-primary disabled:text-muted-foreground/40"
        >
          Apply
        </button>

        <div className="text-center pt-2 space-y-1">
          <div className="flex items-center justify-center gap-2 text-foreground font-semibold">
            <ArrowDown className="h-4 w-4 text-primary" />
            <span>Copy details to next row</span>
          </div>
          {sourceSummary && (
            <p className="text-xs text-muted-foreground">{sourceSummary}</p>
          )}
          {targetName && (
            <p className="text-[11px] text-muted-foreground/70">→ {targetName}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          {allOptions.map((f) => {
            const isAvailable = availableFields.includes(f);
            const isSelected = selected.has(f);
            return (
              <button
                key={f}
                onClick={() => isAvailable && toggle(f)}
                disabled={!isAvailable}
                className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left ${
                  !isAvailable
                    ? "border-border/40 text-muted-foreground/40 cursor-not-allowed"
                    : isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center ${
                      !isAvailable
                        ? "border-muted-foreground/30"
                        : isSelected
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {isSelected && isAvailable && (
                      <svg className="h-2.5 w-2.5 text-primary-foreground" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l3.5 3.5L12 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span>{FIELD_LABELS[f]}</span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground/60 text-center pt-1">
          Greyed-out fields have no value on this row.
        </p>
      </div>
    </div>
  );
}
