import type { FastingExperienceData } from "@/components/onboarding/premium/steps/FastingExperienceStep";
import type { ActivityLevel } from "./metabolicCalc";

interface ReadinessInput {
  activity: ActivityLevel | null;
  goals: string[];
  fastingExperience: FastingExperienceData | null;
  coachingStyle: "guided" | "self" | null;
  hasBodyMetrics: boolean;
}

// 0-100 Metabolic Readiness Score
// Experience 0-30 + Tolerance 0-25 + Goal clarity 0-25 + Activity 0-20
export function computeReadinessScore(input: ReadinessInput): number {
  let score = 0;

  // Experience (0-30)
  const expMap: Record<string, number> = {
    none: 8,
    casual: 16,
    regular: 24,
    advanced: 30,
  };
  if (input.fastingExperience?.experienceLevel) {
    score += expMap[input.fastingExperience.experienceLevel] ?? 0;
    if ((input.fastingExperience.longestFastHours ?? 0) >= 16) score += 0; // already counted
  }

  // Tolerance (0-25)
  const tolMap: Record<string, number> = {
    easy: 25,
    moderate: 18,
    challenging: 11,
    difficult: 5,
  };
  if (input.fastingExperience?.tolerance) {
    score += tolMap[input.fastingExperience.tolerance] ?? 0;
  } else if (!input.fastingExperience) {
    score += 12; // neutral if not asked
  }

  // Goal clarity (0-25)
  const goalCount = input.goals?.length ?? 0;
  if (goalCount === 0) score += 0;
  else if (goalCount === 1) score += 25;
  else if (goalCount === 2) score += 20;
  else score += 15;

  // Activity (0-20)
  const actMap: Record<string, number> = {
    sedentary: 8,
    light: 13,
    moderate: 17,
    very: 19,
    extra: 20,
  };
  if (input.activity) score += actMap[input.activity] ?? 12;

  // Body metrics floor
  if (input.hasBodyMetrics) score += 0;

  return Math.max(0, Math.min(100, Math.round(score)));
}
