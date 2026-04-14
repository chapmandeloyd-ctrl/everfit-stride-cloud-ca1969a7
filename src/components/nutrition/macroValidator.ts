/**
 * KSOM360 Macro Validation Engine
 * 
 * Validates macro accuracy, keto compliance, profile matching,
 * and flags meals that fail integrity checks.
 */

export type ValidationFlag =
  | "missing_calories"
  | "missing_protein"
  | "missing_fat"
  | "missing_carbs"
  | "calorie_mismatch"
  | "protein_excessive"
  | "fat_excessive"
  | "carbs_excessive_keto"
  | "keto_violation_skd"
  | "keto_violation_hpkd"
  | "keto_violation_tkd"
  | "profile_mismatch"
  | "low_confidence"
  | "incomplete_macros";

export interface MacroValidationResult {
  is_valid: boolean;
  validation_flags: ValidationFlag[];
  suggested_corrections?: {
    calories?: number;
    protein?: number;
    fats?: number;
    carbs?: number;
  };
  warnings: string[];
}

interface MacroInput {
  calories?: number | null;
  protein?: number | null;
  fats?: number | null;
  carbs?: number | null;
  keto_types?: string[] | null;
  meal_role?: string | null;
  confidence?: "high" | "medium" | "low" | null;
  training_state?: boolean;
}

const CALORIE_DEVIATION_THRESHOLD = 0.10; // 10%

/**
 * Core validation — runs all checks and returns flags + suggestions.
 */
export function validateMacros(input: MacroInput): MacroValidationResult {
  const flags: ValidationFlag[] = [];
  const warnings: string[] = [];
  let suggestedCorrections: MacroValidationResult["suggested_corrections"] = undefined;

  const cal = input.calories ?? null;
  const pro = input.protein ?? null;
  const fat = input.fats ?? null;
  const carb = input.carbs ?? null;

  // ── 1. Required field check ──
  if (cal === null || cal === undefined) flags.push("missing_calories");
  if (pro === null || pro === undefined) flags.push("missing_protein");
  if (fat === null || fat === undefined) flags.push("missing_fat");
  if (carb === null || carb === undefined) flags.push("missing_carbs");

  const hasMacros = pro !== null && fat !== null && carb !== null && cal !== null;

  if (!hasMacros) {
    flags.push("incomplete_macros");
    warnings.push("One or more macro fields are missing — this meal cannot be validated.");
    return { is_valid: false, validation_flags: flags, warnings };
  }

  // ── 2. Calorie consistency check ──
  const expectedCal = Math.round((pro! * 4) + (fat! * 9) + (carb! * 4));
  const deviation = Math.abs(cal! - expectedCal) / Math.max(expectedCal, 1);

  if (deviation > CALORIE_DEVIATION_THRESHOLD) {
    flags.push("calorie_mismatch");
    warnings.push(
      `Calorie mismatch: listed ${cal} cal but macros calculate to ${expectedCal} cal (${Math.round(deviation * 100)}% off).`
    );
    suggestedCorrections = { ...suggestedCorrections, calories: expectedCal };
  }

  // ── 3. Range checks ──
  if (pro! > 150) {
    flags.push("protein_excessive");
    warnings.push(`Protein is unusually high at ${pro}g per serving.`);
  }
  if (fat! > 120) {
    flags.push("fat_excessive");
    warnings.push(`Fat is unusually high at ${fat}g per serving.`);
  }

  // ── 4. Keto type validation ──
  const ketoTypes = input.keto_types ?? [];

  if (ketoTypes.includes("SKD") && carb! > 10) {
    flags.push("keto_violation_skd");
    warnings.push(`SKD violation: carbs are ${carb}g (max 10g allowed).`);
  }
  if (ketoTypes.includes("HPKD") && carb! > 20) {
    flags.push("keto_violation_hpkd");
    warnings.push(`HPKD violation: carbs are ${carb}g (max 20g allowed).`);
  }
  if (ketoTypes.includes("TKD") && carb! > 50 && !input.training_state) {
    flags.push("keto_violation_tkd");
    warnings.push(`TKD violation: carbs (${carb}g) only allowed during training windows.`);
  }

  // Keto general carb check
  if (ketoTypes.length > 0 && carb! > 100) {
    flags.push("carbs_excessive_keto");
    warnings.push(`Carbs (${carb}g) are far too high for any keto protocol.`);
  }

  // ── 5. Macro profile match ──
  const mealRole = input.meal_role ?? "";
  if (mealRole === "high_protein" && pro! < fat! && pro! < carb!) {
    flags.push("profile_mismatch");
    warnings.push(`Labeled "high protein" but protein (${pro}g) is not the dominant macro.`);
  }
  if (mealRole === "high_fat" && fat! < pro! && fat! < carb!) {
    flags.push("profile_mismatch");
    warnings.push(`Labeled "high fat" but fat (${fat}g) is not the dominant macro.`);
  }
  if (mealRole === "performance" && carb! < pro! && carb! < fat!) {
    flags.push("profile_mismatch");
    warnings.push(`Labeled "performance" but carbs (${carb}g) are not elevated.`);
  }

  // ── 6. AI confidence check ──
  if (input.confidence === "low") {
    flags.push("low_confidence");
    warnings.push("AI confidence is low — manual review required before logging.");
  }

  return {
    is_valid: flags.length === 0,
    validation_flags: flags,
    suggested_corrections: suggestedCorrections,
    warnings,
  };
}

/**
 * Quick check if a meal should be blocked from scoring/recommendations.
 */
export function isMealSafeForEngine(flags: ValidationFlag[]): boolean {
  const blockingFlags: ValidationFlag[] = [
    "missing_calories",
    "missing_protein",
    "missing_fat",
    "missing_carbs",
    "incomplete_macros",
    "calorie_mismatch",
    "keto_violation_skd",
    "keto_violation_hpkd",
  ];
  return !flags.some((f) => blockingFlags.includes(f));
}

/**
 * Human-readable label for a validation flag.
 */
export const FLAG_LABELS: Record<ValidationFlag, string> = {
  missing_calories: "Missing calories",
  missing_protein: "Missing protein",
  missing_fat: "Missing fat",
  missing_carbs: "Missing carbs",
  calorie_mismatch: "Calorie mismatch",
  protein_excessive: "Protein unusually high",
  fat_excessive: "Fat unusually high",
  carbs_excessive_keto: "Carbs too high for keto",
  keto_violation_skd: "SKD carb violation",
  keto_violation_hpkd: "HPKD carb violation",
  keto_violation_tkd: "TKD carb violation (non-training)",
  profile_mismatch: "Profile mismatch",
  low_confidence: "Low AI confidence",
  incomplete_macros: "Incomplete macro data",
};
