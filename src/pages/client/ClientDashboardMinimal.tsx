import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FastingProtocolCard } from "./ClientDashboard";
import { SmartPaceBanner } from "@/components/smart-pace/SmartPaceBanner";

/**
 * Minimal client dashboard — Fasting + Weight only.
 * All other client features intentionally hidden.
 */
export default function ClientDashboardMinimal() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();

  // Latest weight entry for quick display
  const { data: latestWeight } = useQuery({
    queryKey: ["latest-weight-minimal", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data: defs } = await supabase
        .from("metric_definitions")
        .select("id")
        .eq("name", "Weight")
        .eq("is_default", true)
        .limit(1);
      const defId = defs?.[0]?.id;
      if (!defId) return null;
      const { data: cm } = await supabase
        .from("client_metrics")
        .select("id")
        .eq("client_id", clientId)
        .eq("metric_definition_id", defId)
        .limit(1);
      const cmId = cm?.[0]?.id;
      if (!cmId) return null;
      const { data: entries } = await supabase
        .from("metric_entries")
        .select("value, recorded_at")
        .eq("client_metric_id", cmId)
        .order("recorded_at", { ascending: false })
        .limit(1);
      return entries?.[0] ?? null;
    },
    enabled: !!clientId,
  });

  return (
    <ClientLayout>
      <div className="p-4 space-y-4 pb-24">
        {/* Fasting timer / protocol */}
        <FastingProtocolCard clientId={clientId} navigate={navigate} />

        {/* Smart Pace banner if enabled (no-ops to null otherwise) */}
        <SmartPaceBanner />

        {/* Weight tracker entry point */}
        <Card
          className="overflow-hidden border-primary/20 cursor-pointer hover:bg-accent/30 transition-colors"
          onClick={() => navigate("/client/health")}
        >
          <CardContent className="px-5 py-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Scale className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Weight</p>
              <p className="text-base font-bold">
                {latestWeight?.value != null ? `${latestWeight.value} lbs` : "Log your first weigh-in"}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate("/client/health")}
        >
          Open Weight Tracker
        </Button>
      </div>
    </ClientLayout>
  );
}