import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "./useEffectiveClientId";

/**
 * Returns elapsed hours of the user's active fast (or null if no fast is active).
 * Updates every 30 seconds for a live "current stage" indicator.
 */
export function useActiveFastElapsed() {
  const clientId = useEffectiveClientId();
  const { data } = useQuery({
    queryKey: ["active-fast-elapsed", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("active_fast_start_at")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return data?.active_fast_start_at ?? null;
    },
  });

  const startAt = data ? new Date(data).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startAt) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [startAt]);

  if (!startAt) return { isFasting: false, elapsedHours: 0 } as const;
  const elapsedHours = Math.max(0, (now - startAt) / 3_600_000);
  return { isFasting: true, elapsedHours } as const;
}