import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook for tracking meal behavior signals for the adaptive learning engine.
 * Call these methods at the appropriate interaction points in the UI.
 */
export function useAdaptiveMealTracking(clientId: string | undefined) {
  /** Track when meals are shown to the user */
  const trackMealsShown = useCallback(
    async (count: number) => {
      if (!clientId) return;
      await supabase.functions.invoke("adaptive-meal-engine", {
        body: { action: "track_behavior", client_id: clientId, data: { meals_shown: count } },
      });
    },
    [clientId]
  );

  /** Track when user selects a meal */
  const trackMealSelected = useCallback(
    async (recipeId: string) => {
      if (!clientId) return;
      await Promise.all([
        supabase.functions.invoke("adaptive-meal-engine", {
          body: { action: "track_behavior", client_id: clientId, data: { meals_selected: 1 } },
        }),
        supabase.functions.invoke("adaptive-meal-engine", {
          body: { action: "track_meal_interaction", client_id: clientId, data: { recipe_id: recipeId, interaction: "selected" } },
        }),
      ]);
    },
    [clientId]
  );

  /** Track when user completes/finishes a meal */
  const trackMealCompleted = useCallback(
    async (recipeId: string) => {
      if (!clientId) return;
      await Promise.all([
        supabase.functions.invoke("adaptive-meal-engine", {
          body: { action: "track_behavior", client_id: clientId, data: { meals_completed: 1 } },
        }),
        supabase.functions.invoke("adaptive-meal-engine", {
          body: { action: "track_meal_interaction", client_id: clientId, data: { recipe_id: recipeId, interaction: "completed" } },
        }),
      ]);
    },
    [clientId]
  );

  /** Track individual meal being shown */
  const trackMealShownInteraction = useCallback(
    async (recipeId: string) => {
      if (!clientId) return;
      await supabase.functions.invoke("adaptive-meal-engine", {
        body: { action: "track_meal_interaction", client_id: clientId, data: { recipe_id: recipeId, interaction: "shown" } },
      });
    },
    [clientId]
  );

  /** Track coach pick usage */
  const trackCoachPickUsed = useCallback(
    async () => {
      if (!clientId) return;
      await supabase.functions.invoke("adaptive-meal-engine", {
        body: { action: "track_behavior", client_id: clientId, data: { coach_picks_used: 1 } },
      });
    },
    [clientId]
  );

  /** Track manual meal entry */
  const trackManualEntry = useCallback(
    async () => {
      if (!clientId) return;
      await supabase.functions.invoke("adaptive-meal-engine", {
        body: { action: "track_behavior", client_id: clientId, data: { manual_meal_entries: 1 } },
      });
    },
    [clientId]
  );

  /** Track barcode scan */
  const trackBarcodeScan = useCallback(
    async () => {
      if (!clientId) return;
      await supabase.functions.invoke("adaptive-meal-engine", {
        body: { action: "track_behavior", client_id: clientId, data: { barcode_scans: 1 } },
      });
    },
    [clientId]
  );

  /** Track AI photo log */
  const trackAiPhotoLog = useCallback(
    async () => {
      if (!clientId) return;
      await supabase.functions.invoke("adaptive-meal-engine", {
        body: { action: "track_behavior", client_id: clientId, data: { ai_photo_logs: 1 } },
      });
    },
    [clientId]
  );

  /** Track hunger levels */
  const trackHunger = useCallback(
    async (phase: "break_fast" | "mid_window" | "last_meal", level: number) => {
      if (!clientId) return;
      const key = `hunger_${phase}`;
      await supabase.functions.invoke("adaptive-meal-engine", {
        body: { action: "track_behavior", client_id: clientId, data: { [key]: level } },
      });
    },
    [clientId]
  );

  /** Track macro compliance (call at end of day or after meal logging) */
  const trackMacroCompliance = useCallback(
    async (data: { protein_target_hit: boolean; carbs_exceeded: boolean; fat_deviation: number }) => {
      if (!clientId) return;
      await supabase.functions.invoke("adaptive-meal-engine", {
        body: { action: "track_behavior", client_id: clientId, data },
      });
    },
    [clientId]
  );

  /** Track fasting behavior */
  const trackFasting = useCallback(
    async (data: { fast_completed?: boolean; fast_broken_early?: boolean; fasting_window_adherence?: number }) => {
      if (!clientId) return;
      await supabase.functions.invoke("adaptive-meal-engine", {
        body: { action: "track_behavior", client_id: clientId, data },
      });
    },
    [clientId]
  );

  return {
    trackMealsShown,
    trackMealSelected,
    trackMealCompleted,
    trackMealShownInteraction,
    trackCoachPickUsed,
    trackManualEntry,
    trackBarcodeScan,
    trackAiPhotoLog,
    trackHunger,
    trackMacroCompliance,
    trackFasting,
  };
}
