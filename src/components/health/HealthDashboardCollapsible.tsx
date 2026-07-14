import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MyProgressSection } from "@/components/MyProgressSection";
import { CollapsibleTile } from "@/components/client/CollapsibleTile";

interface Props {
  clientId: string;
}

interface MetricSnapshot {
  value: number;
  date: string;
}

/**
 * Collapsible wrapper for the Health Dashboard.
 * Front of card = at-a-glance: steps · sleep · calories.
 * Tap to expand → full MyProgressSection (AI Snapshot, Manual Tracking, all tiles).
 */
export function HealthDashboardCollapsible({ clientId }: Props) {
  const { user, loading } = useAuth();

  const { data: metrics } = useQuery({
    queryKey: ["health-activity-metrics-summary", clientId],
    enabled: !!clientId && !loading && !!user,
    queryFn: async (): Promise<Record<string, MetricSnapshot>> => {
      if (!clientId) return {};
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return {};
      const response = await supabase.functions.invoke("read-health-stats", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { client_id: clientId, mode: "metric_summary" },
      });
      if (response.error) throw response.error;
      return (response.data?.metrics ?? {}) as Record<string, MetricSnapshot>;
    },
    refetchOnMount: "always",
    staleTime: 0,
  });

  const stepsRaw = metrics?.["Steps"]?.value;
  const sleepRaw = metrics?.["Sleep"]?.value;
  const calRaw = metrics?.["Caloric Intake"]?.value;

  const steps =
    stepsRaw !== undefined && stepsRaw !== null
      ? Number(stepsRaw).toLocaleString()
      : "--";
  const sleep =
    sleepRaw !== undefined && sleepRaw !== null
      ? `${Number(sleepRaw).toFixed(1)}h`
      : "--";
  const calories =
    calRaw !== undefined && calRaw !== null
      ? `${Math.round(Number(calRaw)).toLocaleString()} cal`
      : "-- cal";

  return (
    <CollapsibleTile
      icon={Heart}
      title="Health Dashboard"
      summary={`${steps} steps · ${sleep} sleep · ${calories}`}
      iconTone="danger"
      storageKey="health-dashboard"
    >
      <MyProgressSection clientId={clientId} />
    </CollapsibleTile>
  );
}
