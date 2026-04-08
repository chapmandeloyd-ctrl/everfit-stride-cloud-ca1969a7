import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SynergyContent {
  protocol_name: string;
  keto_type_name: string;
  synergy_text: string;
}

/**
 * Hook that fetches (or generates via AI) the synergy content
 * for a given protocol + keto type pairing.
 * Results are cached in the database — AI only runs once per unique combo.
 */
export function usePlanSynergy(
  protocolType: "program" | "quick_plan" | null,
  protocolId: string | null,
  ketoTypeId: string | null,
) {
  return useQuery<SynergyContent | null>({
    queryKey: ["plan-synergy", protocolType, protocolId, ketoTypeId],
    queryFn: async () => {
      if (!protocolId || !ketoTypeId || !protocolType) return null;

      // Try cache first (instant)
      const { data: cached } = await supabase
        .from("plan_synergy_content")
        .select("protocol_name, keto_type_name, synergy_text")
        .eq("protocol_type", protocolType)
        .eq("protocol_id", protocolId)
        .eq("keto_type_id", ketoTypeId)
        .maybeSingle();

      if (cached) return cached;

      // Generate via edge function
      const { data, error } = await supabase.functions.invoke("generate-plan-synergy", {
        body: {
          protocol_type: protocolType,
          protocol_id: protocolId,
          keto_type_id: ketoTypeId,
        },
      });

      if (error) {
        console.error("Synergy generation error:", error);
        return null;
      }

      return data?.synergy as SynergyContent | null;
    },
    enabled: !!protocolId && !!ketoTypeId && !!protocolType,
    staleTime: 60 * 60 * 1000, // 1 hour — content is cached in DB anyway
    retry: 1,
  });
}
