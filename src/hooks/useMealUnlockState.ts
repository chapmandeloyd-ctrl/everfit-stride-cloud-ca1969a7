import { useConsistencyStreak } from "@/hooks/useConsistencyStreak";
import type { EatingPhase } from "@/hooks/useMealEngineState";

export type MealRole = "break_fast" | "mid_window" | "last_meal";

export interface MealUnlockState {
  streak: number;
  unlockedRoles: MealRole[];
  isRoleLocked: (role: MealRole) => boolean;
  unlockAtForRole: (role: MealRole) => number | null;
  isFullyUnlocked: boolean;
}

/**
 * Meal Unlock Progression:
 * - Day 0–2: Only break_fast meals visible
 * - Day 3–6: mid_window meals unlock
 * - Day 7+:  Full meal library (last_meal unlocks)
 */
const UNLOCK_THRESHOLDS: { role: MealRole; minStreak: number }[] = [
  { role: "break_fast", minStreak: 0 },
  { role: "mid_window", minStreak: 3 },
  { role: "last_meal", minStreak: 7 },
];

export function useMealUnlockState(): MealUnlockState {
  const { data: streak } = useConsistencyStreak();
  const currentStreak = streak?.currentStreak ?? 0;

  const unlockedRoles = UNLOCK_THRESHOLDS
    .filter((t) => currentStreak >= t.minStreak)
    .map((t) => t.role);

  const isRoleLocked = (role: MealRole) => !unlockedRoles.includes(role);

  const unlockAtForRole = (role: MealRole) => {
    const threshold = UNLOCK_THRESHOLDS.find((t) => t.role === role);
    if (!threshold || currentStreak >= threshold.minStreak) return null;
    return threshold.minStreak;
  };

  return {
    streak: currentStreak,
    unlockedRoles,
    isRoleLocked,
    unlockAtForRole,
    isFullyUnlocked: currentStreak >= 7,
  };
}

/**
 * Maps an eating phase to a meal role for filtering.
 */
export function phaseToRole(phase: EatingPhase): MealRole | null {
  switch (phase) {
    case "break_fast": return "break_fast";
    case "mid_window": return "mid_window";
    case "last_meal": return "last_meal";
    default: return null;
  }
}

/**
 * Gets the display label for a meal role.
 */
export function roleLabel(role: MealRole): string {
  switch (role) {
    case "break_fast": return "Break Fast";
    case "mid_window": return "Mid Window";
    case "last_meal": return "Last Meal";
  }
}
