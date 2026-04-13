import { useEffect, useState } from "react";
import { X, TrendingUp, AlertTriangle, CheckCircle, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface CoachFeedbackBannerProps {
  totals: MacroTotals;
  targets: MacroTargets;
  lastMeal?: { calories: number; protein: number; carbs: number; fats: number } | null;
  show: boolean;
  onDismiss: () => void;
}

function generateFeedback(
  totals: MacroTotals,
  targets: MacroTargets
): { message: string; type: "success" | "warning" | "alert" } | null {
  const proteinPct = targets.protein > 0 ? totals.protein / targets.protein : 1;
  const carbsPct = targets.carbs > 0 ? totals.carbs / targets.carbs : 0;
  const fatPct = targets.fats > 0 ? totals.fats / targets.fats : 0;

  // Carbs exceeded
  if (carbsPct > 1) {
    return {
      message: "You're over carbs — tighten next meal.",
      type: "alert",
    };
  }

  // Fat too high
  if (fatPct > 1.1) {
    return {
      message: "Fat is high — go lighter next meal.",
      type: "warning",
    };
  }

  // Protein low (under 60% through the day)
  if (proteinPct < 0.4) {
    return {
      message: "Protein is low — increase next meal.",
      type: "warning",
    };
  }

  // Perfect match
  if (proteinPct >= 0.8 && proteinPct <= 1.2 && carbsPct <= 1 && fatPct <= 1.1) {
    return {
      message: "Perfect macro match — stay on track.",
      type: "success",
    };
  }

  // On track
  if (proteinPct >= 0.5 && carbsPct <= 0.9) {
    return {
      message: "Good progress — keep it going.",
      type: "success",
    };
  }

  return null;
}

export function CoachFeedbackBanner({ totals, targets, show, onDismiss }: CoachFeedbackBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [show]);

  const feedback = generateFeedback(totals, targets);
  if (!feedback || !visible) return null;

  const config = {
    success: {
      bg: "bg-emerald-500/10 border-emerald-500/30",
      icon: <CheckCircle className="h-4 w-4 text-emerald-400" />,
    },
    warning: {
      bg: "bg-amber-500/10 border-amber-500/30",
      icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
    },
    alert: {
      bg: "bg-destructive/10 border-destructive/30",
      icon: <Flame className="h-4 w-4 text-destructive" />,
    },
  }[feedback.type];

  return (
    <div
      className={cn(
        "mx-4 mb-3 rounded-xl border p-3 flex items-center gap-2 animate-in slide-in-from-top-2 duration-300",
        config.bg
      )}
    >
      {config.icon}
      <p className="text-xs font-medium flex-1">{feedback.message}</p>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onDismiss}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
