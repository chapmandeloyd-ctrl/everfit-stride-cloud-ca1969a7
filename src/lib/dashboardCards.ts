export interface DashboardCardConfig {
  key: string;
  label: string;
  visible: boolean;
}

export const DEFAULT_CARD_ORDER: DashboardCardConfig[] = [
  { key: "calendar", label: "Calendar Strip", visible: true },
  { key: "workouts", label: "Today's Workout", visible: true },
  { key: "fasting", label: "Fasting Protocol", visible: true },
  { key: "daily_journal", label: "Daily Journal", visible: true },
  { key: "assigned_plan", label: "Your Complete Plan", visible: false },
  { key: "coach_tip", label: "Coach Tip & Progress", visible: true },
  { key: "habits", label: "Habits", visible: true },
  { key: "nutrition", label: "Nutrition / Macros", visible: true },
  { key: "food_journal", label: "Food Journal", visible: true },
  { key: "step_tracker", label: "Step Tracker", visible: true },
  { key: "tasks", label: "Tasks", visible: true },
  { key: "progress", label: "My Progress", visible: true },
  { key: "game_stats", label: "Game Stats", visible: true },
  { key: "cardio", label: "Cardio Activity", visible: true },
];

export function mergeWithDefaults(saved: DashboardCardConfig[] | null): DashboardCardConfig[] {
  if (!saved || saved.length === 0) return [...DEFAULT_CARD_ORDER];

  const savedMap = new Map(saved.map((c) => [c.key, c]));

  // Start from saved order, preserving user's customizations
  const result: DashboardCardConfig[] = [];
  for (const card of saved) {
    const def = DEFAULT_CARD_ORDER.find((d) => d.key === card.key);
    if (def) {
      result.push({ ...def, visible: card.visible });
    }
  }

  // Insert any new default cards at their default position relative to neighbors
  for (let i = 0; i < DEFAULT_CARD_ORDER.length; i++) {
    const def = DEFAULT_CARD_ORDER[i];
    if (savedMap.has(def.key)) continue;

    // Find nearest preceding default card that exists in result
    let insertAt = result.length;
    for (let j = i - 1; j >= 0; j--) {
      const prevKey = DEFAULT_CARD_ORDER[j].key;
      const idx = result.findIndex((r) => r.key === prevKey);
      if (idx !== -1) {
        insertAt = idx + 1;
        break;
      }
    }
    result.splice(insertAt, 0, { ...def });
  }

  return result;
}
