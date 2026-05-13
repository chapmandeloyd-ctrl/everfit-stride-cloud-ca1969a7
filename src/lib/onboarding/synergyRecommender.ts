import type { MetabolicInputs, MetabolicSnapshot } from "./metabolicCalc";
import { SYNERGIES, type SynergyKey } from "./synergies";

export function recommendSynergy(
  input: MetabolicInputs,
  snap: MetabolicSnapshot,
): SynergyKey {
  const { activity, goals, age } = input;
  const bmi = snap.bmi;
  const fatLossy = goals.some((g) =>
    ["Fat Loss", "Reduce Belly Fat"].includes(g),
  );

  if (bmi >= 30 || activity === "sedentary" || activity === "lightly") {
    return "metabolic_reset";
  }
  if (bmi >= 25 && bmi < 30 && fatLossy) {
    return "fat_loss_accelerator";
  }
  if ((activity === "highly" || activity === "athlete") && age < 45) {
    return "performance_fuel";
  }
  if (bmi < 25 && goals.includes("Longevity")) {
    return "advanced_metabolic";
  }
  return "fat_loss_accelerator";
}

export { SYNERGIES };
