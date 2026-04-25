/**
 * Enriched fasting stages — KSOM-360's 12 scientific stages with friendlier,
 * Simple-app-style copy, hour ranges, gradient palettes, and emoji icons.
 * Used by /client/stages experience.
 */

export interface EnrichedStage {
  id: string;
  /** Scientific name (kept from KSOM canon) */
  label: string;
  /** Friendly plain-language headline */
  friendlyTitle: string;
  /** Lower bound in hours (inclusive) */
  minHours: number;
  /** Upper bound in hours (exclusive) — undefined = open ended */
  maxHours?: number;
  /** Display range, e.g. "0 - 4 hours" */
  rangeLabel: string;
  /** Emoji used as the animated icon */
  emoji: string;
  /** Short summary for list/timeline */
  summary: string;
  /** Long description for detail / hero card */
  description: string;
  /** 3–4 short bullet benefits */
  benefits: string[];
  /** Gradient palette for hero & accents (HSL strings) */
  fromColor: string;
  toColor: string;
  accent: string;
  /** Animation flavor used by icon */
  motion: "pulse" | "float" | "spin" | "bounce" | "glow";
}

export const ENRICHED_STAGES: EnrichedStage[] = [
  {
    id: "anabolic",
    label: "Anabolic",
    friendlyTitle: "Blood Sugar Rises",
    minHours: 0,
    maxHours: 2,
    rangeLabel: "0 - 2 hours",
    emoji: "🍽️",
    summary: "Your body is digesting and storing energy.",
    description:
      "After eating, your blood sugar rises and insulin is released to shuttle glucose into your cells. Your body is in 'fed mode' — digesting nutrients and storing energy as glycogen and fat.",
    benefits: [
      "Insulin shuttles glucose into cells",
      "Nutrients are absorbed for repair",
      "Energy is stored as glycogen & fat",
    ],
    fromColor: "hsl(0, 84%, 60%)",
    toColor: "hsl(15, 90%, 65%)",
    accent: "hsl(0, 84%, 60%)",
    motion: "bounce",
  },
  {
    id: "catabolic",
    label: "Catabolic",
    friendlyTitle: "Insulin Starts Dropping",
    minHours: 2,
    maxHours: 4,
    rangeLabel: "2 - 4 hours",
    emoji: "🌅",
    summary: "Digestion slows, insulin begins to fall.",
    description:
      "Your body has finished the bulk of digestion. Insulin levels begin to decline and you shift from storing energy to maintaining it. Your digestive system starts to rest.",
    benefits: [
      "Insulin levels start declining",
      "Storage mode → maintenance mode",
      "Digestive system begins resting",
    ],
    fromColor: "hsl(25, 95%, 60%)",
    toColor: "hsl(38, 92%, 65%)",
    accent: "hsl(25, 95%, 53%)",
    motion: "float",
  },
  {
    id: "post_absorptive",
    label: "Post-Absorptive",
    friendlyTitle: "Blood Sugar Stabilizes",
    minHours: 4,
    maxHours: 8,
    rangeLabel: "4 - 8 hours",
    emoji: "🟡",
    summary: "Blood sugar returns to baseline.",
    description:
      "Glucose from your last meal has been used or stored. Blood sugar normalizes, your body taps into glycogen reserves, and growth hormone secretion starts to climb.",
    benefits: [
      "Blood sugar returns to baseline",
      "Body taps into glycogen reserves",
      "Growth hormone begins to rise",
    ],
    fromColor: "hsl(45, 95%, 60%)",
    toColor: "hsl(50, 100%, 70%)",
    accent: "hsl(45, 95%, 55%)",
    motion: "pulse",
  },
  {
    id: "gluconeogenesis",
    label: "Gluconeogenesis",
    friendlyTitle: "Body Makes Its Own Fuel",
    minHours: 8,
    maxHours: 12,
    rangeLabel: "8 - 12 hours",
    emoji: "🌱",
    summary: "Glycogen depletes — body crafts new glucose.",
    description:
      "Your liver starts converting amino acids and glycerol into glucose to keep things running. Glycogen stores are draining and metabolic flexibility kicks in.",
    benefits: [
      "Liver converts amino acids → glucose",
      "Glycogen stores deplete",
      "Metabolic flexibility improves",
    ],
    fromColor: "hsl(140, 70%, 50%)",
    toColor: "hsl(160, 75%, 55%)",
    accent: "hsl(142, 76%, 46%)",
    motion: "float",
  },
  {
    id: "metabolic_shift",
    label: "Metabolic Shift",
    friendlyTitle: "Flipping the Metabolic Switch",
    minHours: 12,
    maxHours: 14,
    rangeLabel: "12 - 14 hours",
    emoji: "🚀",
    summary: "Fat-burning mode officially begins.",
    description:
      "Glycogen is depleted. Your body switches its primary fuel source to fat, ketone production starts at low levels, and inflammation markers begin to drop.",
    benefits: [
      "Primary fuel switches to fat",
      "Low-level ketone production starts",
      "Inflammation begins to decrease",
    ],
    fromColor: "hsl(200, 90%, 55%)",
    toColor: "hsl(217, 91%, 65%)",
    accent: "hsl(217, 91%, 60%)",
    motion: "spin",
  },
  {
    id: "partial_ketosis",
    label: "Partial Ketosis",
    friendlyTitle: "Ketones Power Your Brain",
    minHours: 14,
    maxHours: 16,
    rangeLabel: "14 - 16 hours",
    emoji: "🧠",
    summary: "Mental clarity and focus often improve.",
    description:
      "Ketone bodies rise in your bloodstream and your brain begins using them as fuel. Many people notice sharper focus, smoother energy, and a real uptick in fat oxidation.",
    benefits: [
      "Brain begins running on ketones",
      "Mental clarity & focus often improve",
      "Fat oxidation accelerates",
    ],
    fromColor: "hsl(265, 80%, 60%)",
    toColor: "hsl(280, 75%, 65%)",
    accent: "hsl(280, 67%, 55%)",
    motion: "pulse",
  },
  {
    id: "fat_burning_zone",
    label: "Fat Burning Zone",
    friendlyTitle: "Deep Fat Burning + Autophagy Begins",
    minHours: 16,
    maxHours: 18,
    rangeLabel: "16 - 18 hours",
    emoji: "🔥",
    summary: "Cellular cleanup (autophagy) is activated.",
    description:
      "Autophagy — your body's cellular cleanup crew — switches on. Damaged proteins and worn-out organelles get recycled, anti-aging pathways are stimulated, and fat burning is in full effect.",
    benefits: [
      "Autophagy (cellular cleanup) activates",
      "Damaged proteins recycled",
      "Anti-aging pathways stimulated",
      "Deep fat burning in full effect",
    ],
    fromColor: "hsl(15, 95%, 55%)",
    toColor: "hsl(35, 100%, 60%)",
    accent: "hsl(20, 95%, 55%)",
    motion: "glow",
  },
  {
    id: "growth_hormone_surge",
    label: "Growth Hormone Surge",
    friendlyTitle: "HGH Surges, Muscle Is Protected",
    minHours: 18,
    maxHours: 24,
    rangeLabel: "18 - 24 hours",
    emoji: "💪",
    summary: "Growth hormone can spike up to 5× baseline.",
    description:
      "Human Growth Hormone surges, helping preserve lean muscle while accelerating fat metabolism. Tissue repair and recovery improve significantly during this window.",
    benefits: [
      "HGH spikes up to 5× baseline",
      "Muscle preservation enhanced",
      "Fat metabolism accelerated",
      "Tissue repair improved",
    ],
    fromColor: "hsl(330, 85%, 60%)",
    toColor: "hsl(350, 90%, 65%)",
    accent: "hsl(330, 81%, 60%)",
    motion: "bounce",
  },
  {
    id: "autophagy_peak",
    label: "Autophagy Peak",
    friendlyTitle: "Deep Cellular Renewal",
    minHours: 24,
    maxHours: 36,
    rangeLabel: "24 - 36 hours",
    emoji: "♻️",
    summary: "Cell recycling reaches significant levels.",
    description:
      "Autophagy ramps up dramatically. Intestinal stem cells begin regenerating, old immune cells are cleared, and inflammation drops markedly. This is true cellular renewal.",
    benefits: [
      "Autophagy reaches significant levels",
      "Intestinal stem cells regenerate",
      "Old immune cells cleared",
      "Inflammation markedly reduced",
    ],
    fromColor: "hsl(180, 85%, 45%)",
    toColor: "hsl(195, 90%, 55%)",
    accent: "hsl(186, 85%, 45%)",
    motion: "spin",
  },
  {
    id: "deep_renewal",
    label: "Deep Renewal",
    friendlyTitle: "Gut Healing & Brain Boost",
    minHours: 36,
    maxHours: 48,
    rangeLabel: "36 - 48 hours",
    emoji: "✨",
    summary: "Gut lining repairs, BDNF rises.",
    description:
      "Gut lining repair accelerates and BDNF (brain-derived neurotrophic factor) increases — supporting neuroplasticity and cognitive function. Cellular waste removal hits peak efficiency.",
    benefits: [
      "Gut lining repair accelerates",
      "BDNF rises (neuroplasticity ↑)",
      "Cognitive function enhanced",
      "Cellular waste removal peaks",
    ],
    fromColor: "hsl(170, 75%, 45%)",
    toColor: "hsl(180, 80%, 55%)",
    accent: "hsl(172, 76%, 46%)",
    motion: "glow",
  },
  {
    id: "immune_reset",
    label: "Immune Reset",
    friendlyTitle: "Immune System Rebuilds",
    minHours: 48,
    maxHours: 72,
    rangeLabel: "48 - 72 hours",
    emoji: "🛡️",
    summary: "Old immune cells are recycled, fresh ones built.",
    description:
      "Old white blood cells are cleared and your body starts generating fresh ones. Stem-cell-based regeneration activates and oxidative stress drops significantly.",
    benefits: [
      "Old immune cells recycled",
      "Fresh immune cells generated",
      "Stem cell regeneration active",
      "Oxidative stress reduced",
    ],
    fromColor: "hsl(265, 75%, 55%)",
    toColor: "hsl(285, 80%, 65%)",
    accent: "hsl(272, 76%, 56%)",
    motion: "pulse",
  },
  {
    id: "stem_cell_activation",
    label: "Stem Cell Activation",
    friendlyTitle: "Full Regeneration Mode",
    minHours: 72,
    rangeLabel: "72+ hours",
    emoji: "🧬",
    summary: "Stem cell production climbs — full metabolic reset.",
    description:
      "Your immune system is substantially renewed, stem cell production rises dramatically, IGF-1 drops to promote longevity pathways, and a complete metabolic reset is achieved.",
    benefits: [
      "Immune system substantially renewed",
      "Stem cell production climbs",
      "IGF-1 drops (longevity ↑)",
      "Complete metabolic reset",
    ],
    fromColor: "hsl(230, 85%, 60%)",
    toColor: "hsl(255, 80%, 65%)",
    accent: "hsl(238, 76%, 60%)",
    motion: "spin",
  },
];

export function getStageForElapsedHours(elapsedHours: number): EnrichedStage {
  let current = ENRICHED_STAGES[0];
  for (const stage of ENRICHED_STAGES) {
    if (elapsedHours >= stage.minHours) current = stage;
  }
  return current;
}

export function getStageProgress(elapsedHours: number, stage: EnrichedStage): number {
  if (elapsedHours < stage.minHours) return 0;
  if (stage.maxHours === undefined) return 1;
  const span = stage.maxHours - stage.minHours;
  return Math.min(1, Math.max(0, (elapsedHours - stage.minHours) / span));
}