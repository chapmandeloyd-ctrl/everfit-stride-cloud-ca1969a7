import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "./useEffectiveClientId";

interface EngineModeConfig {
  engineMode: string;
  fastingDisabled: boolean;
}

export function useEngineMode() {
  const clientId = useEffectiveClientId();

  const { data, isLoading } = useQuery({
    queryKey: ["engine-mode", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data } = await supabase
        .from("client_feature_settings")
        .select("engine_mode, fasting_enabled")
        .eq("client_id", clientId)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const config: EngineModeConfig = {
    engineMode: data?.engine_mode || "performance",
    fastingDisabled: data?.engine_mode === "athletic" || data?.fasting_enabled === false,
  };

  return { config, isLoading };
}
