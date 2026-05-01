import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { isToday, parseISO } from "date-fns";

export type FastingState = "fasting_active" | "break_fast_triggered" | "eating_window_open" | "eating_window_closing" | "idle";
export type EatingPhase = "break_fast" | "mid_window" | "last_meal" | null;
export type TrainingState = "no_training" | "training_today" | "post_workout";

export interface MealEngineState {
  fasting_state: FastingState;
  eating_phase: EatingPhase;
  training_state: TrainingState;
  keto_type: string | null; // e.g. "SKD", "HPKD", "TKD", "CKD"
  goal: string | null;
  isLoading: boolean;
  // Raw data for downstream use
  macroTargets: { calories: number | null; protein: number | null; carbs: number | null; fats: number | null } | null;
  eatingWindowEndsAt: string | null;
  fastingEnabled: boolean;
  /** True if the user has ever started or completed a fast */
  hasEverFasted: boolean;
}

export function useMealEngineState(): MealEngineState {
  const clientId = useEffectiveClientId();

  const { data, isLoading } = useQuery({
    queryKey: ["meal-engine-state", clientId],
    queryFn: async () => {
      const [settingsRes, ketoRes, macroRes, workoutsRes, sessionsRes] = await Promise.all([
        supabase
          .from("client_feature_settings")
          .select("fasting_enabled, active_fast_start_at, active_fast_target_hours, last_fast_ended_at, eating_window_ends_at, eating_window_hours, protocol_start_date, last_fast_completed_at")
          .eq("client_id", clientId!)
          .maybeSingle(),
        supabase
          .from("client_keto_assignments")
          .select("keto_type_id, keto_types (abbreviation, name)")
          .eq("client_id", clientId!)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("client_macro_targets")
          .select("target_protein, target_fats, target_carbs, target_calories, diet_style")
          .eq("client_id", clientId!)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("client_workouts")
          .select("id, scheduled_date, completed_at")
          .eq("client_id", clientId!)
          .gte("scheduled_date", new Date().toISOString().split("T")[0])
          .lte("scheduled_date", new Date().toISOString().split("T")[0]),
        supabase
          .from("workout_sessions")
          .select("id, completed_at, status")
          .eq("client_id", clientId!)
          .gte("completed_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
          .not("completed_at", "is", null),
      ]);

      return {
        settings: settingsRes.data,
        keto: ketoRes.data,
        macros: macroRes.data,
        workouts: workoutsRes.data || [],
        sessions: sessionsRes.data || [],
      };
    },
    enabled: !!clientId,
    refetchInterval: 30000, // Re-check every 30s for real-time state
  });

  if (isLoading || !data) {
    return {
      fasting_state: "idle",
      eating_phase: null,
      training_state: "no_training",
      keto_type: null,
      goal: null,
      isLoading: true,
      macroTargets: null,
      eatingWindowEndsAt: null,
      fastingEnabled: false,
      hasEverFasted: false,
    };
  }

  const { settings, keto, macros, workouts, sessions } = data;

  // --- Fasting State ---
  let fasting_state: FastingState = "idle";
  const fastingEnabled = settings?.fasting_enabled ?? false;

  if (fastingEnabled) {
    const now = new Date();
    const hasActiveFast = !!settings?.active_fast_start_at;
    const eatingWindowEnd = settings?.eating_window_ends_at ? new Date(settings.eating_window_ends_at) : null;
    const lastFastEnded = settings?.last_fast_ended_at ? new Date(settings.last_fast_ended_at) : null;

    if (hasActiveFast) {
      fasting_state = "fasting_active";
    } else if (lastFastEnded && isToday(lastFastEnded)) {
      // Fast ended today — determine eating window phase
      if (eatingWindowEnd) {
        const msUntilClose = eatingWindowEnd.getTime() - now.getTime();
        const minutesUntilClose = msUntilClose / 60000;

        if (minutesUntilClose <= 0) {
          fasting_state = "idle"; // Window closed, next fast cycle
        } else if (minutesUntilClose <= 60) {
          fasting_state = "eating_window_closing";
        } else {
          // Check if just broke fast (within first 30 min)
          const minSinceFastEnd = (now.getTime() - lastFastEnded.getTime()) / 60000;
          if (minSinceFastEnd <= 30) {
            fasting_state = "break_fast_triggered";
          } else {
            fasting_state = "eating_window_open";
          }
        }
      } else {
        // No eating window is active. This covers early-ended fasts and explicit skip-Fuel flows.
        fasting_state = "idle";
      }
    }
  }

  // --- Eating Phase ---
  let eating_phase: EatingPhase = null;
  if (fasting_state === "break_fast_triggered") {
    eating_phase = "break_fast";
  } else if (fasting_state === "eating_window_closing") {
    eating_phase = "last_meal";
  } else if (fasting_state === "eating_window_open") {
    eating_phase = "mid_window";
  }

  // --- Training State ---
  let training_state: TrainingState = "no_training";
  const todayWorkouts = workouts || [];
  const completedSessions = sessions || [];

  if (completedSessions.length > 0) {
    training_state = "post_workout";
  } else if (todayWorkouts.length > 0) {
    const anyCompleted = todayWorkouts.some((w: any) => w.completed_at);
    training_state = anyCompleted ? "post_workout" : "training_today";
  }

  // --- Keto Type ---
  const ketoAbbrev = (keto as any)?.keto_types?.abbreviation || null;

  // --- Goal (inferred from diet_style or macro ratio) ---
  let goal: string | null = macros?.diet_style || null;
  if (!goal && macros) {
    const p = macros.target_protein || 0;
    const c = macros.target_carbs || 0;
    if (p >= 150 || (macros.target_calories && p * 4 / macros.target_calories > 0.35)) {
      goal = "performance";
    } else if (c <= 20) {
      goal = "fat_loss";
    }
  }

  // Determine if user has ever engaged with fasting
  const hasEverFasted = !!(
    settings?.protocol_start_date ||
    settings?.last_fast_completed_at ||
    settings?.last_fast_ended_at ||
    settings?.active_fast_start_at
  );

  return {
    fasting_state,
    eating_phase,
    training_state,
    keto_type: ketoAbbrev,
    goal,
    isLoading: false,
    macroTargets: macros ? {
      calories: macros.target_calories,
      protein: macros.target_protein,
      carbs: macros.target_carbs,
      fats: macros.target_fats,
    } : null,
    eatingWindowEndsAt: settings?.eating_window_ends_at || null,
    fastingEnabled,
    hasEverFasted,
  };
}
