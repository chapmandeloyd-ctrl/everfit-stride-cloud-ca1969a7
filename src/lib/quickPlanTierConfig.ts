/**
 * Quick Fasting Plan – 15-Level Tier Configuration
 *
 * Visual style: "Aurora Gradient" – warm-to-cool gradient cards
 * with frosted glass overlays, distinct from the protocol Glassmorphism.
 */

import {
  Sprout,
  Leaf,
  TreePine,
  Flame,
  Zap,
  Mountain,
  Crown,
  type LucideIcon,
} from "lucide-react";

export interface LevelTierConfig {
  label: string;
  subtitle: string;
  levels: number[];
  icon: LucideIcon;
  /** Tailwind gradient for the card background */
  cardGradient: string;
  /** Accent color class for text highlights */
  accentColor: string;
  /** Glow shadow class */
  glowShadow: string;
  /** Border accent */
  borderClass: string;
  /** Badge bg */
  badgeBg: string;
  /** Gradient for the embossed icon badge fill (PremiumPlanCard) */
  iconGradient: string;
  /** Soft tint gradient overlay on the card surface (PremiumPlanCard) */
  surfaceTintGradient: string;
}

export const LEVEL_TIERS: LevelTierConfig[] = [
  {
    label: "Beginner",
    subtitle: "Building the foundation",
    levels: [1, 2],
    icon: Sprout,
    cardGradient: "from-emerald-500/20 via-teal-400/10 to-cyan-500/20",
    accentColor: "text-emerald-500",
    glowShadow: "shadow-[0_20px_50px_-20px_rgba(16,185,129,0.4)]",
    borderClass: "border-emerald-400/30",
    badgeBg: "bg-emerald-500/15",
    iconGradient: "from-emerald-400 via-teal-500 to-cyan-700",
    surfaceTintGradient: "from-emerald-500/15 via-transparent to-cyan-600/10",
  },
  {
    label: "Milestone",
    subtitle: "The golden ratio",
    levels: [3],
    icon: Leaf,
    cardGradient: "from-amber-500/20 via-yellow-400/10 to-orange-500/20",
    accentColor: "text-amber-500",
    glowShadow: "shadow-[0_20px_50px_-20px_rgba(245,158,11,0.4)]",
    borderClass: "border-amber-400/30",
    badgeBg: "bg-amber-500/15",
    iconGradient: "from-amber-400 via-yellow-500 to-orange-600",
    surfaceTintGradient: "from-amber-500/15 via-transparent to-orange-600/10",
  },
  {
    label: "Progressive",
    subtitle: "Pushing boundaries",
    levels: [4, 5, 6, 7, 8, 9, 10],
    icon: TreePine,
    cardGradient: "from-blue-500/20 via-indigo-400/10 to-violet-500/20",
    accentColor: "text-blue-500",
    glowShadow: "shadow-[0_20px_50px_-20px_rgba(59,130,246,0.4)]",
    borderClass: "border-blue-400/30",
    badgeBg: "bg-blue-500/15",
    iconGradient: "from-blue-400 via-indigo-500 to-violet-700",
    surfaceTintGradient: "from-blue-500/15 via-transparent to-violet-600/10",
  },
  {
    label: "Landmark",
    subtitle: "Full-day fast",
    levels: [11],
    icon: Flame,
    cardGradient: "from-rose-500/20 via-pink-400/10 to-red-500/20",
    accentColor: "text-rose-500",
    glowShadow: "shadow-[0_20px_50px_-20px_rgba(244,63,94,0.4)]",
    borderClass: "border-rose-400/30",
    badgeBg: "bg-rose-500/15",
    iconGradient: "from-rose-400 via-pink-500 to-red-700",
    surfaceTintGradient: "from-rose-500/15 via-transparent to-red-600/10",
  },
  {
    label: "Extended",
    subtitle: "Deep metabolic work",
    levels: [12, 13],
    icon: Mountain,
    cardGradient: "from-purple-500/20 via-fuchsia-400/10 to-violet-500/20",
    accentColor: "text-purple-500",
    glowShadow: "shadow-[0_20px_50px_-20px_rgba(168,85,247,0.4)]",
    borderClass: "border-purple-400/30",
    badgeBg: "bg-purple-500/15",
    iconGradient: "from-purple-400 via-fuchsia-500 to-violet-700",
    surfaceTintGradient: "from-purple-500/15 via-transparent to-violet-600/10",
  },
  {
    label: "Elite",
    subtitle: "KSOM mastery",
    levels: [14, 15],
    icon: Crown,
    cardGradient: "from-yellow-400/20 via-amber-300/10 to-orange-400/20",
    accentColor: "text-yellow-500",
    glowShadow: "shadow-[0_20px_50px_-20px_rgba(234,179,8,0.45)]",
    borderClass: "border-yellow-400/30",
    badgeBg: "bg-yellow-500/15",
    iconGradient: "from-yellow-400 via-amber-500 to-orange-600",
    surfaceTintGradient: "from-yellow-500/15 via-transparent to-orange-600/10",
  },
];

export function getTierForLevel(level: number): LevelTierConfig {
  return LEVEL_TIERS.find((t) => t.levels.includes(level)) ?? LEVEL_TIERS[0];
}

export function getIntensityLabel(tier: string | null): string {
  switch (tier) {
    case "low": return "Low";
    case "medium": return "Moderate";
    case "high": return "High";
    case "extreme": return "Extreme";
    default: return "—";
  }
}
