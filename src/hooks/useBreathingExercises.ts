import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BREATHING_EXERCISES,
  type BreathingExercise,
  type BreathingAnimation,
  type MotionProfile,
  type ProtocolTone,
  type BreathPhase,
} from "@/lib/breathingExercises";

export interface DBBreathingExerciseRow {
  id: string;
  trainer_id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  animation: string;
  phases: any;
  tone: any;
  motion: any;
  music_prompt: string;
  default_track_id: string | null;
  hero_image_url: string | null;
  order_index: number;
  is_active: boolean;
}

export function rowToExercise(row: DBBreathingExerciseRow): BreathingExercise {
  return {
    id: row.slug,
    name: row.name,
    description: row.description ?? "",
    phases: (row.phases ?? []) as BreathPhase[],
    animation: (row.animation as BreathingAnimation) ?? "ocean",
    icon: row.icon ?? "🌬️",
    tone: row.tone as ProtocolTone,
    motion: row.motion as MotionProfile,
    musicPrompt: row.music_prompt ?? "",
  };
}

/** Library hook — returns DB exercises merged over the static defaults. */
export function useBreathingExercises() {
  const query = useQuery({
    queryKey: ["breathing-exercises-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("breathing_exercises")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DBBreathingExerciseRow[];
    },
    staleTime: 30_000,
  });

  const dbExercises = (query.data ?? []).map(rowToExercise);
  // If we have any DB exercises, prefer them. Otherwise fall back to hardcoded defaults.
  const exercises: BreathingExercise[] =
    dbExercises.length > 0 ? dbExercises : BREATHING_EXERCISES;

  return { exercises, rows: query.data ?? [], isLoading: query.isLoading };
}

/** Admin variant — includes inactive items and full row data. */
export function useBreathingExercisesAdmin() {
  return useQuery({
    queryKey: ["breathing-exercises-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("breathing_exercises")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DBBreathingExerciseRow[];
    },
  });
}
