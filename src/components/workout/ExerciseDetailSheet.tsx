import { useState } from "react";
import { X, Check } from "lucide-react";

export type DetailField = "weight" | "tempo" | "rpe" | "distance";

export const DETAIL_FIELD_OPTIONS: { key: DetailField; label: string; desc: string }[] = [
  { key: "weight", label: "Weight (lbs)", desc: "Target weight for this exercise" },
  { key: "tempo", label: "Tempo", desc: "Movement speed e.g. 3-1-1-0" },
  { key: "rpe", label: "RPE", desc: "Rate of Perceived Exertion (1-10)" },
  { key: "distance", label: "Distance", desc: "Target distance e.g. 400m" },
];

interface ExerciseDetailSheetProps {
  open: boolean;
  activeFields: DetailField[];
  onSave: (fields: DetailField[]) => void;
  onClose: () => void;
}

export function ExerciseDetailSheet({ open, activeFields, onSave, onClose }: ExerciseDetailSheetProps) {
  const [selected, setSelected] = useState<DetailField[]>(activeFields);

  if (!open) return null;

  const toggle = (key: DetailField) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={onClose}>
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
        <span className="text-sm font-semibold text-foreground">Add Details</span>
        <button
          onClick={() => { onSave(selected); onClose(); }}
          className="text-sm font-semibold text-primary"
        >
          Save
        </button>
      </div>

      <div className="flex-1 overflow-auto px-4 pt-4 space-y-1">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Select fields to show
        </p>
        {DETAIL_FIELD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => toggle(opt.key)}
            className="flex items-center justify-between w-full py-3 border-b border-border"
          >
            <div>
              <span className="text-sm text-foreground font-medium">{opt.label}</span>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </div>
            {selected.includes(opt.key) && <Check className="h-4 w-4 text-primary shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
}
