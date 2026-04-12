import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dumbbell, Repeat, Timer, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BuildWorkoutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WORKOUT_TYPES = [
  { label: "Regular", value: "regular", icon: Dumbbell },
  { label: "Circuit", value: "circuit", icon: Repeat },
  { label: "Superset", value: "superset", icon: Layers },
  { label: "Interval", value: "interval", icon: Timer },
] as const;

export function BuildWorkoutSheet({ open, onOpenChange }: BuildWorkoutSheetProps) {
  const navigate = useNavigate();

  const handleSelect = (type: string) => {
    onOpenChange(false);
    navigate(`/client/wod-builder?type=${type}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-8">
        <SheetHeader className="px-6 pb-2">
          <SheetTitle className="text-center text-base font-semibold">
            Build your workout
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col">
          {WORKOUT_TYPES.map((type, i) => (
            <button
              key={type.value}
              onClick={() => handleSelect(type.value)}
              className="flex items-center gap-3 px-6 py-4 text-left text-sm font-medium text-foreground hover:bg-muted/50 active:bg-muted transition-colors border-b border-border last:border-b-0"
            >
              {type.label}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
