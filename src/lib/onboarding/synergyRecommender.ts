import type { MetabolicInputs, MetabolicSnapshot } from "./metabolicCalc";
import { SYNERGIES, type SynergyKey } from "./synergies";

export type FastingExperienceLevel = "none" | "casual" | "regular" | "advanced";
export type SafetyFlag =
  | "pregnant_breastfeeding"
  | "disordered_eating_history"
  | "diabetic_blood_sugar_meds"
  | "under_18"
  | "none";

const ORDER: SynergyKey[] = [
  "metabolic_reset",
  "fat_loss_accelerator",
  "advanced_metabolic",
  "performance_fuel",
];

const CEILING: Record<FastingExperienceLevel, SynergyKey> = {
  none: "metabolic_reset",
  casual: "fat_loss_accelerator",
  regular: "advanced_metabolic",
  advanced: "performance_fuel",
};

function capByCeiling(pick: SynergyKey, ceiling: SynergyKey): SynergyKey {
  // performance_fuel sits at index 3 but is fine at any level >= regular
  const pickIdx = ORDER.indexOf(pick);
  const capIdx = ORDER.indexOf(ceiling);
  return pickIdx <= capIdx ? pick : ORDER[capIdx];
}

function hasBlockingSafetyFlag(flags: SafetyFlag[] | undefined): boolean {
  if (!flags) return false;
  return flags.some((f) => f !== "none");
}

export function recommendSynergy(
  input: MetabolicInputs,
  snap: MetabolicSnapshot,
  experience?: FastingExperienceLevel,
  safetyFlags?: SafetyFlag[],
): SynergyKey {
  // Safety override — anything flagged caps at gentle reset
  if (hasBlockingSafetyFlag(safetyFlags)) {
    return "metabolic_reset";
  }

  const { activity, goals, age } = input;
  const bmi = snap.bmi;
  const fatLossy = goals.some((g) =>
    ["Fat Loss", "Reduce Belly Fat"].includes(g),
  );

  let pick: SynergyKey;
  if (bmi >= 30 || activity === "sedentary" || activity === "lightly") {
    pick = "metabolic_reset";
  } else if (bmi >= 25 && bmi < 30 && fatLossy) {
    pick = "fat_loss_accelerator";
  } else if ((activity === "highly" || activity === "athlete") && age < 45) {
    pick = "performance_fuel";
  } else if (bmi < 25 && goals.includes("Longevity")) {
    pick = "advanced_metabolic";
  } else {
    pick = "fat_loss_accelerator";
  }

  if (experience) {
    return capByCeiling(pick, CEILING[experience]);
  }
  return pick;
}

export { SYNERGIES };
