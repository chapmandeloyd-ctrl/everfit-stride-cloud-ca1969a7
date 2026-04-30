import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CaloricBurnDay {
  date: string;            // YYYY-MM-DD
  value: number;           // total = active + resting
  active: number;
  resting: number;
  resting_estimated: boolean;
}

export interface CaloricBurnHistory {
  metric: "Caloric Burn";
  unit: "cal";
  days: CaloricBurnDay[];
  bmr_estimated: number | null;
}

export function useCaloricBurnHistory(
  clientId: string | undefined,
  days: number,
  enabled: boolean,
) {
  return useQuery<CaloricBurnHistory>({
    queryKey: ["caloric-burn-history", clientId, days],
    enabled: enabled && !!clientId,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const tzOffsetMin = -new Date().getTimezoneOffset();
      const res = await supabase.functions.invoke("read-health-stats", {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
        body: {
          client_id: clientId,
          mode: "caloric_burn_history",
          days,
          tz_offset: tzOffsetMin,
        },
      });
      if (res.error) throw res.error;
      return res.data as CaloricBurnHistory;
    },
  });
}