/**
 * Fasting metabolic stages with hour thresholds, colors, and descriptions.
 * Based on metabolic science: anabolic → catabolic → fat burning → ketosis → deep ketosis → autophagy
 */

export interface FastingStage {
  id: string;
  label: string;
  minHours: number;
  color: string;          // HSL for Tailwind
  dotColor: string;       // Hex for SVG
  description: string;
}

export const FASTING_STAGES: FastingStage[] = [
  {
    id: "anabolic",
    label: "ANABOLIC",
    minHours: 0,
    color: "hsl(142, 76%, 46%)",
    dotColor: "#22c55e",
    description: "Body digesting food, insulin rising",
  },
  {
    id: "catabolic",
    label: "CATABOLIC",
    minHours: 4,
    color: "hsl(38, 92%, 60%)",
    dotColor: "#f59e0b",
    description: "Insulin drops",
  },
  {
    id: "fat_burning",
    label: "FAT BURNING",
    minHours: 8,
    color: "hsl(25, 95%, 53%)",
    dotColor: "#f97316",
    description: "Fat oxidation begins",
  },
  {
    id: "ketosis",
    label: "KETOSIS",
    minHours: 12,
    color: "hsl(0, 84%, 60%)",
    dotColor: "#ef4444",
    description: "Ketone production increases",
  },
  {
    id: "deep_ketosis",
    label: "DEEP KETOSIS",
    minHours: 18,
    color: "hsl(280, 67%, 55%)",
    dotColor: "#a855f7",
    description: "Growth hormone surges",
  },
  {
    id: "autophagy",
    label: "AUTOPHAGY",
    minHours: 24,
    color: "hsl(217, 91%, 60%)",
    dotColor: "#3b82f6",
    description: "Cellular cleanup activated",
  },
];

export function getCurrentStage(elapsedHours: number): FastingStage {
  let current = FASTING_STAGES[0];
  for (const stage of FASTING_STAGES) {
    if (elapsedHours >= stage.minHours) {
      current = stage;
    }
  }
  return current;
}
