import { useState } from "react";
import { X } from "lucide-react";

interface RestTimePickerSheetProps {
  open: boolean;
  value: number; // in seconds
  onSave: (seconds: number) => void;
  onClose: () => void;
}

const SECONDS_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const MINUTES_OPTIONS = ["60 s", "90 s", "2 m", "3 m", "4 m", "5 m", "10 m", "15 m", "20 m", "25 m", "30 m"];
const MINUTES_VALUES = [60, 90, 120, 180, 240, 300, 600, 900, 1200, 1500, 1800];

export function RestTimePickerSheet({ open, value, onSave, onClose }: RestTimePickerSheetProps) {
  const [selected, setSelected] = useState(value);

  if (!open) return null;

  const handleSelect = (seconds: number) => {
    setSelected(seconds);
    onSave(seconds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background/95 backdrop-blur-lg rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-200" style={{ maxHeight: "70vh" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground">Rest Time</span>
          <div className="w-5" />
        </div>

        <div className="overflow-auto" style={{ maxHeight: "calc(70vh - 52px)" }}>
          <div className="grid grid-cols-2 gap-0">
            {/* Seconds column */}
            <div className="border-r border-border">
              {SECONDS_OPTIONS.map((s) => (
                <button
                  key={`s-${s}`}
                  onClick={() => handleSelect(s)}
                  className={`w-full py-4 text-center text-lg font-semibold transition-colors ${
                    selected === s
                      ? "text-primary bg-primary/10"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {s} s
                </button>
              ))}
            </div>

            {/* Minutes column */}
            <div>
              {MINUTES_OPTIONS.map((label, i) => (
                <button
                  key={`m-${i}`}
                  onClick={() => handleSelect(MINUTES_VALUES[i])}
                  className={`w-full py-4 text-center text-lg font-semibold transition-colors ${
                    selected === MINUTES_VALUES[i]
                      ? "text-primary bg-primary/10"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* None option */}
          <button
            onClick={() => handleSelect(0)}
            className={`w-full py-4 text-center text-lg font-semibold border-t border-border transition-colors ${
              selected === 0
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            None
          </button>
        </div>
      </div>
    </div>
  );
}
