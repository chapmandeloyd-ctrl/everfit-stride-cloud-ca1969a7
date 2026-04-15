import { useState } from "react";
import { X } from "lucide-react";
import { DetailField } from "./ExerciseDetailSheet";

interface DetailValueSheetProps {
  open: boolean;
  field: DetailField;
  value: string;
  onSave: (value: string) => void;
  onClose: () => void;
}

const fieldConfig: Record<DetailField, { label: string; placeholder: string; type: string }> = {
  weight: { label: "Weight (lbs)", placeholder: "e.g. 135", type: "number" },
  tempo: { label: "Tempo", placeholder: "e.g. 3-1-1-0", type: "text" },
  rpe: { label: "RPE (1-10)", placeholder: "e.g. 8", type: "number" },
  distance: { label: "Distance", placeholder: "e.g. 400m, 1 mile", type: "text" },
};

export function DetailValueSheet({ open, field, value, onSave, onClose }: DetailValueSheetProps) {
  const [inputValue, setInputValue] = useState(value);
  const config = fieldConfig[field];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={onClose}>
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
        <span className="text-sm font-semibold text-foreground">{config.label}</span>
        <button
          onClick={() => { onSave(inputValue.trim()); onClose(); }}
          className="text-sm font-semibold text-primary"
        >
          Save
        </button>
      </div>

      <div className="flex-1 overflow-auto px-4 pt-6">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
          {config.label}
        </p>
        <input
          type={config.type}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={config.placeholder}
          className="w-full bg-transparent border-b border-border pb-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
          autoFocus
        />
      </div>
    </div>
  );
}
