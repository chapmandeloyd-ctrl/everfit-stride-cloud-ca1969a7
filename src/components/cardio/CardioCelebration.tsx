import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { getIconComponent } from "./cardioActivities";

interface CardioCelebrationProps {
  activityLabel: string;
  iconName: string;
  duration: string;
  onComplete: () => void;
}

export function CardioCelebration({ activityLabel, iconName, duration, onComplete }: CardioCelebrationProps) {
  const [phase, setPhase] = useState<"celebrate" | "summary">("celebrate");
  const Icon = getIconComponent(iconName);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("summary"), 2000);
    const t2 = setTimeout(() => onComplete(), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
      {phase === "celebrate" ? (
        <div className="flex flex-col items-center animate-scale-in">
          <div className="text-7xl mb-6">👍</div>
          <h1 className="text-3xl font-bold text-foreground">Awesome!</h1>
        </div>
      ) : (
        <div className="flex flex-col items-center animate-fade-in">
          <div className="w-28 h-28 rounded-full bg-emerald-500 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-14 w-14 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">{activityLabel}</h1>
          <p className="text-muted-foreground text-base mb-8">Completed</p>
          <div className="flex justify-between w-64">
            <span className="text-base font-medium text-foreground">Time</span>
            <span className="text-base text-muted-foreground">{duration}</span>
          </div>
        </div>
      )}
    </div>
  );
}
