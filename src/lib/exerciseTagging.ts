// Derives equipment + muscle tags from an exercise name / fields.
// The library rows have no equipment or muscle_group values stored, so the
// picker filters infer them from the exercise name keywords.

export interface TaggableExercise {
  name: string;
  muscle_group?: string | null;
  equipment?: string | null;
  category?: string | null;
}

export const EQUIPMENT_FILTERS = [
  { key: "medicine_ball", label: "Medicine Ball", patterns: [/med(icine)?\s*ball/i, /\bslam\s*ball/i, /wall\s*ball/i] },
  { key: "cable", label: "Cable", patterns: [/\bcable/i, /\bpulley/i, /lat\s*pulldown/i] },
  { key: "dumbbell", label: "Dumbbell", patterns: [/dumbbell/i, /\bdb\b/i] },
  { key: "bands", label: "Bands", patterns: [/\bband\b/i, /\bbands\b/i, /resistance\s*band/i, /mini\s*band/i] },
  { key: "barbell", label: "Barbell", patterns: [/barbell/i, /\bbb\b/i, /ez\s*bar/i, /trap\s*bar/i, /landmine/i] },
  { key: "kettlebell", label: "Kettlebell", patterns: [/kettlebell/i, /\bkb\b/i] },
  { key: "battle_rope", label: "Battle Rope", patterns: [/battle\s*rope/i, /\brope\s*slam/i] },
  { key: "machine", label: "Machine", patterns: [/machine/i, /smith/i, /\bsled\b/i, /\bergo?\b/i, /rower/i, /treadmill/i, /\bbike\b/i] },
  { key: "bench", label: "Bench / Box", patterns: [/\bbench\b/i, /\bbox\b/i, /\bstep[\s-]?up/i] },
  { key: "plyo", label: "Plyo / Jumps", patterns: [/\bjump/i, /\bhop/i, /plyo/i, /bound/i, /\bskater/i] },
] as const;

export const MUSCLE_FILTERS = [
  { key: "glutes", label: "Glutes", patterns: [/glute/i, /hip\s*thrust/i, /bridge/i, /kickback/i, /\bhip\s*abduct/i] },
  { key: "quads", label: "Quads", patterns: [/squat/i, /lunge/i, /leg\s*press/i, /leg\s*extension/i, /step[\s-]?up/i, /\bquad/i, /wall\s*sit/i] },
  { key: "hamstrings", label: "Hamstrings", patterns: [/hamstring/i, /deadlift/i, /\brdl\b/i, /good\s*morning/i, /leg\s*curl/i, /hip\s*hinge/i] },
  { key: "calves", label: "Calves", patterns: [/calf/i, /calves/i, /\bheel\s*raise/i] },
  { key: "back", label: "Back", patterns: [/\brow\b/i, /\brows\b/i, /pull[\s-]?up/i, /chin[\s-]?up/i, /pulldown/i, /\blat\b/i, /pull[\s-]?over/i, /\bback\s*ext/i] },
  { key: "chest", label: "Chest", patterns: [/chest/i, /bench\s*press/i, /push[\s-]?up/i, /\bfly\b/i, /\bflye/i, /\bpec\b/i] },
  { key: "shoulders", label: "Shoulders", patterns: [/shoulder/i, /overhead\s*press/i, /\bohp\b/i, /lateral\s*raise/i, /front\s*raise/i, /\bdelt/i, /\bpress\s*out/i, /upright\s*row/i, /\barnold/i] },
  { key: "biceps", label: "Biceps", patterns: [/curl/i, /\bbicep/i] },
  { key: "triceps", label: "Triceps", patterns: [/tricep/i, /\bdip\b/i, /skull\s*crusher/i, /pushdown/i, /kickback/i, /close\s*grip/i] },
  { key: "forearms", label: "Forearms", patterns: [/forearm/i, /wrist/i, /farmer/i, /\bgrip\b/i] },
  { key: "core", label: "Core / Abs", patterns: [/\bab\b/i, /\babs\b/i, /crunch/i, /plank/i, /sit[\s-]?up/i, /\bcore\b/i, /russian\s*twist/i, /\bv[\s-]?up/i, /hollow/i, /dead\s*bug/i, /mountain\s*climber/i, /leg\s*raise/i, /\bwood\s*chop/i] },
  { key: "full_body", label: "Full Body", patterns: [/burpee/i, /thruster/i, /clean/i, /snatch/i, /turkish/i, /\bswing\b/i, /man\s*maker/i, /bear\s*crawl/i] },
  { key: "cardio", label: "Cardio", patterns: [/\brun\b/i, /sprint/i, /\bjog/i, /\bskip/i, /jump\s*rope/i, /\bbike\b/i, /row\s*erg/i, /treadmill/i, /shuttle/i, /agility/i] },
] as const;

export type EquipmentKey = (typeof EQUIPMENT_FILTERS)[number]["key"];
export type MuscleKey = (typeof MUSCLE_FILTERS)[number]["key"];

function matches(patterns: readonly RegExp[], text: string) {
  return patterns.some((p) => p.test(text));
}

export function matchesEquipment(ex: TaggableExercise, key: EquipmentKey | "bodyweight"): boolean {
  const text = `${ex.name} ${ex.equipment || ""}`;
  if (key === "bodyweight") {
    if (/body\s*weight|bodyweight/i.test(text)) return true;
    return !EQUIPMENT_FILTERS.some((f) => f.key !== "plyo" && matches(f.patterns, text));
  }
  const f = EQUIPMENT_FILTERS.find((e) => e.key === key);
  return !!f && matches(f.patterns, text);
}

export function matchesMuscle(ex: TaggableExercise, key: MuscleKey | "untagged"): boolean {
  const text = `${ex.name} ${ex.muscle_group || ""}`;
  if (key === "untagged") {
    return !MUSCLE_FILTERS.some((f) => matches(f.patterns, text));
  }
  const f = MUSCLE_FILTERS.find((m) => m.key === key);
  return !!f && matches(f.patterns, text);
}

export const EQUIPMENT_OPTIONS: { key: EquipmentKey | "bodyweight"; label: string }[] = [
  ...EQUIPMENT_FILTERS.map((f) => ({ key: f.key as EquipmentKey, label: f.label })),
  { key: "bodyweight", label: "Bodyweight" },
];

export const MUSCLE_OPTIONS: { key: MuscleKey | "untagged"; label: string }[] = [
  ...MUSCLE_FILTERS.map((f) => ({ key: f.key as MuscleKey, label: f.label })),
  { key: "untagged", label: "Untagged" },
];
