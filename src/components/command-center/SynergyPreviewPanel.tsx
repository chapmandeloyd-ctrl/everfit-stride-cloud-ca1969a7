import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCw, Zap } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlanSynergy } from "@/hooks/usePlanSynergy";
import { toast } from "sonner";

interface SynergyPreviewPanelProps {
  clientId: string;
  trainerId: string;
}

export function SynergyPreviewPanel({ clientId, trainerId }: SynergyPreviewPanelProps) {
  const queryClient = useQueryClient();

  // Fetch client's active protocol/quick plan
  const { data: featureSettings } = useQuery({
    queryKey: ["synergy-panel-settings", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, selected_quick_plan_id")
        .eq("client_id", clientId)
        .maybeSingle();
      return data;
    },
  });

  // Fetch active keto assignment
  const { data: ketoAssignment } = useQuery({
    queryKey: ["synergy-panel-keto", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_keto_assignments")
        .select("keto_type_id, keto_types(abbreviation, name, color)")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
  });

  // Fetch protocol/plan name
  const protocolId = featureSettings?.selected_protocol_id;
  const quickPlanId = featureSettings?.selected_quick_plan_id;
  const activeProtocolId = protocolId || quickPlanId;
  const protocolType = protocolId ? "program" as const : quickPlanId ? "quick_plan" as const : null;

  const { data: protocolInfo } = useQuery({
    queryKey: ["synergy-panel-protocol-info", activeProtocolId, protocolType],
    queryFn: async () => {
      if (protocolType === "program") {
        const { data } = await supabase
          .from("fasting_protocols")
          .select("name, fast_target_hours")
          .eq("id", activeProtocolId!)
          .maybeSingle();
        return data;
      }
      const { data } = await supabase
        .from("quick_fasting_plans")
        .select("name, fast_hours")
        .eq("id", activeProtocolId!)
        .maybeSingle();
      return data ? { name: data.name, fast_target_hours: data.fast_hours } : null;
    },
    enabled: !!activeProtocolId && !!protocolType,
  });

  const ketoTypeId = ketoAssignment?.keto_type_id || null;
  const ketoType = ketoAssignment?.keto_types as { abbreviation: string; name: string; color: string } | null;

  const { data: synergy, isLoading: synergyLoading } = usePlanSynergy(
    protocolType,
    activeProtocolId || null,
    ketoTypeId,
  );

  // Regenerate mutation
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      if (!activeProtocolId || !ketoTypeId || !protocolType) throw new Error("Missing assignments");
      // Delete cached version first
      await supabase
        .from("plan_synergy_content")
        .delete()
        .eq("protocol_type", protocolType)
        .eq("protocol_id", activeProtocolId)
        .eq("keto_type_id", ketoTypeId);
      // Regenerate
      const { data, error } = await supabase.functions.invoke("generate-plan-synergy", {
        body: { protocol_type: protocolType, protocol_id: activeProtocolId, keto_type_id: ketoTypeId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-synergy"] });
      toast.success("Synergy content regenerated!");
    },
    onError: () => toast.error("Failed to regenerate synergy"),
  });

  const hasBoth = !!activeProtocolId && !!ketoTypeId;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Protocol + Keto Synergy</h3>
              <p className="text-[11px] text-muted-foreground">AI-generated metabolic synergy</p>
            </div>
          </div>
          {hasBoth && synergy && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
            >
              <RefreshCw className={`h-3 w-3 ${regenerateMutation.isPending ? "animate-spin" : ""}`} />
              Regenerate
            </Button>
          )}
        </div>

        {/* Assignment status */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Protocol</p>
            {protocolInfo ? (
              <p className="text-sm font-bold truncate">{protocolInfo.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Not assigned</p>
            )}
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Keto Type</p>
            {ketoType ? (
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black" style={{ color: ketoType.color }}>{ketoType.abbreviation}</span>
                <span className="text-xs text-muted-foreground truncate">{ketoType.name}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Not assigned</p>
            )}
          </div>
        </div>

        {/* Synergy content */}
        {!hasBoth && (
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <Zap className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Assign both a protocol and keto type to auto-generate the metabolic synergy description.
            </p>
          </div>
        )}

        {hasBoth && synergyLoading && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Generating synergy content...</span>
          </div>
        )}

        {hasBoth && synergy?.synergy_text && !synergyLoading && (
          <div className="relative rounded-lg overflow-hidden border border-primary/20">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-orange-500 to-red-500" />
            <div className="p-4 pt-5">
              <Badge variant="secondary" className="text-[10px] mb-2">
                CLIENT PREVIEW
              </Badge>
              <p className="text-sm leading-relaxed text-foreground">{synergy.synergy_text}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
