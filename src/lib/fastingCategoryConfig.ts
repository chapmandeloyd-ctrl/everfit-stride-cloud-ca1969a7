import { Circle, TrendingUp, Lightbulb, Zap, Heart, CalendarDays } from "lucide-react";

export interface CategoryConfig {
  label: string;
  icon: typeof Circle;
  color: string;
  bgColor: string;
  borderColor: string;
  glowGradient: string;
  cardSurfaceClass: string;
  cardBorderClass: string;
  cardShadowClass: string;
  /** Gradient for the embossed icon badge fill (PremiumPlanCard) */
  iconGradient: string;
  /** Soft tint gradient overlay on the card surface (PremiumPlanCard) */
  surfaceTintGradient: string;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  "JUST EXPLORING": {
    label: "JUST EXPLORING",
    icon: Circle,
    color: "text-blue-500",
    bgColor: "bg-blue-500/15",
    borderColor: "border-l-blue-500",
    glowGradient: "from-blue-400/70 via-blue-300/20 to-blue-600/70",
    cardSurfaceClass: "bg-gradient-to-br from-background via-blue-50/95 to-blue-100/80",
    cardBorderClass: "border-blue-200/90",
    cardShadowClass: "shadow-[0_24px_60px_-28px_rgba(59,130,246,0.45)]",
    iconGradient: "from-blue-400 via-blue-500 to-blue-700",
    surfaceTintGradient: "from-blue-500/15 via-transparent to-blue-700/10",
  },
  "LOSE WEIGHT": {
    label: "LOSE WEIGHT",
    icon: TrendingUp,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/15",
    borderColor: "border-l-emerald-500",
    glowGradient: "from-emerald-400/70 via-emerald-300/20 to-emerald-600/70",
    cardSurfaceClass: "bg-gradient-to-br from-background via-emerald-50/95 to-emerald-100/80",
    cardBorderClass: "border-emerald-200/90",
    cardShadowClass: "shadow-[0_24px_60px_-28px_rgba(16,185,129,0.42)]",
    iconGradient: "from-emerald-400 via-emerald-500 to-teal-700",
    surfaceTintGradient: "from-emerald-500/15 via-transparent to-teal-600/10",
  },
  "SHARPEN FOCUS": {
    label: "SHARPEN FOCUS",
    icon: Lightbulb,
    color: "text-violet-500",
    bgColor: "bg-violet-500/15",
    borderColor: "border-l-violet-500",
    glowGradient: "from-violet-400/70 via-violet-300/20 to-fuchsia-500/70",
    cardSurfaceClass: "bg-gradient-to-br from-background via-violet-50/95 to-fuchsia-100/80",
    cardBorderClass: "border-violet-200/90",
    cardShadowClass: "shadow-[0_24px_60px_-28px_rgba(139,92,246,0.42)]",
    iconGradient: "from-violet-400 via-violet-500 to-fuchsia-700",
    surfaceTintGradient: "from-violet-500/15 via-transparent to-fuchsia-600/10",
  },
  "BOOST ENERGY": {
    label: "BOOST ENERGY",
    icon: Zap,
    color: "text-amber-500",
    bgColor: "bg-amber-500/15",
    borderColor: "border-l-amber-500",
    glowGradient: "from-amber-400/70 via-amber-300/20 to-yellow-500/70",
    cardSurfaceClass: "bg-gradient-to-br from-background via-amber-50/95 to-yellow-100/80",
    cardBorderClass: "border-amber-200/90",
    cardShadowClass: "shadow-[0_24px_60px_-28px_rgba(245,158,11,0.42)]",
    iconGradient: "from-amber-400 via-orange-500 to-yellow-600",
    surfaceTintGradient: "from-amber-500/15 via-transparent to-orange-600/10",
  },
  "GET HEALTHIER": {
    label: "GET HEALTHIER",
    icon: Heart,
    color: "text-teal-500",
    bgColor: "bg-teal-500/15",
    borderColor: "border-l-teal-500",
    glowGradient: "from-teal-400/70 via-teal-300/20 to-cyan-500/70",
    cardSurfaceClass: "bg-gradient-to-br from-background via-teal-50/95 to-cyan-100/80",
    cardBorderClass: "border-teal-200/90",
    cardShadowClass: "shadow-[0_24px_60px_-28px_rgba(20,184,166,0.42)]",
    iconGradient: "from-teal-400 via-teal-500 to-cyan-700",
    surfaceTintGradient: "from-teal-500/15 via-transparent to-cyan-600/10",
  },
  "POPULAR SCHEDULES": {
    label: "POPULAR SCHEDULES",
    icon: CalendarDays,
    color: "text-sky-500",
    bgColor: "bg-sky-500/15",
    borderColor: "border-l-sky-500",
    glowGradient: "from-sky-400/70 via-sky-300/20 to-indigo-500/70",
    cardSurfaceClass: "bg-gradient-to-br from-background via-sky-50/95 to-indigo-100/80",
    cardBorderClass: "border-sky-200/90",
    cardShadowClass: "shadow-[0_24px_60px_-28px_rgba(14,165,233,0.42)]",
    iconGradient: "from-sky-400 via-blue-500 to-indigo-700",
    surfaceTintGradient: "from-sky-500/15 via-transparent to-indigo-600/10",
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
  switch ((level || "").toLowerCase()) {
    case "beginner":
    case "low":
      return "Beginner";
    case "intermediate":
    case "medium":
      return "Intermediate";
    case "advanced":
    case "high":
    case "experienced":
      return "Advanced";
    case "long_fasts":
    case "expert":
    case "extreme":
      return "Expert";
    default:
      return level ? level.charAt(0).toUpperCase() + level.slice(1) : "—";
  }
}

export function getDurationLabel(days: number): string {
  if (days === 0) return "Ongoing";
  const weeks = Math.ceil(days / 7);
  return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}
