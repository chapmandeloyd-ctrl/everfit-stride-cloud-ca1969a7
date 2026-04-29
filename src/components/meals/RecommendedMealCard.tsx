import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, Clock, Plus, Lock } from "lucide-react";
import { MacroPercentBar } from "@/components/nutrition/MacroPercentBar";

interface MealData {
  id: string;
  name: string;
  image_url?: string;
  protein?: number;
  carbs?: number;
  fats?: number;
  calories?: number;
  prep_time_minutes?: number;
  pick_label?: string | null;
  pick_slot?: number | null;
  score?: number;
  keto_types?: string[] | null;
}

interface RecommendedMealCardProps {
  meal: MealData;
  rank?: number;
  onSelect: () => void;
  onViewDetail: () => void;
  isLogging?: boolean;
  locked?: boolean;
  unlockAt?: number | null;
}

function getMealBadges(meal: MealData, rank?: number) {
  const badges: { label: string; className: string }[] = [];
  if (rank === 1) badges.push({ label: "Best Choice", className: "bg-primary/15 text-primary border-primary/30" });
  if (meal.protein && meal.protein >= 30) badges.push({ label: "High Protein", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" });
  if (meal.prep_time_minutes && meal.prep_time_minutes <= 10) badges.push({ label: "Fast Prep", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" });
  return badges;
}

export function RecommendedMealCard({ meal, rank, onSelect, onViewDetail, isLogging, locked, unlockAt }: RecommendedMealCardProps) {
  const badges = getMealBadges(meal, rank);

  return (
    <Card
      className={`rounded-2xl overflow-hidden border-border transition-all relative ${locked ? "opacity-50" : "hover:border-primary/40 active:scale-[0.98]"}`}
      onClick={() => !locked && onViewDetail()}
    >
      {locked && (
        <div className="absolute inset-0 z-10 backdrop-blur-[3px] bg-background/50 flex flex-col items-center justify-center gap-1.5 rounded-2xl">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">
            Unlock at {unlockAt}-day streak
          </span>
        </div>
      )}
      <CardContent className="p-0">
        <div className="flex gap-3 p-3">
          {/* Image */}
          <div className="h-20 w-20 shrink-0 rounded-xl bg-muted overflow-hidden">
            {meal.image_url ? (
              <img src={meal.image_url} alt={meal.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-2xl">🍽️</div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {badges.map((b) => (
                    <Badge key={b.label} variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${b.className}`}>
                      {b.label}
                    </Badge>
                  ))}
                </div>
              )}
              <h3 className="text-sm font-bold truncate">{meal.name}</h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
              {meal.protein != null && <span className="font-semibold text-blue-400">P: {meal.protein}g</span>}
              {meal.carbs != null && <span className="font-semibold text-emerald-400">C: {meal.carbs}g</span>}
              {meal.prep_time_minutes != null && (
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" /> {meal.prep_time_minutes}m
                </span>
              )}
            </div>
            <MacroPercentBar
              variant="compact"
              className="mt-1"
              macros={{
                calories: meal.calories,
                protein: meal.protein,
                fats: meal.fats,
                carbs: meal.carbs,
              }}
              ketoTypes={meal.keto_types}
            />
          </div>

          {/* CTA */}
          {!locked && (
            <Button
              size="sm"
              className="shrink-0 self-center h-9 px-3 rounded-xl text-xs font-bold"
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
              disabled={isLogging}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Select
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
