import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { validateMacros, type ValidationFlag } from "@/components/nutrition/macroValidator";
import type { CorrectionData } from "@/components/meals/MacroCorrectionDrawer";
import { useToast } from "@/hooks/use-toast";

interface MacroInput {
  name: string;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  keto_types?: string[];
  meal_role?: string;
  source?: string;
  ingredients_text?: string;
  confidence?: "high" | "medium" | "low";
}

interface MacroValues {
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
}

export function useMacroCorrection() {
  const [correctionData, setCorrectionData] = useState<CorrectionData | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  /**
   * Run validation + AI correction. Returns true if correction is needed (drawer will open).
   * Returns false if macros are clean — caller should proceed to log directly.
   */
  const checkAndCorrect = useCallback(async (input: MacroInput): Promise<boolean> => {
    // Step 1: Local validation
    const validation = validateMacros({
      calories: input.calories,
      protein: input.protein,
      fats: input.fats,
      carbs: input.carbs,
      keto_types: input.keto_types,
      meal_role: input.meal_role,
      confidence: input.confidence,
    });

    if (validation.is_valid) {
      return false; // No correction needed
    }

    // Step 2: Call AI correction
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("macro-correction", {
        body: {
          meal_name: input.name,
          calories: input.calories,
          protein: input.protein,
          fats: input.fats,
          carbs: input.carbs,
          keto_types: input.keto_types,
          meal_role: input.meal_role,
          source: input.source || "manual",
          ingredients_text: input.ingredients_text,
        },
      });

      if (error) throw error;

      if (data?.needs_correction) {
        setCorrectionData({
          mealName: input.name,
          source: input.source || "manual",
          original: data.original,
          corrected: data.corrected,
          flags: data.flags as ValidationFlag[],
          suggestion: data.suggestion,
        });
        setShowCorrection(true);
        return true;
      }

      return false;
    } catch (err) {
      console.error("Macro correction failed:", err);
      // Fallback: show local correction
      const expectedCal = Math.round((input.protein * 4) + (input.fats * 9) + (input.carbs * 4));
      setCorrectionData({
        mealName: input.name,
        source: input.source || "manual",
        original: { calories: input.calories, protein: input.protein, fats: input.fats, carbs: input.carbs },
        corrected: {
          calories: expectedCal || input.calories,
          protein: input.protein || 0,
          fats: input.fats || 0,
          carbs: input.carbs || 0,
        },
        flags: validation.validation_flags,
        suggestion: "Review and adjust macros manually for accuracy.",
      });
      setShowCorrection(true);
      return true;
    } finally {
      setIsChecking(false);
    }
  }, []);

  /**
   * Record the user's correction decision for the learning loop.
   */
  const recordCorrection = useCallback(async (
    clientId: string,
    data: CorrectionData,
    action: "accepted" | "edited" | "rejected",
    finalMacros: MacroValues,
  ) => {
    try {
      await supabase.from("macro_corrections" as any).insert({
        client_id: clientId,
        meal_name: data.mealName,
        source: data.source,
        original_calories: data.original.calories,
        original_protein: data.original.protein,
        original_fats: data.original.fats,
        original_carbs: data.original.carbs,
        corrected_calories: data.corrected.calories,
        corrected_protein: data.corrected.protein,
        corrected_fats: data.corrected.fats,
        corrected_carbs: data.corrected.carbs,
        correction_flags: data.flags,
        suggestion_text: data.suggestion,
        user_action: action,
        final_calories: finalMacros.calories,
        final_protein: finalMacros.protein,
        final_fats: finalMacros.fats,
        final_carbs: finalMacros.carbs,
      });
    } catch (err) {
      console.error("Failed to record correction:", err);
    }
  }, []);

  const closeCorrection = useCallback(() => {
    setShowCorrection(false);
    setCorrectionData(null);
  }, []);

  return {
    correctionData,
    showCorrection,
    isChecking,
    checkAndCorrect,
    recordCorrection,
    closeCorrection,
    setShowCorrection,
  };
}
