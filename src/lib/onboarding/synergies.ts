export type SynergyKey =
  | "metabolic_reset"
  | "fat_loss_accelerator"
  | "advanced_metabolic"
  | "performance_fuel";

export interface SynergyDef {
  key: SynergyKey;
  name: string;
  difficulty: "Beginner" | "Moderate" | "Advanced" | "Performance";
  window: string; // fasting window
  eatingWindow: string;
  description: string;
  bestFor: string;
  icon: string; // lucide name
  fastHours: number;
}

export const SYNERGIES: Record<SynergyKey, SynergyDef> = {
  metabolic_reset: {
    key: "metabolic_reset",
    name: "Metabolic Reset",
    difficulty: "Beginner",
    window: "12–14 hour fast",
    eatingWindow: "10–12 hour eating window",
    description: "Gentle introduction to fasting that stabilizes energy and reduces cravings.",
    bestFor: "Cravings & energy stability",
    icon: "Sparkles",
    fastHours: 13,
  },
  fat_loss_accelerator: {
    key: "fat_loss_accelerator",
    name: "Fat Loss Accelerator",
    difficulty: "Moderate",
    window: "16:8 fasting",
    eatingWindow: "8 hour eating window",
    description: "Proven 16:8 protocol balanced for sustainable fat loss and consistency.",
    bestFor: "Fat loss & consistency",
    icon: "Flame",
    fastHours: 16,
  },
  advanced_metabolic: {
    key: "advanced_metabolic",
    name: "Advanced Metabolic Protocol",
    difficulty: "Advanced",
    window: "18:6 / OMAD rotation",
    eatingWindow: "4–6 hour eating window",
    description: "Advanced fasting structure for deep metabolic adaptation.",
    bestFor: "Experienced fasters seeking deeper adaptation",
    icon: "Zap",
    fastHours: 18,
  },
  performance_fuel: {
    key: "performance_fuel",
    name: "Performance Fuel System",
    difficulty: "Performance",
    window: "Performance-aligned fasting",
    eatingWindow: "Training-aligned eating",
    description: "Fasting rhythm timed around training for performance and recovery.",
    bestFor: "Active and athletic performers",
    icon: "Activity",
    fastHours: 14,
  },
};

export const SYNERGY_LIST = Object.values(SYNERGIES);
