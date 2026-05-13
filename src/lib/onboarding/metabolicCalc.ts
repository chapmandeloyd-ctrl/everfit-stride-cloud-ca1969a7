export type Sex = "male" | "female" | "other";
export type ActivityLevel = "sedentary" | "lightly" | "moderately" | "highly" | "athlete";
export type BmiClass =
  | "Underweight"
  | "Healthy Weight"
  | "Overweight"
  | "Obesity Class I"
  | "Obesity Class II"
  | "Obesity Class III";

export interface MetabolicInputs {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goalWeightKg?: number | null;
  activity: ActivityLevel;
  goals: string[];
}

export interface MetabolicSnapshot {
  bmi: number;
  bmiClass: BmiClass;
  metabolicScore: number; // 0–100, higher = healthier
  strain: "low" | "moderate" | "elevated" | "high";
}

export function computeBmi(heightCm: number, weightKg: number): number {
  if (!heightCm || !weightKg) return 0;
  const m = heightCm / 100;
  return +(weightKg / (m * m)).toFixed(1);
}

export function classifyBmi(bmi: number): BmiClass {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy Weight";
  if (bmi < 30) return "Overweight";
  if (bmi < 35) return "Obesity Class I";
  if (bmi < 40) return "Obesity Class II";
  return "Obesity Class III";
}

const ACTIVITY_SCORE: Record<ActivityLevel, number> = {
  sedentary: 30,
  lightly: 55,
  moderately: 75,
  highly: 90,
  athlete: 100,
};

function bmiBandScore(bmi: number): number {
  // peak at 22, drops on either side
  if (bmi <= 0) return 50;
  const diff = Math.abs(bmi - 22);
  return Math.max(0, Math.min(100, 100 - diff * 6));
}

export function computeSnapshot(input: MetabolicInputs): MetabolicSnapshot {
  const bmi = computeBmi(input.heightCm, input.weightKg);
  const bmiClass = classifyBmi(bmi);
  const goalAlign = Math.min(100, 50 + input.goals.length * 6);
  const score = Math.round(
    bmiBandScore(bmi) * 0.5 + ACTIVITY_SCORE[input.activity] * 0.3 + goalAlign * 0.2,
  );

  let strain: MetabolicSnapshot["strain"] = "low";
  if (score < 40) strain = "high";
  else if (score < 60) strain = "elevated";
  else if (score < 80) strain = "moderate";

  return { bmi, bmiClass, metabolicScore: score, strain };
}

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: "Sedentary",
  lightly: "Lightly Active",
  moderately: "Moderately Active",
  highly: "Highly Active",
  athlete: "Athlete",
};
