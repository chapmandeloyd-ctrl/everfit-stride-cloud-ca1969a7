import {
  Play,
  StopCircle,
  CheckCircle2,
  Utensils,
  Coffee,
  Award,
  Dumbbell,
  Scale,
  Edit3,
  Target,
  Flame,
  Bed,
  Footprints,
  Heart,
  type LucideIcon,
} from "lucide-react";

export type EventCategory =
  | "fasting"
  | "eating"
  | "workout"
  | "metrics"
  | "badges"
  | "trainer"
  | "habits"
  | "general";

export interface EventVisual {
  icon: LucideIcon;
  /** Tailwind classes for icon background + foreground */
  iconBg: string;
  iconFg: string;
  /** Label used in filter chips */
  categoryLabel: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  play: Play,
  "stop-circle": StopCircle,
  "check-circle": CheckCircle2,
  utensils: Utensils,
  coffee: Coffee,
  award: Award,
  dumbbell: Dumbbell,
  scale: Scale,
  edit: Edit3,
  target: Target,
  flame: Flame,
  bed: Bed,
  footprints: Footprints,
  heart: Heart,
};

const CATEGORY_VISUALS: Record<EventCategory, Omit<EventVisual, "icon">> = {
  fasting: { iconBg: "bg-primary/15", iconFg: "text-primary", categoryLabel: "Fasting" },
  eating: { iconBg: "bg-amber-500/15", iconFg: "text-amber-500", categoryLabel: "Eating" },
  workout: { iconBg: "bg-blue-500/15", iconFg: "text-blue-400", categoryLabel: "Workout" },
  metrics: { iconBg: "bg-emerald-500/15", iconFg: "text-emerald-400", categoryLabel: "Metrics" },
  badges: { iconBg: "bg-yellow-500/15", iconFg: "text-yellow-400", categoryLabel: "Badges" },
  trainer: { iconBg: "bg-purple-500/15", iconFg: "text-purple-400", categoryLabel: "Trainer" },
  habits: { iconBg: "bg-cyan-500/15", iconFg: "text-cyan-400", categoryLabel: "Habits" },
  general: { iconBg: "bg-muted", iconFg: "text-muted-foreground", categoryLabel: "Other" },
};

const TYPE_DEFAULT_ICON: Record<string, keyof typeof ICON_MAP> = {
  fast_started: "play",
  fast_ended_early: "stop-circle",
  fast_completed: "check-circle",
  session_ended_early: "stop-circle",
  eating_window_opened: "utensils",
  eating_window_closed: "coffee",
  meal_logged: "utensils",
  workout_started: "dumbbell",
  workout_completed: "dumbbell",
  weighin_logged: "scale",
  badge_earned: "award",
  coach_override: "edit",
  goal_set: "target",
  habit_completed: "flame",
};

export function getEventVisual(eventType: string, category: string, iconKey?: string | null): EventVisual {
  const cat = (CATEGORY_VISUALS[category as EventCategory] ?? CATEGORY_VISUALS.general);
  const key = iconKey ?? TYPE_DEFAULT_ICON[eventType] ?? "edit";
  const icon = ICON_MAP[key] ?? Edit3;
  return { ...cat, icon };
}

export const CATEGORY_FILTERS: { value: EventCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "fasting", label: "Fasting" },
  { value: "eating", label: "Eating" },
  { value: "workout", label: "Workout" },
  { value: "metrics", label: "Metrics" },
  { value: "badges", label: "Badges" },
  { value: "trainer", label: "Trainer" },
];