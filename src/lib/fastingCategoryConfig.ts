import { Circle, TrendingUp, Lightbulb, Zap, Heart, CalendarDays } from "lucide-react";

export interface CategoryConfig {
  label: string;
  icon: typeof Circle;
  color: string;
  bgColor: string;
  borderColor: string;
  glowGradient: string;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  "JUST EXPLORING": {
    label: "JUST EXPLORING",
    icon: Circle,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-l-blue-500",
    glowGradient: "from-blue-400/40 via-transparent to-blue-600/40",
  },
  "LOSE WEIGHT": {
    label: "LOSE WEIGHT",
    icon: TrendingUp,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-l-emerald-500",
    glowGradient: "from-emerald-400/40 via-transparent to-emerald-600/40",
  },
  "SHARPEN FOCUS": {
    label: "SHARPEN FOCUS",
    icon: Lightbulb,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    borderColor: "border-l-purple-500",
    glowGradient: "from-purple-400/40 via-transparent to-purple-600/40",
  },
  "BOOST ENERGY": {
    label: "BOOST ENERGY",
    icon: Zap,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    borderColor: "border-l-yellow-500",
    glowGradient: "from-yellow-400/40 via-transparent to-yellow-600/40",
  },
  "GET HEALTHIER": {
    label: "GET HEALTHIER",
    icon: Heart,
    color: "text-teal-400",
    bgColor: "bg-teal-500/20",
    borderColor: "border-l-teal-500",
    glowGradient: "from-teal-400/40 via-transparent to-teal-600/40",
  },
  "POPULAR SCHEDULES": {
    label: "POPULAR SCHEDULES",
    icon: CalendarDays,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-l-blue-500",
    glowGradient: "from-blue-400/40 via-transparent to-blue-600/40",
  },
};

export const CATEGORY_ORDER = [
  "JUST EXPLORING",
  "LOSE WEIGHT",
  "SHARPEN FOCUS",
  "BOOST ENERGY",
  "GET HEALTHIER",
  "POPULAR SCHEDULES",
];

export function getDifficultyLabel(level: string): string {
  switch (level) {
    case "beginner": return "Beginner";
    case "intermediate": return "Intermediate";
    case "experienced": return "Experienced";
    default: return level;
  }
}

export function getDurationLabel(days: number): string {
  if (days === 0) return "Ongoing";
  const weeks = Math.ceil(days / 7);
  return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}
