import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { toast } from "sonner";

export interface HabitLoopPrefs {
  id?: string;
  client_id: string;
  max_daily_notifications: number;
  reduce_if_ignored: boolean;
  pre_window_enabled: boolean;
  break_fast_enabled: boolean;
  mid_window_enabled: boolean;
  last_meal_enabled: boolean;
  streak_protection_enabled: boolean;
  daily_score_enabled: boolean;
  hydration_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

const DEFAULTS: Omit<HabitLoopPrefs, "client_id"> = {
  max_daily_notifications: 3,
  reduce_if_ignored: true,
  pre_window_enabled: true,
  break_fast_enabled: true,
  mid_window_enabled: true,
  last_meal_enabled: true,
  streak_protection_enabled: true,
  daily_score_enabled: true,
  hydration_enabled: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
};

export function useHabitLoopPreferences() {
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["habit-loop-prefs", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_loop_preferences")
        .select("*")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return (data as HabitLoopPrefs | null) || { ...DEFAULTS, client_id: clientId! };
    },
    enabled: !!clientId,
  });

  const updatePrefs = useMutation({
    mutationFn: async (updates: Partial<HabitLoopPrefs>) => {
      const { error } = await supabase
        .from("habit_loop_preferences")
        .upsert({ ...DEFAULTS, ...prefs, ...updates, client_id: clientId! }, { onConflict: "client_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-loop-prefs", clientId] });
      toast.success("Notification preferences updated");
    },
    onError: () => toast.error("Failed to update preferences"),
  });

  return { prefs, isLoading, updatePrefs: updatePrefs.mutate };
}
