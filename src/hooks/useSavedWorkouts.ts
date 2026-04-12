import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";

export function useSavedWorkouts() {
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();

  const { data: savedWorkouts = [], isLoading } = useQuery({
    queryKey: ["saved-workouts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_workouts")
        .select(`
          id,
          workout_plan_id,
          saved_at,
          workout_plans!inner (
            id,
            name,
            duration_minutes,
            category
          )
        `)
        .eq("client_id", clientId)
        .order("saved_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  const isSaved = (workoutPlanId: string) =>
    savedWorkouts.some((sw: any) => sw.workout_plan_id === workoutPlanId);

  const toggleSave = useMutation({
    mutationFn: async (workoutPlanId: string) => {
      if (isSaved(workoutPlanId)) {
        const { error } = await supabase
          .from("saved_workouts")
          .delete()
          .eq("client_id", clientId)
          .eq("workout_plan_id", workoutPlanId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_workouts")
          .insert({ client_id: clientId, workout_plan_id: workoutPlanId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-workouts", clientId] });
    },
  });

  return { savedWorkouts, isLoading, isSaved, toggleSave };
}
