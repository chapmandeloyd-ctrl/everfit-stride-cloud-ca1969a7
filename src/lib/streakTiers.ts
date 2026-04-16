/**
 * KSOM360 Streak Tier System
 *
 * Tiers based on current streak length:
 *   1–3  → Starter
 *   4–7  → Building
 *   8–14 → Locked In
 *   15–30 → Metabolic Flow
 *   30+  → KSOM Elite
 */

export interface StreakTierInfo {
  tier: string;
  color: string;       // tailwind text class
  bgColor: string;     // tailwind bg class
  pillColor: string;   // hex for pill accent
  emoji: string;
  nextTierAt: number | null; // streak days needed for next tier, null if max
}

export function getStreakTier(streak: number): StreakTierInfo {
  if (streak >= 30) return {
    tier: "KSOM Elite",
    color: "text-amber-400",
    bgColor: "bg-amber-500/15",
    pillColor: "#fbbf24",
    emoji: "👑",
    nextTierAt: null,
  };
  if (streak >= 15) return {
    tier: "Metabolic Flow",
    color: "text-purple-400",
    bgColor: "bg-purple-500/15",
    pillColor: "#c084fc",
    emoji: "🔥",
    nextTierAt: 30,
  };
  if (streak >= 8) return {
    tier: "Locked In",
    color: "text-sky-400",
    bgColor: "bg-sky-500/15",
    pillColor: "#38bdf8",
    emoji: "🔒",
    nextTierAt: 15,
  };
  if (streak >= 4) return {
    tier: "Building",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15",
    pillColor: "#34d399",
    emoji: "🧱",
    nextTierAt: 8,
  };
  return {
    tier: "Starter",
    color: "text-muted-foreground",
    bgColor: "bg-muted/40",
    pillColor: "#94a3b8",
    emoji: "🌱",
    nextTierAt: 4,
  };
}

export function getWeeklyLabel(pct: number): { label: string; color: string } {
  if (pct >= 90) return { label: "Elite", color: "text-amber-400" };
  if (pct >= 70) return { label: "Strong", color: "text-emerald-400" };
  if (pct >= 50) return { label: "Needs Work", color: "text-amber-400" };
  return { label: "Reset", color: "text-red-400" };
}
