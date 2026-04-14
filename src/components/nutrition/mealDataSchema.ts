import { z } from "zod";

/**
 * KSOM360 Strict Meal Data Structure
 * 
 * ALL fields are required for a meal to be saved.
 * Any missing field will flag the meal as incomplete.
 */

export const MEAL_INTENSITY_OPTIONS = ["light", "moderate", "heavy", "recovery"] as const;
export const SATIETY_SCORE_RANGE = { min: 1, max: 10 } as const;
export const DIGESTION_LOAD_OPTIONS = ["low", "moderate", "high"] as const;
export const IF_ROLE_OPTIONS = ["break_fast", "mid_window", "last_meal"] as const;
export const KETO_TYPE_OPTIONS = ["SKD", "TKD", "HPKD", "CKD"] as const;
export const MEAL_ROLE_OPTIONS = ["high_protein", "control", "performance", "heavy"] as const;

/**
 * Full strict schema — used for final validation before save.
 * Every field is required. Missing = reject or flag incomplete.
 */
export const strictMealSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(2000),
  
  // IF & Keto classification
  if_roles: z.array(z.string()).min(1, "At least one IF role is required"),
  meal_role: z.string().min(1, "Meal role is required"),
  subtype: z.string().min(1, "Subtype is required"),
  keto_types: z.array(z.string()).min(1, "At least one keto type is required"),
  trigger_conditions: z.array(z.string()).min(1, "At least one trigger condition is required"),
  
  // Nutrition per serving
  calories: z.number().min(0, "Calories required"),
  protein: z.number().min(0, "Protein required"),
  carbs: z.number().min(0, "Carbs required"),
  fats: z.number().min(0, "Fats required"),
  
  // Time & servings
  prep_time_minutes: z.number().min(0, "Prep time required"),
  cook_time_minutes: z.number().min(0, "Cook time required"),
  servings: z.number().min(1, "Servings required"),
  
  // New KSOM360 fields
  meal_intensity: z.string().min(1, "Meal intensity is required"),
  satiety_score: z.number().min(1).max(10, "Satiety score must be 1-10"),
  digestion_load: z.string().min(1, "Digestion load is required"),
  craving_replacement: z.string().min(1, "Craving replacement is required"),
  
  // Coaching notes
  carb_limit_note: z.string().min(1, "Carb limit note is required"),
  protein_target_note: z.string().min(1, "Protein target note is required"),
  
  // Content
  ingredients: z.string().min(1, "Ingredients are required"),
  instructions: z.string().min(1, "Instructions are required"),
  
  // Context
  why_it_works: z.string().min(1, "Why it works is required"),
  best_for: z.array(z.string()).min(1, "At least one best-for item is required"),
  avoid_if: z.array(z.string()).min(1, "At least one avoid-if item is required"),
  meal_timing: z.string().min(1, "Meal timing is required"),
});

export type StrictMealData = z.infer<typeof strictMealSchema>;

/**
 * Validates meal data and returns missing fields list.
 * Returns { valid: true } or { valid: false, missingFields: [...] }
 */
export function validateMealCompleteness(data: Record<string, any>): {
  valid: boolean;
  missingFields: string[];
} {
  const result = strictMealSchema.safeParse(data);
  if (result.success) return { valid: true, missingFields: [] };

  const missingFields = result.error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path || issue.message;
  });

  return { valid: false, missingFields: [...new Set(missingFields)] };
}

/**
 * All required field keys for quick reference / UI mapping.
 */
export const REQUIRED_MEAL_FIELDS = [
  "name",
  "description",
  "if_roles",
  "meal_role",
  "subtype",
  "keto_types",
  "trigger_conditions",
  "calories",
  "protein",
  "carbs",
  "fats",
  "prep_time_minutes",
  "cook_time_minutes",
  "servings",
  "meal_intensity",
  "satiety_score",
  "digestion_load",
  "craving_replacement",
  "carb_limit_note",
  "protein_target_note",
  "ingredients",
  "instructions",
  "why_it_works",
  "best_for",
  "avoid_if",
  "meal_timing",
] as const;
