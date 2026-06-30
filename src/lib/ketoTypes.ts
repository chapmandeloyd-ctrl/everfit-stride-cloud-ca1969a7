export type KetoTypeCode = "SKD" | "TKD" | "HPKD" | "CKD";

export interface KetoTypeMeta {
  code: KetoTypeCode;
  name: string;
  tagline: string;
  description: string;
  macros: { fat: string; protein: string; carbs: string };
  bestFor: string[];
  sampleFoods: string[];
  color: string; // tailwind text color class
  bg: string; // tailwind bg color class
}

export const KETO_TYPES: Record<KetoTypeCode, KetoTypeMeta> = {
  SKD: {
    code: "SKD",
    name: "Standard Ketogenic",
    tagline: "Strict, steady-state keto",
    description:
      "The classic high-fat, very-low-carb approach. Keeps you in steady ketosis. Best on rest or low-activity days.",
    macros: { fat: "70–75%", protein: "20%", carbs: "5–10%" },
    bestFor: ["Fat loss", "Mental clarity", "Rest / low-activity days"],
    sampleFoods: ["Eggs + avocado", "Fatty fish", "Olive oil greens", "Cheese"],
    color: "text-emerald-300",
    bg: "bg-emerald-500/15 border-emerald-500/30",
  },
  TKD: {
    code: "TKD",
    name: "Targeted Ketogenic",
    tagline: "Carbs around training only",
    description:
      "Strict keto, with a small dose of fast carbs (~20–30 g) 30 min before training. Powers the workout without breaking ketosis.",
    macros: { fat: "65%", protein: "20%", carbs: "10–15% (around workout)" },
    bestFor: ["Lift days", "High-intensity training", "Plateau breaking"],
    sampleFoods: ["Rice cake + honey pre-lift", "Whey + dextrose", "Banana"],
    color: "text-amber-300",
    bg: "bg-amber-500/15 border-amber-500/30",
  },
  HPKD: {
    code: "HPKD",
    name: "High-Protein Keto",
    tagline: "Higher protein for muscle",
    description:
      "Keto with more protein to support muscle retention. Ideal for active clients losing weight who want to keep lean mass.",
    macros: { fat: "60–65%", protein: "30–35%", carbs: "5%" },
    bestFor: ["Muscle retention", "Athletes losing fat", "Older adults"],
    sampleFoods: ["Lean steak + greens", "Chicken + olive oil", "Cottage cheese"],
    color: "text-sky-300",
    bg: "bg-sky-500/15 border-sky-500/30",
  },
  CKD: {
    code: "CKD",
    name: "Cyclical Ketogenic",
    tagline: "Periodic carb refeed",
    description:
      "Strict keto 5–6 days with 1–2 carb refeed days to refill glycogen. For advanced clients with high training volume.",
    macros: { fat: "70% (keto days)", protein: "20%", carbs: "Refeed day: 60–70% carbs" },
    bestFor: ["Advanced athletes", "High-volume training weeks"],
    sampleFoods: ["Keto day: standard SKD", "Refeed day: rice, sweet potato, oats"],
    color: "text-fuchsia-300",
    bg: "bg-fuchsia-500/15 border-fuchsia-500/30",
  },
};

export const KETO_TYPE_LIST = Object.values(KETO_TYPES);

/** Resolves the keto type that applies on a given weekday based on schedule settings. */
export function resolveKetoForWeekday(opts: {
  mode: "simple" | "advanced";
  defaultType: KetoTypeCode | null | undefined;
  overrides: { weekday: number; keto_type: KetoTypeCode }[];
  weekday: number; // 0=Sun..6=Sat
}): KetoTypeCode | null {
  if (opts.mode === "advanced") {
    const override = opts.overrides.find((o) => o.weekday === opts.weekday);
    if (override) return override.keto_type;
  }
  return opts.defaultType ?? null;
}