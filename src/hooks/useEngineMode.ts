import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "./useEffectiveClientId";

interface EngineModeConfig {
  engineMode: string;
  fastingDisabled: boolean;
  features: any;
}

export function useEngineMode() {
  const clientId = useEffectiveClientId();

  const { data, isLoading } = useQuery({
    queryKey: ["engine-mode", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data } = await supabase
        .from("client_feature_settings")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const engineMode = data?.engine_mode || "performance";
  const config: EngineModeConfig = {
    engineMode,
    fastingDisabled: data?.engine_mode === "athletic" || data?.fasting_enabled === false,
    features: data,
  };

  return { config, engineMode, isLoading };
}
