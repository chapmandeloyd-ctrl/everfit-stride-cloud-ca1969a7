// Workout Block Types — shared across client WOD builder, admin builders, and voice guidance

export interface WorkoutBlockType {
  id: string;
  label: string;
  description: string;
  color: string;        // Tailwind bg class
  borderColor: string;  // Tailwind border class
  textColor: string;    // Tailwind text class
  voiceLabel: string;   // What the voice says
  emoji: string;
}

export const WORKOUT_BLOCK_TYPES: WorkoutBlockType[] = [
  {
    id: "warmup",
    label: "Warm-Up",
    description: "Light movements to prepare the body and prevent injury",
    color: "bg-amber-500/15",
    borderColor: "border-amber-500/40",
    textColor: "text-amber-700 dark:text-amber-400",
    voiceLabel: "Warm-Up",
    emoji: "🔥",
  },
  {
    id: "working_sets",
    label: "Working Sets",
    description: "Main strength or hypertrophy portion of the workout",
    color: "bg-blue-500/15",
    borderColor: "border-blue-500/40",
    textColor: "text-blue-700 dark:text-blue-400",
    voiceLabel: "Working Sets",
    emoji: "🏋️",
  },
  {
    id: "power",
    label: "Power / Explosive",
    description: "Plyometrics, Olympic lifts, and speed work",
    color: "bg-red-500/15",
    borderColor: "border-red-500/40",
    textColor: "text-red-700 dark:text-red-400",
    voiceLabel: "Power and Explosive",
    emoji: "💥",
  },
  {
    id: "conditioning",
    label: "Conditioning",
    description: "HIIT, sprints, rowing, bike intervals",
    color: "bg-orange-500/15",
    borderColor: "border-orange-500/40",
    textColor: "text-orange-700 dark:text-orange-400",
    voiceLabel: "Conditioning",
    emoji: "🫀",
  },
  {
    id: "accessory",
    label: "Accessory / Isolation",
    description: "Targeted muscle work to complement main lifts",
    color: "bg-purple-500/15",
    borderColor: "border-purple-500/40",
    textColor: "text-purple-700 dark:text-purple-400",
    voiceLabel: "Accessory",
    emoji: "🧱",
  },
  {
    id: "cooldown",
    label: "Cool Down / Mobility",
    description: "Stretching, foam rolling, and recovery movements",
    color: "bg-teal-500/15",
    borderColor: "border-teal-500/40",
    textColor: "text-teal-700 dark:text-teal-400",
    voiceLabel: "Cool Down",
    emoji: "🧘",
  },
  {
    id: "finisher",
    label: "Finisher",
    description: "Short high-intensity burnout to close the session",
    color: "bg-rose-500/15",
    borderColor: "border-rose-500/40",
    textColor: "text-rose-700 dark:text-rose-400",
    voiceLabel: "Finisher",
    emoji: "🏃",
  },
  {
    id: "skill",
    label: "Skill / Drill",
    description: "Sport-specific technique work like batting drills or agility",
    color: "bg-emerald-500/15",
    borderColor: "border-emerald-500/40",
    textColor: "text-emerald-700 dark:text-emerald-400",
    voiceLabel: "Skill and Drill",
    emoji: "🎯",
  },
  {
    id: "regular",
    label: "Regular",
    description: "Standard sets and reps with rest between exercises",
    color: "bg-gray-500/15",
    borderColor: "border-gray-500/40",
    textColor: "text-gray-700 dark:text-gray-400",
    voiceLabel: "Regular",
    emoji: "🏋️‍♂️",
  },
  {
    id: "circuit",
    label: "Circuit",
    description: "Cycle through exercises with minimal rest between",
    color: "bg-gray-500/15",
    borderColor: "border-gray-500/40",
    textColor: "text-gray-700 dark:text-gray-400",
    voiceLabel: "Circuit",
    emoji: "🔁",
  },
  {
    id: "superset",
    label: "Superset",
    description: "Pair exercises back-to-back for maximum efficiency",
    color: "bg-gray-500/15",
    borderColor: "border-gray-500/40",
    textColor: "text-gray-700 dark:text-gray-400",
    voiceLabel: "Superset",
    emoji: "⚡",
  },
  {
    id: "interval",
    label: "Interval",
    description: "Timed work and rest periods for cardio conditioning",
    color: "bg-gray-500/15",
    borderColor: "border-gray-500/40",
    textColor: "text-gray-700 dark:text-gray-400",
    voiceLabel: "Interval",
    emoji: "⏱️",
  },
  {
    id: "custom",
    label: "Custom Block",
    description: "Create your own block with a custom name",
    color: "bg-gray-500/15",
    borderColor: "border-gray-500/40",
    textColor: "text-gray-700 dark:text-gray-400",
    voiceLabel: "Custom",
    emoji: "✏️",
  },
];

export function getBlockType(id: string): WorkoutBlockType {
  return WORKOUT_BLOCK_TYPES.find((b) => b.id === id) || WORKOUT_BLOCK_TYPES[WORKOUT_BLOCK_TYPES.length - 1];
}

/** Extract block type from a section name saved in the database */
export function getBlockTypeFromSectionName(sectionName: string): WorkoutBlockType {
  // Check if section name starts with a known block type label
  for (const bt of WORKOUT_BLOCK_TYPES) {
    if (bt.id !== "custom" && sectionName.startsWith(bt.label)) {
      return bt;
    }
  }
  // Legacy: "Superset Block X" maps to working_sets
  if (sectionName.startsWith("Superset Block")) {
    return getBlockType("working_sets");
  }
  return getBlockType("custom");
}
