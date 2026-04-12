import { useState } from "react";
import { X, Check } from "lucide-react";

interface SetTargetSheetProps {
  open: boolean;
  value: string;
  onSave: (value: string) => void;
  onClose: () => void;
}

export function SetTargetSheet({ open, value, onSave, onClose }: SetTargetSheetProps) {
  const [targetType, setTargetType] = useState<"text" | "time">("text");
  const [textValue, setTextValue] = useState(value === "10" ? "" : value);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={onClose}>
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
        <span className="text-sm font-semibold text-foreground">Set target</span>
        <button
          onClick={() => {
            const val = targetType === "text" ? (textValue.trim() || "10") : textValue.trim();
            onSave(val);
            onClose();
          }}
          className="text-sm font-semibold text-primary"
        >
          Save
        </button>
      </div>

      <div className="flex-1 overflow-auto px-4 pt-4 space-y-6">
        {/* Target type */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Target Type
          </p>
          <button
            onClick={() => setTargetType("text")}
            className="flex items-center justify-between w-full py-3 border-b border-border"
          >
            <span className="text-sm text-foreground">Text</span>
            {targetType === "text" && <Check className="h-4 w-4 text-primary" />}
          </button>
          <button
            onClick={() => setTargetType("time")}
            className="flex items-center justify-between w-full py-3 border-b border-border"
          >
            <span className="text-sm text-foreground">Time</span>
            {targetType === "time" && <Check className="h-4 w-4 text-primary" />}
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          Targets are displayed beside each exercise. They provide the client with additional instructions for the exercise.
        </p>

        {/* Input */}
        <div>
          <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
            What should the target be?
          </p>
          {targetType === "text" ? (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Text target</p>
              <input
                type="text"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="reps, weight, tempo, etc"
                className="w-full bg-transparent border-b border-border pb-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
              />
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Time target</p>
              <input
                type="text"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="e.g. 30s, 1m, 2:00"
                className="w-full bg-transparent border-b border-border pb-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
