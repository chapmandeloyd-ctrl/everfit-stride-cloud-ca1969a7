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
  { key: "medicine_ball", label: "Medicine Ball", patterns: [/med(icine)?\s*ball/i, /\bslam\s*ball/i, /wall\s*ball/i, /\bbosu\b/i] },
  { key: "cable", label: "Cable", patterns: [/\bcable/i, /\bpulley/i, /lat\s*pulldown/i] },
  { key: "dumbbell", label: "Dumbbell", patterns: [/dumbbell/i, /\bdb\b/i] },
  { key: "bands", label: "Bands", patterns: [/\bband\b/i, /\bbands\b/i, /banded/i, /resistance\s*band/i, /mini\s*band/i] },
  { key: "barbell", label: "Barbell", patterns: [/barbell/i, /\bbb\b/i, /ez\s*bar/i, /trap\s*bar/i, /landmine/i] },
  { key: "kettlebell", label: "Kettlebell", patterns: [/kettlebell/i, /\bkb\b/i] },
  { key: "battle_rope", label: "Battle Rope", patterns: [/battle\s*rope/i, /\brope\s*slam/i] },
  { key: "machine", label: "Machine", patterns: [/machine/i, /smith/i, /\bsled\b/i, /\bergo?\b/i, /rower/i, /treadmill/i, /\bbike\b/i] },
  { key: "bench", label: "Bench / Box", patterns: [/\bbench\b/i, /\bbox\b/i, /\bstep[\s-]?up/i] },
  { key: "plyo", label: "Plyo / Jumps", patterns: [/\bjump/i, /\bhop/i, /plyo/i, /bound/i, /\bskater/i] },
] as const;

/**
 * Two-in-one / compound movements: the name chains two movements together
 * ("Lunge To Curl", "Clean And Press", "Frog + Hip Lift") or the movement is a
 * known multi-joint combo lift ("Thruster", "Burpee", "Man Maker").
 */
export const COMPOUND_PATTERNS: RegExp[] = [
  /\s+to\s+/i,
  /\s+and\s+/i,
  /\s*\+\s*/,
  /\s+&\s+/,
  /\s+with\s+/i,
  /\s+into\s+/i,
  /thruster/i,
  /burpee/i,
  /man\s*maker/i,
  /clean\s*(and|&)?\s*(press|jerk)/i,
  /snatch/i,
  /turkish\s*get\s*up/i,
  /get\s*up/i,
  /devil'?s?\s*press/i,
  /squat\s*press/i,
  /push\s*press/i,
  /lunge\s*(bicep\s*)?curl/i,
  /lunge\s*(overhead\s*)?press/i,
  /lunge\s*row/i,
  /squat\s*(to\s*)?row/i,
  /inchworm/i,
  /renegade\s*row/i,
  /plank\s*row/i,
  /high\s*pull\s*press/i,
  /wave\s*(squat|lunge|shuffle|get)/i,
  /slam\s*(alternating\s*)?lunge/i,
];

export function isCompound(ex: TaggableExercise): boolean {
  const name = ex.name || "";
  return COMPOUND_PATTERNS.some((p) => p.test(name));
}

export const MUSCLE_FILTERS = [
  { key: "glutes", label: "Glutes", patterns: [/glute/i, /hip\s*thrust/i, /bridge/i, /kickback/i, /\bhip\s*abduct/i, /clamshell/i, /fire\s*hydrant/i, /donkey\s*kick/i, /hip\s*extension/i, /hip\s*raise/i, /hip\s*lift/i, /frog\s*pump/i, /pull\s*through/i, /bulgarian/i, /hip\s*airplane/i, /hip\s*opener/i] },
  { key: "quads", label: "Quads", patterns: [/squat/i, /lunge/i, /leg\s*press/i, /leg\s*extension/i, /step[\s-]?up/i, /\bquad/i, /wall\s*sit/i, /step\s*down/i, /knee\s*drive/i, /high\s*knee/i, /duck\s*walk/i] },
  { key: "hamstrings", label: "Hamstrings", patterns: [/hamstring/i, /deadlif/i, /\brdl\b/i, /good\s*morning/i, /leg\s*curl/i, /hip\s*hinge/i, /\bhinge\b/i, /butt\s*kicker/i, /forward\s*fold/i] },
  { key: "calves", label: "Calves", patterns: [/calf/i, /calves/i, /\bheel\s*raise/i] },
  { key: "back", label: "Back", patterns: [/\brow\b/i, /\brows\b/i, /pull[\s-]?up/i, /chin[\s-]?up/i, /pulldown/i, /\blat\b/i, /pull[\s-]?over/i, /\bback\s*ext/i, /high\s*pull/i, /face\s*pull/i, /pull\s*apart/i, /bent\s*over\s*y/i, /\bshrug/i, /bird\s*dog/i, /snap\s*down/i] },
  { key: "chest", label: "Chest", patterns: [/chest/i, /bench\s*press/i, /push[\s-]?up/i, /\bfly\b/i, /\bflye/i, /\bpec\b/i, /floor\s*press/i] },
  { key: "shoulders", label: "Shoulders", patterns: [/shoulder/i, /overhead\s*press/i, /\bohp\b/i, /lateral\s*raise/i, /front\s*raise/i, /\bdelt/i, /\bpress\s*out/i, /upright\s*row/i, /\barnold/i, /push\s*press/i, /\bhalo\b/i, /\bjerk\b/i, /external\s*rotation/i, /internal\s*rotation/i, /\bstanding\s*y/i, /iron\s*cross/i, /arm\s*circle/i, /arm\s*hug/i, /bus\s*driver/i, /overhead\s*(carry|march|hold)/i, /atlas\s*press/i, /incline\s*press/i, /kneeling\s*press/i, /alternating\s*press/i, /rotational\s*press/i, /bottoms?\s*up\s*press/i, /around\s*the\s*world/i] },
  { key: "biceps", label: "Biceps", patterns: [/curl/i, /\bbicep/i, /\b21s?\b/i] },
  { key: "triceps", label: "Triceps", patterns: [/tricep/i, /\bdip\b/i, /skull\s*crusher/i, /pushdown/i, /kickback/i, /close\s*grip/i] },
  { key: "forearms", label: "Forearms", patterns: [/forearm/i, /wrist/i, /farmer/i, /\bgrip\b/i, /walking\s*hold/i] },
  { key: "core", label: "Core / Abs", patterns: [/\bab\b/i, /\babs\b/i, /crunch/i, /plank/i, /sit[\s-]?up/i, /\bcore\b/i, /russian\s*twist/i, /\bv[\s-]?up/i, /\bv\s*sit/i, /hollow/i, /dead\s*bug/i, /mountain\s*climber/i, /leg\s*raise/i, /\bwood\s*chop/i, /\bchop\b/i, /side\s*bend/i, /oblique/i, /windshield/i, /flutter/i, /leg\s*drop/i, /scissors/i, /\btwist/i, /rainbow/i, /\bslam\b/i, /\bwave\b/i, /\bsnake\b/i, /sidewinder/i, /\bcircle\b/i, /march/i, /\bcarry\b/i] },
  { key: "full_body", label: "Full Body", patterns: [/burpee/i, /thruster/i, /clean/i, /snatch/i, /turkish/i, /\bswing\b/i, /man\s*maker/i, /bear\s*crawl/i, /inchworm/i, /get\s*up/i] },
  { key: "cardio", label: "Cardio", patterns: [/\brun\b/i, /sprint/i, /\bjog/i, /\bskip/i, /jump\s*rope/i, /\bbike\b/i, /row\s*erg/i, /treadmill/i, /shuttle/i, /agility/i, /jumping\s*jack/i, /high\s*knees/i, /fast\s*feet/i, /shuffle/i, /carioca/i, /dancing/i, /\bbound/i, /broad\s*jump/i, /frog\s*jump/i, /gorilla\s*hop/i, /zig\s*zag/i, /sprinter/i, /butt\s*kicker/i] },
  { key: "mobility", label: "Mobility / Stretch", patterns: [/stretch/i, /\bpose\b/i, /cat\s*(to\s*)?cow/i, /cobra/i, /down(ward)?\s*dog/i, /dolphin/i, /pigeon/i, /puppy/i, /\bflow\b/i, /rockback/i, /t\s*spine/i, /thoracic/i, /lord\s*of\s*the\s*fishes/i, /mobility/i, /forward\s*fold/i, /hip\s*opener/i, /hip\s*flexion/i, /hip\s*flexor/i] },
] as const;

export type EquipmentKey = (typeof EQUIPMENT_FILTERS)[number]["key"];
export type MuscleKey = (typeof MUSCLE_FILTERS)[number]["key"];

function matches(patterns: readonly RegExp[], text: string) {
  return patterns.some((p) => p.test(text));
}

export function matchesEquipment(ex: TaggableExercise, key: EquipmentKey | "bodyweight" | "compound"): boolean {
  const text = `${ex.name} ${ex.equipment || ""}`;
  if (key === "compound") return isCompound(ex);
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

export const EQUIPMENT_OPTIONS: { key: EquipmentKey | "bodyweight" | "compound"; label: string }[] = [
  { key: "compound", label: "Compound / 2-in-1" },
  ...EQUIPMENT_FILTERS.map((f) => ({ key: f.key as EquipmentKey, label: f.label })),
  { key: "bodyweight", label: "Bodyweight" },
];

export const MUSCLE_OPTIONS: { key: MuscleKey | "untagged"; label: string }[] = [
  ...MUSCLE_FILTERS.map((f) => ({ key: f.key as MuscleKey, label: f.label })),
  { key: "untagged", label: "Untagged" },
];

