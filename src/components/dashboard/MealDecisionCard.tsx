import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Utensils, SlidersHorizontal } from "lucide-react";
import { useMealEngineState } from "@/hooks/useMealEngineState";
import { useNavigate } from "react-router-dom";

/**
 * Meal Decision Card — only renders during eating window.
 * Shows "What should you eat?" with CTAs to view/customize meals.
 */
export function MealDecisionCard() {
  const { fasting_state, eating_phase, keto_type, macroTargets, isLoading } = useMealEngineState();
  const navigate = useNavigate();

  // Only show during eating window states
  const isEatingWindow = fasting_state === "eating_window_open" || fasting_state === "eating_window_closing" || fasting_state === "break_fast_triggered";
  if (isLoading || !isEatingWindow) return null;

  const phaseLabel = eating_phase === "break_fast" ? "Break Fast" : eating_phase === "mid_window" ? "Mid Window" : eating_phase === "last_meal" ? "Last Meal" : "Meal Time";

  return (
    <Card className="border-border/60 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {phaseLabel}
            </p>
            <h3 className="text-base font-bold mt-0.5">What should you eat?</h3>
          </div>
          <div className="flex items-center gap-2">
            {keto_type && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                {keto_type}
              </span>
            )}
          </div>
        </div>

        {macroTargets && (
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            {macroTargets.protein && <span>P: <span className="font-semibold text-foreground">{macroTargets.protein}g</span></span>}
            {macroTargets.fats && <span>F: <span className="font-semibold text-foreground">{macroTargets.fats}g</span></span>}
            {macroTargets.carbs && <span>C: <span className="font-semibold text-foreground">{macroTargets.carbs}g</span></span>}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            className="flex-1 h-10 text-sm font-semibold"
            onClick={() => navigate("/client/meal-results")}
          >
            <Utensils className="h-4 w-4 mr-1.5" />
            View Meals
          </Button>
          <Button
            variant="outline"
            className="h-10 text-sm"
            onClick={() => navigate("/client/meal-selection")}
          >
            <SlidersHorizontal className="h-4 w-4 mr-1.5" />
            Customize
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
