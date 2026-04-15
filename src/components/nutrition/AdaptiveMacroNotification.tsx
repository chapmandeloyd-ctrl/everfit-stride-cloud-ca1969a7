import { useEffect } from "react";
import { useAdaptiveMacros } from "@/hooks/useAdaptiveMacros";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, Zap } from "lucide-react";

interface Props {
  clientId: string | undefined;
}

const RULE_ICONS: Record<string, typeof TrendingUp> = {
  low_compliance: TrendingUp,
  strong_consistency: TrendingDown,
  weight_stall: TrendingDown,
  tkd_training: Zap,
};

const RULE_COLORS: Record<string, string> = {
  low_compliance: "border-yellow-500/30 bg-yellow-500/5",
  strong_consistency: "border-green-500/30 bg-green-500/5",
  weight_stall: "border-blue-500/30 bg-blue-500/5",
  tkd_training: "border-purple-500/30 bg-purple-500/5",
};

export function AdaptiveMacroNotification({ clientId }: Props) {
  const { adjustment, subscribeToChanges } = useAdaptiveMacros(clientId);

  useEffect(() => {
    const unsub = subscribeToChanges();
    return () => unsub?.();
  }, [clientId]);

  if (!adjustment) return null;

  const Icon = RULE_ICONS[adjustment.rule_triggered] || TrendingUp;
  const colorClass = RULE_COLORS[adjustment.rule_triggered] || "";

  return (
    <Alert className={`${colorClass} mb-4`}>
      <Icon className="h-4 w-4" />
      <AlertDescription className="ml-2">
        <p className="font-semibold text-sm">Your plan adjusted for better results</p>
        <p className="text-xs text-muted-foreground mt-1">{adjustment.adjustment_reason}</p>
        <div className="flex gap-4 mt-2 text-xs">
          <span>P: {adjustment.adjusted_protein}g</span>
          <span>F: {adjustment.adjusted_fat}g</span>
          <span>C: {adjustment.adjusted_carbs}g</span>
          <span>{adjustment.adjusted_calories} cal</span>
        </div>
      </AlertDescription>
    </Alert>
  );
}
