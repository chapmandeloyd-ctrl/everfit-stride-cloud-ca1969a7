import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, Layers } from "lucide-react";
import { getLevelTier } from "@/lib/ksom360Levels";

interface StatusOverviewPanelProps {
  clientId: string;
}

const ENGINE_CARD_BG: Record<string, string> = {
  metabolic: "bg-teal-500",
  athletic: "bg-blue-500",
};

const ENGINE_LABELS: Record<string, string> = {
  metabolic: "KSOM-360",
  athletic: "Athletic",
};

function getLevelBand(level: number): string {
  const { tier } = getLevelTier(level);
  return `${level} (${tier})`;
}

export function StatusOverviewPanel({ clientId }: StatusOverviewPanelProps) {
  const { data } = useQuery({
    queryKey: ["cc-status-overview", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("engine_mode, current_level")
        .eq("client_id", clientId)
        .maybeSingle();
      return {
        engineMode: data?.engine_mode || "metabolic",
        currentLevel: data?.current_level || 1,
      };
    },
  });

  if (!data) return null;

  const { engineMode, currentLevel } = data;
  const cardBg = ENGINE_CARD_BG[engineMode] || "bg-teal-500";

  return (
    <Card className={`${cardBg} border-0`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-white">
          <Gauge className="h-4 w-4" />
          Status Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white p-3 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-widest text-gray-500">Engine</p>
            <p className="text-sm font-bold text-gray-900">{ENGINE_LABELS[engineMode] || engineMode}</p>
          </div>

          <div className="rounded-lg bg-white p-3 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-widest text-gray-500 flex items-center gap-1">
              <Layers className="h-3 w-3" /> Level
            </p>
            <p className="text-sm font-bold text-gray-900">{getLevelBand(currentLevel)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
