import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, UtensilsCrossed, Zap, Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientHealthScore } from "@/hooks/useClientHealthScores";

interface Props {
  score: ClientHealthScore;
}

function getScoreColor(value: number): string {
  if (value >= 80) return "text-emerald-600";
  if (value >= 50) return "text-amber-600";
  return "text-destructive";
}

function getBarClass(value: number): string {
  if (value >= 80) return "bg-emerald-500";
  if (value >= 50) return "bg-amber-500";
  return "bg-destructive";
}

export function ClientHealthScorecard({ score }: Props) {
  const overallScore = Math.round(
    (score.macroAdherence * 0.4) +
    (score.fastingConsistency * 0.3) +
    (Math.min(score.mealCompliance * 33, 100) * 0.3)
  );

  return (
    <div className="mt-3 space-y-2.5">
      {/* Quick stats row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center p-2 rounded-lg bg-muted/40">
          <div className="flex items-center justify-center gap-1">
            <Flame className="h-3 w-3 text-amber-500" />
            <span className="text-sm font-bold">{score.streak}</span>
          </div>
          <p className="text-[9px] text-muted-foreground font-semibold uppercase mt-0.5">Streak</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/40">
          <span className={cn("text-sm font-bold", getScoreColor(score.macroAdherence))}>
            {score.macroAdherence}%
          </span>
          <p className="text-[9px] text-muted-foreground font-semibold uppercase mt-0.5">Macros</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/40">
          <div className="flex items-center justify-center gap-1">
            <UtensilsCrossed className="h-3 w-3 text-primary" />
            <span className="text-sm font-bold">{score.mealsLoggedToday}</span>
          </div>
          <p className="text-[9px] text-muted-foreground font-semibold uppercase mt-0.5">Meals</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/40">
          <span className={cn("text-sm font-bold", getScoreColor(score.fastingConsistency))}>
            {score.fastingConsistency}%
          </span>
          <p className="text-[9px] text-muted-foreground font-semibold uppercase mt-0.5">Fasting</p>
        </div>
      </div>

      {/* Macro progress */}
      {score.targetCalories && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground font-semibold">Calories</span>
            <span className="tabular-nums font-medium">
              {score.todayCalories} / {score.targetCalories}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", getBarClass(
                score.targetCalories > 0 ? (score.todayCalories / score.targetCalories) * 100 : 0
              ))}
              style={{ width: `${Math.min((score.todayCalories / (score.targetCalories || 1)) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {score.ketoType && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            {score.ketoType}
          </Badge>
        )}
        {score.protocolName && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            {score.protocolName}
          </Badge>
        )}
        {score.fastingEnabled && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
            Fasting On
          </Badge>
        )}
        <Badge
          variant="outline"
          className={cn("text-[9px] px-1.5 py-0", 
            overallScore >= 80 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" :
            overallScore >= 50 ? "bg-amber-500/10 text-amber-600 border-amber-500/30" :
            "bg-destructive/10 text-destructive border-destructive/30"
          )}
        >
          Score: {overallScore}
        </Badge>
      </div>
    </div>
  );
}
