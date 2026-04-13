import { Badge } from "@/components/ui/badge";
import type { EatingPhase } from "@/hooks/useMealEngineState";

interface MealContextHeaderProps {
  eatingPhase: EatingPhase;
  ketoType: string | null;
  macroTargets: { calories: number | null; protein: number | null; carbs: number | null; fats: number | null } | null;
}

const PHASE_CONFIG: Record<string, { label: string; emoji: string }> = {
  break_fast: { label: "Break Fast", emoji: "🌅" },
  mid_window: { label: "Mid Window", emoji: "☀️" },
  last_meal: { label: "Last Meal", emoji: "🌙" },
};

export function MealContextHeader({ eatingPhase, ketoType, macroTargets }: MealContextHeaderProps) {
  const phase = PHASE_CONFIG[eatingPhase || ""] || { label: "Meal Time", emoji: "🍽️" };

  return (
    <div className="px-5 py-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-lg">{phase.emoji}</span>
        <h2 className="text-base font-extrabold tracking-tight">{phase.label}</h2>
        {ketoType && (
          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-semibold">
            {ketoType}
          </Badge>
        )}
      </div>
      {macroTargets && (
        <p className="text-[11px] text-muted-foreground">
          Target:{" "}
          {macroTargets.protein && <span className="font-medium text-foreground">{macroTargets.protein}g Protein</span>}
          {macroTargets.carbs != null && (
            <span> | ≤<span className="font-medium text-foreground">{macroTargets.carbs}g Carbs</span></span>
          )}
          {macroTargets.fats != null && (
            <span> | <span className="font-medium text-foreground">{macroTargets.fats}g Fat</span></span>
          )}
        </p>
      )}
    </div>
  );
}
