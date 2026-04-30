import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MetricHistoryDay {
  date: string; // YYYY-MM-DD (client local)
  value: number;
  recorded_at: string;
}

export interface MetricHistoryResponse {
  metric: string;
  unit: string | null;
  days: MetricHistoryDay[];
}

/**
 * Fetches a daily series for one named metric (e.g. "Steps") via the
 * `read-health-stats` edge function in `metric_history` mode.
 */
export function useMetricHistory(
  clientId: string | undefined,
  metricName: string,
  days: number,
  enabled = true,
) {
  const { user, loading } = useAuth();
  const tzOffset = -new Date().getTimezoneOffset();

  return useQuery({
    queryKey: ["metric-history", clientId, metricName, days],
    enabled: !!clientId && !!metricName && !loading && !!user && enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<MetricHistoryResponse> => {
      const empty: MetricHistoryResponse = { metric: metricName, unit: null, days: [] };
      if (!clientId) return empty;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return empty;

      const res = await supabase.functions.invoke("read-health-stats", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          client_id: clientId,
          mode: "metric_history",
          metric_name: metricName,
          days,
          tz_offset: tzOffset,
        },
      });
      if (res.error) throw res.error;
      return (res.data as MetricHistoryResponse) ?? empty;
    },
  });
}
