import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";

export interface GoalMotivation {
  id: string;
  client_id: string;
  trainer_id: string | null;
  goal_id: string | null;
  why_text: string | null;
  why_image_url: string | null;
  why_audio_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches the most recent goal motivation for the active client.
 * Falls back to most-recent if no goal_id match.
 */
export function useGoalMotivation(goalId?: string | null) {
  const clientId = useEffectiveClientId();

  return useQuery({
    queryKey: ["goal-motivation", clientId, goalId ?? "any"],
    enabled: !!clientId,
    queryFn: async (): Promise<GoalMotivation | null> => {
      let q = supabase
        .from("goal_motivations")
        .select("*")
        .eq("client_id", clientId!)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (goalId) q = q.eq("goal_id", goalId);

      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data as GoalMotivation | null;
    },
  });
}

interface SaveMotivationInput {
  id?: string;
  goal_id?: string | null;
  trainer_id?: string | null;
  why_text?: string | null;
  why_image_url?: string | null;
  why_audio_url?: string | null;
}

export function useSaveMotivation() {
  const qc = useQueryClient();
  const clientId = useEffectiveClientId();

  return useMutation({
    mutationFn: async (input: SaveMotivationInput) => {
      if (!clientId) throw new Error("No client id");

      if (input.id) {
        const { data, error } = await supabase
          .from("goal_motivations")
          .update({
            why_text: input.why_text,
            why_image_url: input.why_image_url,
            why_audio_url: input.why_audio_url,
          })
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("goal_motivations")
        .insert({
          client_id: clientId,
          trainer_id: input.trainer_id ?? null,
          goal_id: input.goal_id ?? null,
          why_text: input.why_text ?? null,
          why_image_url: input.why_image_url ?? null,
          why_audio_url: input.why_audio_url ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goal-motivation"] });
    },
  });
}
