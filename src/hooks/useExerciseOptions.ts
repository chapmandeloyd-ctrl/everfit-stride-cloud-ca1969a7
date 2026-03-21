import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useExerciseOptions() {
  const { user } = useAuth();

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ["exercises", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("trainer_id", user!.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const muscleGroups = [...new Set(exercises.map((e: any) => e.muscle_group).filter(Boolean))];
  const equipmentTypes = [...new Set(exercises.map((e: any) => e.equipment).filter(Boolean))];
  const categories = [...new Set(exercises.map((e: any) => e.category).filter(Boolean))];

  return { exercises, isLoading, muscleGroups, equipmentTypes, categories };
}
