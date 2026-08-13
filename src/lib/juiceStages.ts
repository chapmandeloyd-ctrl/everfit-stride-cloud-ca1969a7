/**
 * Juice fast stages — day-based progression across the WHOLE fast.
 * Two separate ladders: strict juice-only (deep metabolic reset) and
 * juice + light snacks (gentler, no deep-ketosis / autophagy claims).
 * Thresholds are in hours since start so they map onto the ring the
 * same way the fasting timer stages do.
 */

export interface JuiceStage {
  hour: number;
  label: string;
  icon: string;
  color: string;
  description: string;
  benefits: string[];
}

export const JUICE_ONLY_STAGES: JuiceStage[] = [
  {
    hour: 0,
    label: "Digestive Rest",
    icon: "🥤",
    color: "#22c55e",
    description: "Solid food stops, digestion eases",
    benefits: [
      "Your gut stops the heavy work of breaking down solid food",
      "Juice delivers vitamins and minerals with almost no digestive load",
      "Hydration and electrolytes start climbing back to baseline",
      "Set your intention now — the first hours are mostly mental",
    ],
  },
  {
    hour: 8,
    label: "Glycogen Burn",
    icon: "🟡",
    color: "#eab308",
    description: "Stored carbs start burning down",
    benefits: [
      "Liver glycogen becomes the main fuel source",
      "Insulin settles into a lower, steadier range",
      "Water weight begins to release along with stored carbs",
      "Sip juice slowly — steady sugar keeps energy even",
    ],
  },
  {
    hour: 16,
    label: "Fat Switch",
    icon: "🔥",
    color: "#f97316",
    description: "Body leans on fat for fuel",
    benefits: [
      "Fat oxidation rises as glycogen thins out",
      "Hunger waves come and go — they pass in about 20 minutes",
      "Electrolytes matter now: salt, potassium, magnesium",
      "This is the hardest stretch for most people. Push through it.",
    ],
  },
  {
    hour: 24,
    label: "Day One Down",
    icon: "🔵",
    color: "#3b82f6",
    description: "Light ketones, mind clearing",
    benefits: [
      "Low-level ketone production begins even with juice sugars",
      "Digestive system has had a full day off",
      "Many people report clearer thinking by the end of day one",
      "Sleep may be lighter tonight — that is normal",
    ],
  },
  {
    hour: 48,
    label: "Deep Reset",
    icon: "🟣",
    color: "#8b5cf6",
    description: "Cravings fade, energy steadies",
    benefits: [
      "Sugar and salt cravings drop off sharply",
      "Inflammation markers trend down",
      "Energy becomes flatter and more predictable — no crashes",
      "Taste buds reset; plain juice starts tasting sweet",
    ],
  },
  {
    hour: 72,
    label: "Cellular Cleanup",
    icon: "♻️",
    color: "#06b6d4",
    description: "Repair pathways ramp up",
    benefits: [
      "Cellular cleanup and recycling pathways are more active",
      "Gut lining gets extended time to repair",
      "Skin often looks calmer and less puffy",
      "Keep intensity low — walking only from here",
    ],
  },
  {
    hour: 96,
    label: "Clarity",
    icon: "✨",
    color: "#14b8a6",
    description: "Calm focus, deep rest",
    benefits: [
      "Mental clarity and calm focus usually peak around here",
      "Body is fully adapted to running on juice plus fat stores",
      "Hunger signals are largely quiet",
      "Prioritize sleep, warmth and hydration",
    ],
  },
  {
    hour: 120,
    label: "Renewal",
    icon: "🧬",
    color: "#a855f7",
    description: "Full five-day reset",
    benefits: [
      "Five full days of digestive rest completed",
      "Metabolic flexibility is significantly improved",
      "Relationship with food and cravings is measurably reset",
      "Refeed matters as much as the fast — go slow and soft",
    ],
  },
  {
    hour: 168,
    label: "Extended Reset",
    icon: "🛡️",
    color: "#6366f1",
    description: "Week-long transformation",
    benefits: [
      "A full week of minimal digestive load",
      "Deep repair and immune housekeeping continue",
      "Only do this length with trainer or medical oversight",
      "Plan a multi-day structured refeed before solid meals",
    ],
  },
  {
    hour: 240,
    label: "Full Reset",
    icon: "👑",
    color: "#f43f5e",
    description: "Ten-day supervised reset",
    benefits: [
      "The deepest reset APEXBEAST supports",
      "Requires supervision, daily logging and electrolytes",
      "Move slowly, avoid heat, and stop if anything feels wrong",
      "Refeed over several days: broth, then fruit, then soft protein",
    ],
  },
];

export const JUICE_LIGHT_STAGES: JuiceStage[] = [
  {
    hour: 0,
    label: "Digestive Ease",
    icon: "🥬",
    color: "#84cc16",
    description: "Meals out, juice in",
    benefits: [
      "Full meals stop; juice becomes your base fuel",
      "Digestion gets much lighter without going to zero",
      "Small snacks keep you functional for work and training",
      "Aim for juice first, snack only when you truly need it",
    ],
  },
  {
    hour: 12,
    label: "Insulin Steady",
    icon: "🟢",
    color: "#22c55e",
    description: "Blood sugar smooths out",
    benefits: [
      "Blood sugar swings flatten out without big meals",
      "Less bloating and post-meal heaviness",
      "Portion awareness sharpens fast",
      "Keep snacks small and simple — fruit, broth, a few nuts",
    ],
  },
  {
    hour: 24,
    label: "Energy Lift",
    icon: "⚡",
    color: "#eab308",
    description: "Lighter, steadier energy",
    benefits: [
      "Most people feel lighter and less sluggish by day one",
      "Micronutrient intake is high from fresh juice",
      "Hydration improves noticeably",
      "Light training is fine — skip heavy lifting",
    ],
  },
  {
    hour: 48,
    label: "Craving Reset",
    icon: "🔵",
    color: "#3b82f6",
    description: "Sugar pull weakens",
    benefits: [
      "Processed food and sugar cravings start losing their grip",
      "Appetite is easier to read and easier to control",
      "Sleep quality often improves without late heavy meals",
      "Log honestly — snacks included. Data beats willpower.",
    ],
  },
  {
    hour: 72,
    label: "Gut Rest",
    icon: "🌿",
    color: "#14b8a6",
    description: "Digestive system recovering",
    benefits: [
      "Three days of low digestive load lets the gut settle",
      "Bloating and irregularity typically improve",
      "Inflammation trends down without a full food stop",
      "Keep protein snacks minimal but do not go to zero if you train",
    ],
  },
  {
    hour: 120,
    label: "Habit Reset",
    icon: "✨",
    color: "#8b5cf6",
    description: "New defaults locked in",
    benefits: [
      "Five days is long enough to break autopilot eating habits",
      "Portion sizes feel naturally smaller coming out",
      "Energy is stable and predictable across the day",
      "Transition back with real meals built around protein and vegetables",
    ],
  },
  {
    hour: 168,
    label: "Sustained Lean",
    icon: "👑",
    color: "#f43f5e",
    description: "A full week, modified",
    benefits: [
      "A week of juice-led eating with controlled snacks",
      "Body composition and inflammation both trend the right way",
      "This is a lifestyle template you can repeat safely",
      "Rebuild slowly — one solid meal per day for the first few days",
    ],
  },
];

export function juiceStagesFor(mode: string): JuiceStage[] {
  return mode === "juice_plus_light" ? JUICE_LIGHT_STAGES : JUICE_ONLY_STAGES;
}

/** Stages that actually fit inside this fast length. */
export function relevantJuiceStages(mode: string, totalHours: number): JuiceStage[] {
  const all = juiceStagesFor(mode);
  const list = all.filter((s) => s.hour < totalHours);
  return list.length ? list : [all[0]];
}

export function currentJuiceStage(mode: string, elapsedHours: number, totalHours: number): JuiceStage {
  const list = relevantJuiceStages(mode, totalHours);
  return [...list].reverse().find((s) => elapsedHours >= s.hour) ?? list[0];
}
