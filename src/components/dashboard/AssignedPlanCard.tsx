import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Sparkles, Zap, Loader2 } from "lucide-react";
import { usePlanSynergy } from "@/hooks/usePlanSynergy";
import { useNavigate } from "react-router-dom";

interface AssignedPlanCardProps {
  clientId: string;
}

export function AssignedPlanCard({ clientId }: AssignedPlanCardProps) {
  const navigate = useNavigate();

  // Get feature settings to find assigned protocol + keto type
  const { data: featureSettings } = useQuery({
    queryKey: ["assigned-plan-card", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, selected_quick_plan_id")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Get active keto assignment
  const { data: ketoAssignment } = useQuery({
    queryKey: ["assigned-plan-keto", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_keto_assignments")
        .select("keto_type_id, keto_types (id, name, abbreviation, color)")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!clientId,
  });

  // Get protocol name
  const protocolId = featureSettings?.selected_protocol_id;
  const quickPlanId = featureSettings?.selected_quick_plan_id;
  const isQuickPlan = !protocolId && !!quickPlanId;
  const activeId = protocolId || quickPlanId;

  const { data: protocolData } = useQuery({
    queryKey: ["assigned-plan-protocol", activeId, isQuickPlan],
    queryFn: async () => {
      if (isQuickPlan) {
        const { data, error } = await supabase
          .from("quick_fasting_plans")
          .select("id, name")
          .eq("id", quickPlanId!)
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("fasting_protocols")
          .select("id, name, fast_target_hours")
          .eq("id", protocolId!)
          .single();
        if (error) throw error;
        return data;
      }
    },
    enabled: !!activeId,
  });

  const ketoTypeId = ketoAssignment?.keto_type_id || null;
  const protocolType = protocolId ? "program" : quickPlanId ? "quick_plan" : null;

  // Get synergy text
  const { data: synergy, isLoading: synergyLoading } = usePlanSynergy(
    protocolType,
    activeId || null,
    ketoTypeId
  );

  // Only show if both protocol and keto type are assigned
  if (!activeId || !ketoTypeId) return null;

  const ketoType = ketoAssignment?.keto_types;
  const themeColor = ketoType?.color || "#ef4444";

  return (
    <Card className="overflow-hidden border-0 shadow-lg relative">
      {/* Top gradient accent */}
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{
          background: `linear-gradient(90deg, hsl(var(--primary)), ${themeColor}, hsl(var(--primary)))`,
        }}
      />
      <CardContent className="p-5 pt-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Your Complete Plan
          </p>
        </div>

        {/* Protocol + Keto Type Pills */}
        <div className="space-y-2.5">
          {/* Protocol */}
          <button
            onClick={() => {
              if (isQuickPlan) {
                navigate(`/client/quick-plan/${quickPlanId}`);
              } else {
                navigate(`/client/protocol/${protocolId}`);
              }
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/30 transition-all text-left"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Fasting Protocol
              </p>
              <p className="text-sm font-bold truncate">{protocolData?.name || "Loading..."}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>

          {/* Keto Type */}
          <button
            onClick={() => navigate(`/client/keto-type/${ketoTypeId}`)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/30 transition-all text-left"
          >
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <span className="text-xs font-black" style={{ color: themeColor }}>
                {ketoType?.abbreviation || "K"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Keto Type
              </p>
              <p className="text-sm font-bold truncate">{ketoType?.name || "Loading..."}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </div>

        {/* Synergy Section */}
        {synergyLoading ? (
          <div className="flex items-center justify-center gap-2 py-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Generating metabolic synergy...</span>
          </div>
        ) : synergy?.synergy_text ? (
          <div className="rounded-xl bg-muted/40 p-4 space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Protocol + Keto Synergy
              </p>
            </div>
            <p className="text-[13px] leading-relaxed text-foreground/90">
              {synergy.synergy_text}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
