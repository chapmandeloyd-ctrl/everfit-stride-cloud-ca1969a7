import type { EngineMode } from "@/lib/engineConfig";

export interface IntroScreen {
  title: string;
  subtitle: string;
}

export interface OnboardingQuestion {
  id: string;
  label: string;
  type: "options" | "slider" | "toggle" | "dropdown";
  options?: string[];
  sliderMin?: number;
  sliderMax?: number;
  defaultValue?: string | number | boolean;
  required?: boolean;
}

interface EngineOnboardingContent {
  tone: string;
  introScreens: [IntroScreen, IntroScreen, IntroScreen];
  questions: [OnboardingQuestion, OnboardingQuestion, OnboardingQuestion];
}

export const ENGINE_ONBOARDING: Record<EngineMode, EngineOnboardingContent> = {
  metabolic: {
    tone: "clinical",
    introScreens: [
      {
        title: "Metabolic Stability System",
        subtitle: "This program improves metabolic health, energy, and fat regulation.",
      },
      {
        title: "Consistency Over Intensity",
        subtitle: "Small daily regulation wins drive long-term metabolic stability.",
      },
      {
        title: "Track. Stabilize. Improve.",
        subtitle: "Your Stability Index will guide adjustments week to week.",
      },
    ],
    questions: [
      {
        id: "fasting_experience",
        label: "Have you practiced fasting before?",
        type: "options",
        options: ["Yes, regularly", "Occasionally", "New to fasting"],
        required: true,
      },
      {
        id: "avg_sleep",
        label: "Average sleep per night?",
        type: "slider",
        sliderMin: 4,
        sliderMax: 9,
        defaultValue: 7,
      },
      {
        id: "primary_focus",
        label: "Primary focus?",
        type: "options",
        options: ["Fat loss", "Energy stability", "Metabolic health"],
        required: true,
      },
    ],
  },

};
