import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AdaptiveMacroAdjustment {
  id: string;
  client_id: string;
  base_protein: number;
  base_fat: number;
  base_carbs: number;
  base_calories: number;
  adjusted_protein: number;
  adjusted_fat: number;
  adjusted_carbs: number;
  adjusted_calories: number;
  adjustment_reason: string;
  rule_triggered: string;
  macro_adherence_pct: number | null;
  fasting_adherence_pct: number | null;
  daily_score_avg: number | null;
  is_active: boolean;
  applied_at: string;
  expires_at: string | null;
}

/**
 * Returns the active adaptive macros for a client.
 * Falls back to base macro targets if no adaptation exists.
 */
export function useAdaptiveMacros(clientId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["adaptive-macros", clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from("adaptive_macro_adjustments")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("applied_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as AdaptiveMacroAdjustment | null;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  // Subscribe to realtime changes
  const subscribeToChanges = () => {
    if (!clientId) return;

    const channel = supabase
      .channel(`adaptive-macros-${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "adaptive_macro_adjustments",
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["adaptive-macros", clientId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Trigger the adaptive engine for a client
  const triggerAdaptation = useMutation({
    mutationFn: async (targetClientId: string) => {
      const { data, error } = await supabase.functions.invoke("adaptive-macro-engine", {
        body: { client_id: targetClientId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adaptive-macros", clientId] });
    },
  });

  // Get effective macros (adaptive if active, otherwise null — caller uses base)
  const effectiveMacros = query.data
    ? {
        protein: query.data.adjusted_protein,
        fat: query.data.adjusted_fat,
        carbs: query.data.adjusted_carbs,
        calories: query.data.adjusted_calories,
      }
    : null;

  return {
    adjustment: query.data,
    effectiveMacros,
    isLoading: query.isLoading,
    triggerAdaptation,
    subscribeToChanges,
  };
}
