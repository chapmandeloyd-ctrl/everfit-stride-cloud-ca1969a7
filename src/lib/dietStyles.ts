// Shared diet-style presets used by the macro setup wizard and nutrition dashboard.
// `value` matches what gets saved to client_macro_targets.diet_style.

export type DietStylePreset = {
  value: string;
  label: string;
  abbreviation: string;
  description: string;
  color: string; // hex, used for accent + pill background
  proteinPct: number; // 0–1
  fatPct: number;
  carbsPct: number;
  proteinDisplay: string; // e.g. "20–25%"
  fatDisplay: string;
  carbsDisplay: string;
};

export const DIET_STYLE_PRESETS: DietStylePreset[] = [
  {
    value: "standard",
    label: "Standard",
    abbreviation: "STD",
    description: "Balanced macros — goal-based protein, carb, and fat split.",
    color: "#3b82f6",
    proteinPct: 0.30, fatPct: 0.30, carbsPct: 0.40,
    proteinDisplay: "30%", fatDisplay: "30%", carbsDisplay: "40%",
  },
  {
    value: "standard_keto",
    label: "Standard Keto",
    abbreviation: "SKD",
    description: "Classic ketogenic ratios — high fat, moderate protein, very low carbs.",
    color: "#f59e0b",
    proteinPct: 0.25, fatPct: 0.70, carbsPct: 0.05,
    proteinDisplay: "20–25%", fatDisplay: "70–75%", carbsDisplay: "≤10%",
  },
  {
    value: "targeted_keto",
    label: "Targeted Keto",
    abbreviation: "TKD",
    description: "Extra carbs timed around workouts for energy without leaving ketosis.",
    color: "#22c55e",
    proteinPct: 0.25, fatPct: 0.65, carbsPct: 0.10,
    proteinDisplay: "25%", fatDisplay: "60–65%", carbsDisplay: "10–15%",
  },
  {
    value: "cyclical_keto",
    label: "Cyclical Keto",
    abbreviation: "CKD",
    description: "5–6 days strict keto then 1–2 higher-carb refeeds for muscle building.",
    color: "#a855f7",
    proteinPct: 0.25, fatPct: 0.60, carbsPct: 0.15,
    proteinDisplay: "25%", fatDisplay: "55–65%", carbsDisplay: "10–20%",
  },
  {
    value: "high_protein_keto",
    label: "High-Protein Keto",
    abbreviation: "HPK",
    description: "More protein than traditional keto — ideal for building muscle in ketosis.",
    color: "#ef4444",
    proteinPct: 0.35, fatPct: 0.60, carbsPct: 0.05,
    proteinDisplay: "35%", fatDisplay: "55–60%", carbsDisplay: "≤10%",
  },
];

export function getDietStylePreset(value?: string | null): DietStylePreset | null {
  if (!value) return null;
  return DIET_STYLE_PRESETS.find((d) => d.value === value) ?? null;
}
