import { useState } from "react";
import { X } from "lucide-react";

interface RestTimePickerSheetProps {
  open: boolean;
  value: number;
  onSave: (seconds: number) => void;
  onClose: () => void;
}

const SECONDS_COL = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const MINUTES_COL = [
  { label: "60 s", value: 60 },
  { label: "90 s", value: 90 },
  { label: "2 m", value: 120 },
  { label: "3 m", value: 180 },
  { label: "4 m", value: 240 },
  { label: "5 m", value: 300 },
  { label: "10 m", value: 600 },
  { label: "15 m", value: 900 },
  { label: "20 m", value: 1200 },
  { label: "25 m", value: 1500 },
  { label: "30 m", value: 1800 },
];

export function RestTimePickerSheet({ open, value, onSave, onClose }: RestTimePickerSheetProps) {
  if (!open) return null;

  const handleSelect = (seconds: number) => {
    onSave(seconds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end animate-in fade-in duration-150">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Picker content - positioned over the bottom toolbar area */}
      <div className="relative z-10 w-full" style={{ marginBottom: "0" }}>
        {/* Two-column grid */}
        <div
          className="grid grid-cols-2 overflow-auto"
          style={{ maxHeight: "65vh", backgroundColor: "rgba(30, 30, 30, 0.95)" }}
        >
          {/* Seconds column */}
          <div className="border-r border-white/10">
            {SECONDS_COL.map((s) => (
              <button
                key={`s-${s}`}
                onClick={() => handleSelect(s)}
                className={`w-full py-4 text-center text-xl font-semibold transition-colors ${
                  value === s
                    ? "text-primary"
                    : "text-white/80 active:bg-white/10"
                }`}
              >
                {s} s
              </button>
            ))}
          </div>

          {/* Minutes column */}
          <div>
            {MINUTES_COL.map((m) => (
              <button
                key={`m-${m.value}`}
                onClick={() => handleSelect(m.value)}
                className={`w-full py-4 text-center text-xl font-semibold transition-colors ${
                  value === m.value
                    ? "text-primary"
                    : "text-white/80 active:bg-white/10"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* None option */}
        <button
          onClick={() => handleSelect(0)}
          className={`w-full py-4 text-center text-xl font-semibold border-t border-white/10 transition-colors ${
            value === 0 ? "text-primary" : "text-white/60 active:bg-white/10"
          }`}
          style={{ backgroundColor: "rgba(30, 30, 30, 0.95)" }}
        >
          None
        </button>
      </div>
    </div>
  );
}
