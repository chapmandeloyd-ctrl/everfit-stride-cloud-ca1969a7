/**
 * KSOM360 Level Progression System
 *
 * 10+ levels with auto-progression based on:
 * - Streak length
 * - Score consistency (daily score averages)
 * - Protocol completion
 *
 * Tiers:
 *   1–3 → Beginner
 *   4–6 → Builder
 *   7–9 → Performer
 *   10+ → Elite
 *
 * No manual level selection — auto progression only.
 */

export type LevelTier = "Beginner" | "Builder" | "Performer" | "Elite";

export interface LevelTierInfo {
  tier: LevelTier;
  color: string; // tailwind text class
  bgColor: string; // tailwind bg class
  ringColor: string; // hex for SVG
}

export function getLevelTier(level: number): LevelTierInfo {
  if (level >= 10) return { tier: "Elite", color: "text-amber-400", bgColor: "bg-amber-500/15", ringColor: "#fbbf24" };
  if (level >= 7) return { tier: "Performer", color: "text-purple-400", bgColor: "bg-purple-500/15", ringColor: "#c084fc" };
  if (level >= 4) return { tier: "Builder", color: "text-sky-400", bgColor: "bg-sky-500/15", ringColor: "#38bdf8" };
  return { tier: "Beginner", color: "text-emerald-400", bgColor: "bg-emerald-500/15", ringColor: "#34d399" };
}

// Points required to advance from level N to N+1
// Scales: 100 base + 30 per level
export function pointsForLevel(level: number): number {
  return 100 + level * 30;
}

/**
 * Daily points earned based on score label and streak.
 * - Perfect Day: 15 pts
 * - Strong Day: 10 pts
 * - Off Track: 2 pts
 * - Reset Needed: 0 pts
 * - Streak bonus: +1 per 3 streak days (max +10)
 */
export function dailyPoints(scoreLabel: string, streak: number): number {
  let base = 0;
  if (scoreLabel === "Perfect Day") base = 15;
  else if (scoreLabel === "Strong Day") base = 10;
  else if (scoreLabel === "Off Track") base = 2;

  const streakBonus = Math.min(Math.floor(streak / 3), 10);
  return base + streakBonus;
}

// Unlocks by level
export const LEVEL_UNLOCKS: Record<number, string> = {
  2: "Extended fasting protocols",
  3: "Additional meal options",
  4: "Builder badge",
  5: "Advanced protocol access",
  6: "Full meal library",
  7: "Performer badge",
  8: "Deeper coaching insights",
  9: "Custom protocol builder",
  10: "Elite badge & mastery status",
};
