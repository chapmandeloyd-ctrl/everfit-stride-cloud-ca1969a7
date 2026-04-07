import {
  Activity, Bike, Footprints, Waves, Mountain, Zap, Heart,
  Timer, Flame, Wind, Snowflake, Dumbbell, type LucideIcon
} from "lucide-react";

export type TargetType = "time" | "distance" | "calories" | "open";

export const ICON_OPTIONS: { name: string; label: string; icon: LucideIcon }[] = [
  { name: "activity", label: "Activity", icon: Activity },
  { name: "running", label: "Running", icon: Footprints },
  { name: "walking", label: "Walking", icon: Footprints },
  { name: "bike", label: "Cycling", icon: Bike },
  { name: "swimming", label: "Swimming", icon: Waves },
  { name: "hiking", label: "Hiking", icon: Mountain },
  { name: "hiit", label: "HIIT", icon: Zap },
  { name: "cardio", label: "Cardio", icon: Heart },
  { name: "timer", label: "Timer", icon: Timer },
  { name: "flame", label: "Flame", icon: Flame },
  { name: "wind", label: "Wind", icon: Wind },
  { name: "snow", label: "Snow", icon: Snowflake },
  { name: "strength", label: "Strength", icon: Dumbbell },
];

export const DEFAULT_CARDIO_ACTIVITIES = [
  { name: "Running", icon: "running", icon_name: "running" },
  { name: "Walking", icon: "walking", icon_name: "walking" },
  { name: "Cycling", icon: "bike", icon_name: "bike" },
];

export const DEFAULT_ACTIVITIES = DEFAULT_CARDIO_ACTIVITIES;

export function getCardioIcon(name: string): string {
  return ICON_OPTIONS.find((o) => o.name === name)?.name || "activity";
}

export function getIconComponent(iconName: string): LucideIcon {
  return ICON_OPTIONS.find((o) => o.name === iconName)?.icon || Activity;
}
