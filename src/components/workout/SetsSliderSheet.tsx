import { useState } from "react";
import { X } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface SetsSliderSheetProps {
  open: boolean;
  value: number;
  onSave: (value: number) => void;
  onClose: () => void;
}

export function SetsSliderSheet({ open, value, onSave, onClose }: SetsSliderSheetProps) {
  const [sets, setSets] = useState(value);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background/95 backdrop-blur-lg rounded-t-2xl px-6 pt-6 pb-10 space-y-6 animate-in slide-in-from-bottom duration-200">
        <button onClick={onClose} className="absolute top-4 left-4 text-muted-foreground">
          <X className="h-5 w-5" />
        </button>
        <button
          onClick={() => { onSave(sets); onClose(); }}
          className="absolute top-4 right-4 text-sm font-semibold text-primary"
        >
          Save
        </button>

        <p className="text-center text-lg font-semibold text-foreground pt-2">{sets} sets</p>

        <Slider
          value={[sets]}
          onValueChange={([v]) => setSets(v)}
          min={1}
          max={20}
          step={1}
          className="w-full"
        />
      </div>
    </div>
  );
}
