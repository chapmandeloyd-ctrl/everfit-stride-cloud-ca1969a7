import type { MetabolicInputs, MetabolicSnapshot } from "./metabolicCalc";
import { SYNERGIES, type SynergyKey } from "./synergies";

export type FastingExperienceLevel = "none" | "casual" | "regular" | "advanced";
export type FastingTolerance = "easy" | "manageable" | "challenging" | "difficult";
export type SafetyFlag =
  | "pregnant_breastfeeding"
  | "disordered_eating_history"
  | "diabetic_blood_sugar_meds"
  | "under_18"
  | "none";

export interface FastingRecommendationProfile {
  experienceLevel?: FastingExperienceLevel;
  longestFastHours?: number | null;
  tolerance?: FastingTolerance | null;
  safetyFlags?: SafetyFlag[];
}

const ORDER: SynergyKey[] = [
  "metabolic_reset",
  "fat_loss_accelerator",
  "advanced_metabolic",
  "performance_fuel",
];

function clampOrdinal(value: number): number {
  return Math.max(0, Math.min(ORDER.length - 1, value));
}

function toOrdinal(key: SynergyKey): number {
  return ORDER.indexOf(key);
}

function fromOrdinal(value: number): SynergyKey {
  return ORDER[clampOrdinal(value)];
}

function clampByRange(target: SynergyKey, floor: SynergyKey, ceiling: SynergyKey): SynergyKey {
  const targetIdx = toOrdinal(target);
  const floorIdx = toOrdinal(floor);
  const ceilingIdx = toOrdinal(ceiling);
  return fromOrdinal(Math.max(floorIdx, Math.min(targetIdx, ceilingIdx)));
}

function hasBlockingSafetyFlag(flags: SafetyFlag[] | undefined): boolean {
  if (!flags) return false;
  return flags.some((f) => f !== "none");
}

function getExperienceFloor(profile?: FastingRecommendationProfile): SynergyKey {
  if (!profile?.experienceLevel) return "metabolic_reset";

  let readiness =
    {
      none: 0,
      casual: 1,
      regular: 3,
      advanced: 4,
    }[profile.experienceLevel] ?? 0;

  const longest = profile.longestFastHours ?? 0;
  if (longest >= 16) readiness += 1;
  if (longest >= 20) readiness += 1;

  if (profile.tolerance === "easy") readiness += 1;
  if (profile.tolerance === "challenging") readiness -= 1;
  if (profile.tolerance === "difficult") readiness -= 2;

  if (readiness <= 1) return "metabolic_reset";
  if (readiness <= 4) return "fat_loss_accelerator";
  return "advanced_metabolic";
}

function getExperienceCeiling(profile?: FastingRecommendationProfile): SynergyKey {
  if (!profile?.experienceLevel) return "performance_fuel";

  let ceiling =
    {
      none: 0,
      casual: 1,
      regular: 2,
      advanced: 3,
    }[profile.experienceLevel] ?? 0;

  const longest = profile.longestFastHours ?? 0;
  if (ceiling > 1 && longest < 16) ceiling = 1;
  if (ceiling > 2 && longest < 20) ceiling = 2;

  if (profile.tolerance === "challenging") ceiling -= 1;
  if (profile.tolerance === "difficult") ceiling -= 2;

  return fromOrdinal(ceiling);
}

function getExperienceTarget(profile?: FastingRecommendationProfile): SynergyKey {
  if (!profile?.experienceLevel) return "fat_loss_accelerator";

  let target =
    {
      none: 0,
      casual: 1,
      regular: 2,
      advanced: 3,
    }[profile.experienceLevel] ?? 1;

  const longest = profile.longestFastHours ?? 0;
  if (longest >= 16) target += 1;
  if (longest >= 20) target += 1;

  if (profile.tolerance === "easy") target += 1;
  if (profile.tolerance === "challenging") target -= 1;
  if (profile.tolerance === "difficult") target -= 2;

  return fromOrdinal(target);
}

function getPhysiologyCeiling(input: MetabolicInputs, snap: MetabolicSnapshot): SynergyKey {
  const { activity, age } = input;
  const bmi = snap.bmi;

  if (activity === "sedentary" || bmi >= 35) return "metabolic_reset";
  if (bmi >= 30 || snap.strain === "high") return "fat_loss_accelerator";
  if (activity === "lightly" || age >= 50) return "advanced_metabolic";
  return "performance_fuel";
}

function getGoalTarget(input: MetabolicInputs, snap: MetabolicSnapshot): SynergyKey {
  const { activity, goals, age } = input;
  const bmi = snap.bmi;

  const fatLossy = goals.some((g) => ["Fat Loss", "Reduce Belly Fat"].includes(g));
  const performanceGoals = goals.some((g) => ["Performance", "Mental Clarity"].includes(g));
  const deeperAdaptationGoals = goals.some((g) =>
    ["Longevity", "Mental Clarity", "Blood Sugar Stability"].includes(g),
  );

  if ((activity === "highly" || activity === "athlete") && age < 45 && performanceGoals) {
    return "performance_fuel";
  }

  if (bmi < 25 && deeperAdaptationGoals) {
    return "advanced_metabolic";
  }

  if (fatLossy || bmi >= 25) {
    return "fat_loss_accelerator";
  }

  if (activity === "highly" || activity === "athlete") {
    return "advanced_metabolic";
  }

  return "fat_loss_accelerator";
}

export function recommendSynergy(
  input: MetabolicInputs,
  snap: MetabolicSnapshot,
  profile?: FastingRecommendationProfile,
): SynergyKey {
  // Safety override — anything flagged caps at gentle reset
  if (hasBlockingSafetyFlag(profile?.safetyFlags)) {
    return "metabolic_reset";
  }

  const goalPick = getGoalTarget(input, snap);
  const experiencePick = getExperienceTarget(profile);
  const pick = fromOrdinal(
    Math.round((toOrdinal(goalPick) + toOrdinal(experiencePick)) / 2),
  );
  const floor = getExperienceFloor(profile);
  const ceiling = fromOrdinal(
    Math.min(
      toOrdinal(getPhysiologyCeiling(input, snap)),
      toOrdinal(getExperienceCeiling(profile)),
    ),
  );

  return clampByRange(pick, floor, ceiling);
}

export { SYNERGIES };
