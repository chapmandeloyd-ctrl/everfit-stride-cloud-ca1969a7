import type { ActivityLevel } from "@/lib/onboarding/metabolicCalc";
import type { FastingExperienceData } from "@/components/onboarding/premium/steps/FastingExperienceStep";
import type { FastType } from "@/components/onboarding/premium/steps/FastTypeSelectionStep";
import type { DailyRhythmData } from "@/components/onboarding/premium/steps/DailyRhythmStep";

export type FuelStyle = "Balance" | "Performance" | "Lean" | "Recomp" | "Extreme";

export interface RecommenderInput {
  weightKg: number;
  goalWeightKg: number | null;
  activity: ActivityLevel | null;
  goals: string[];
  fastingExperience: FastingExperienceData | null;
  dailyRhythm: DailyRhythmData | null;
}

export interface Recommendation<T> {
  choice: T;
  reasons: string[];
  warning?: string;
}

function lossPercent(input: RecommenderInput): number | null {
  if (!input.goalWeightKg || !input.weightKg) return null;
  return ((input.weightKg - input.goalWeightKg) / input.weightKg) * 100;
}

export function recommendFuelStyle(input: RecommenderInput): Recommendation<FuelStyle> {
  const flags = (input.fastingExperience?.safetyFlags ?? []).filter((f) => f !== "none");
  const goals = input.goals ?? [];
  const loss = lossPercent(input);
  const activity = input.activity;
  const reasons: string[] = [];

  // Safety first — flags force Balance.
  if (flags.length > 0) {
    reasons.push("You noted a health consideration, so we're keeping fuel steady and sustainable.");
    if (goals.includes("Fat Loss")) reasons.push("You still get fat-loss momentum from the fasting window itself.");
    reasons.push("Balanced macros protect energy, hormones, and recovery.");
    return {
      choice: "Balance",
      reasons,
      warning: "Safety flag detected — fuel style locked to Balance.",
    };
  }

  const wantsFatLoss = goals.includes("Fat Loss") || goals.includes("Reduce Belly Fat");
  const wantsPerformance = goals.includes("Performance");
  const wantsMuscle = goals.some((g) => /muscle|recomp|strength/i.test(g));
  const isAthlete = activity === "athlete" || activity === "highly";

  // Extreme — only when aggressive loss AND user is not primarily performance-driven.
  if (loss !== null && loss >= 12 && wantsFatLoss && !isAthlete) {
    reasons.push(`Your goal is a ${loss.toFixed(1)}% body-weight cut — that needs a real deficit.`);
    reasons.push("High protein (45%) protects muscle while calories drop.");
    reasons.push("Runs 4–6 weeks max, then we step you back to Lean.");
    return { choice: "Extreme", reasons, warning: "Short-term cut only — reassess at 6 weeks." };
  }

  // Performance — athletes / performance goal.
  if (wantsPerformance || isAthlete) {
    reasons.push(
      isAthlete
        ? `You train ${activity === "athlete" ? "daily" : "5–6 days a week"} — you need carbs to fuel it.`
        : "You picked Performance as a goal — carbs power output.",
    );
    reasons.push("45% carbs land around your training window.");
    reasons.push("Protein stays high (30%) for recovery.");
    return { choice: "Performance", reasons };
  }

  // Recomp — muscle + moderate loss.
  if (wantsMuscle && wantsFatLoss) {
    reasons.push("You want to lose fat AND build muscle — Recomp splits the difference.");
    reasons.push("Balanced 35/35/30 keeps a small deficit without starving lifts.");
    return { choice: "Recomp", reasons };
  }

  // Lean — fat-loss default with moderate delta.
  if (wantsFatLoss) {
    reasons.push(
      loss !== null
        ? `You're targeting a ${loss.toFixed(1)}% cut — a steady Lean profile fits.`
        : "Fat Loss is your priority — Lean skews protein up and carbs down.",
    );
    reasons.push("40% protein preserves muscle while calories dip.");
    reasons.push("Sustainable long-term — no cliff, no rebound.");
    return { choice: "Lean", reasons };
  }

  // Default Balance.
  reasons.push("Your goals are health & longevity, not aggressive cuts — Balance fits.");
  reasons.push("Sustainable macros you can hold for months.");
  reasons.push("Easy to adjust up or down as goals change.");
  return { choice: "Balance", reasons };
}

export function recommendFastType(input: RecommenderInput): Recommendation<FastType> {
  const flags = (input.fastingExperience?.safetyFlags ?? []).filter((f) => f !== "none");
  const level = input.fastingExperience?.experienceLevel ?? null;
  const longest = input.fastingExperience?.longestFastHours ?? 0;
  const tolerance = input.fastingExperience?.tolerance ?? null;
  const reasons: string[] = [];

  if (flags.length > 0) {
    reasons.push("You flagged a health consideration — Daily Window is the safer path.");
    reasons.push("We'll cap you at 14:10 or 16:8, never extended fasts.");
    reasons.push("You still get the metabolic benefits without the risk.");
    return {
      choice: "intermittent",
      reasons,
      warning: "Safety flag detected — extended fasts are disabled.",
    };
  }

  if (level === "none" || level === null) {
    reasons.push("You haven't fasted before — daily windows build the muscle first.");
    reasons.push("We'll start you at 14:10 or 16:8, no jumping to extended.");
    reasons.push("Extended fasts unlock once your daily rhythm is solid.");
    return { choice: "intermittent", reasons };
  }

  if (level === "advanced" && longest >= 24 && tolerance !== "challenging") {
    reasons.push(`Your longest fast is ${longest}h — you already have the base.`);
    reasons.push(tolerance === "easy" ? "You said fasting feels easy — extended stretches fit." : "Extended fasts drive deeper autophagy and metabolic reset.");
    reasons.push("We'll structure 24–48h blocks around your training.");
    return { choice: "long", reasons };
  }

  // Regular / moderate default → Daily Window.
  reasons.push(
    level === "regular"
      ? "You fast regularly — daily windows keep the rhythm without overreach."
      : "You've fasted before but not long stretches — daily windows are the sweet spot.",
  );
  if (longest) reasons.push(`Your ${longest}h longest fast tells us 18:6 or 20:4 is in reach.`);
  reasons.push("Extended fasts stay available later once you want to push further.");
  return { choice: "intermittent", reasons };
}