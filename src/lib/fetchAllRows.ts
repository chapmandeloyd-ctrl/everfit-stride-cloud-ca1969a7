import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches all rows from a Supabase table, paginating past the 1000-row default limit.
 */
export async function fetchAllExercises(trainerId: string) {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .eq("trainer_id", trainerId)
      .order("name")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (data) {
      allData = allData.concat(data);
    }
    hasMore = (data?.length ?? 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return allData;
}

/**
 * Slim variant for the workout builder library — only the columns the picker actually renders.
 * Skips description/equipment/category/duration_minutes to dramatically reduce payload size.
 */
export async function fetchExercisesForBuilder(trainerId: string) {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name, muscle_group, video_url, image_url, exercise_type, is_unilateral")
      .eq("trainer_id", trainerId)
      .order("name")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (data) allData = allData.concat(data);
    hasMore = (data?.length ?? 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return allData;
}
