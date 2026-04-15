/**
 * KSOM360 Macro Normalization Utility
 * 
 * Ensures all meals have valid, non-zero fat and consistent calories
 * before being saved to the database. Applied on ALL save paths.
 */

export interface RawMacros {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

/**
 * Normalizes macros to guarantee:
 * 1. Fat is never 0 or null (minimum 1g)
 * 2. Calories match the macro formula within 10%
 * 
 * Returns corrected macros ready for DB insert.
 */
export function normalizeMacros(input: RawMacros): RawMacros {
  let { calories, protein, carbs, fats } = input;

  // Ensure no negatives
  protein = Math.max(0, Math.round(protein || 0));
  carbs = Math.max(0, Math.round(carbs || 0));

  // If fat is missing/zero, derive from calories
  if (!fats || fats <= 0) {
    const remaining = calories - (protein * 4 + carbs * 4);
    fats = Math.max(1, Math.round(remaining / 9));
  } else {
    fats = Math.round(fats);
  }

  // Recalculate correct calories from macros
  const expectedCalories = Math.round((protein * 4) + (fats * 9) + (carbs * 4));

  // If mismatch > 10%, auto-correct calories
  const deviation = Math.abs(calories - expectedCalories) / Math.max(expectedCalories, 1);
  if (deviation > 0.10 || !calories || calories <= 0) {
    calories = expectedCalories;
  }

  return { calories, protein, carbs, fats };
}
