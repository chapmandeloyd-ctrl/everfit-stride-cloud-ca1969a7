import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AssignedPlanCardProps {
  clientId: string;
}

export function AssignedPlanCard({ clientId }: AssignedPlanCardProps) {
  const navigate = useNavigate();

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

  const { data: ketoAssignment } = useQuery({
    queryKey: ["assigned-plan-keto", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_keto_assignments")
        .select("keto_type_id")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const activeId = featureSettings?.selected_protocol_id || featureSettings?.selected_quick_plan_id;
  const ketoTypeId = ketoAssignment?.keto_type_id;

  // Only show if both protocol and keto type are assigned
  if (!activeId || !ketoTypeId) return null;

  return (
    <Card className="overflow-hidden border-0 shadow-lg relative">
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{
          background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary)/0.6), hsl(var(--primary)))`,
        }}
      />
      <CardContent className="p-5 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Your Complete Plan
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Protocol + Keto Type assigned
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/client/complete-plan")}
            size="sm"
            className="gap-1.5"
          >
            View Program
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
