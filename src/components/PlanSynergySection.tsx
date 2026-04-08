import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { usePlanSynergy } from "@/hooks/usePlanSynergy";

interface PlanSynergySectionProps {
  protocolType: "program" | "quick_plan" | null;
  protocolId: string | null;
  ketoTypeId: string | null;
}

export function PlanSynergySection({ protocolType, protocolId, ketoTypeId }: PlanSynergySectionProps) {
  const { data: synergy, isLoading } = usePlanSynergy(protocolType, protocolId, ketoTypeId);

  if (!protocolId || !ketoTypeId || !protocolType) return null;

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5 flex items-center justify-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Generating metabolic synergy analysis...</span>
        </CardContent>
      </Card>
    );
  }

  if (!synergy?.synergy_text) return null;

  return (
    <Card className="overflow-hidden border-primary/25 relative">
      {/* Gradient accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-orange-500 to-red-500" />
      <CardContent className="p-5 pt-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Protocol + Keto Synergy
          </h3>
        </div>
        <p className="text-[15px] leading-relaxed text-foreground">
          {synergy.synergy_text}
        </p>
      </CardContent>
    </Card>
  );
}
