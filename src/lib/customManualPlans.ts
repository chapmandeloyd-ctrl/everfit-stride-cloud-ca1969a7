export interface CustomManualPlan {
  id: string;
  name: string;
  tagline: string;
  description: string;
  fastHours: number;
  eatHours: number;
  /** When set, eat-window duration cannot be changed */
  lockedEat?: boolean;
  /** When set, fast duration cannot be changed */
  lockedFast?: boolean;
  /** When true, no window times — purely manual open/close */
  manual?: boolean;
  /** Goal-style: only durations, no clock window */
  goalMode?: boolean;
  /** Default eating window opens at this hour (0-23) */
  defaultOpenHour: number;
  /** Allowed eat-hours range when adjustable */
  eatRange?: [number, number];
  /** Allowed fast-hours range when adjustable (goal mode only) */
  fastRange?: [number, number];
  accent: string; // Tailwind color class
}

export const CUSTOM_MANUAL_PLANS: CustomManualPlan[] = [
  {
    id: "manual",
    name: "Manual Plan",
    tagline: "Go your own pace",
    description:
      "Take full control of your fasting. Open and close your eating window whenever you want — no fixed schedule, no pressure. Perfect for days when life doesn't follow a clock and you want to listen to your body instead.",
    fastHours: 0,
    eatHours: 0,
    manual: true,
    defaultOpenHour: 8,
    accent: "text-violet-400",
  },
  {
    id: "daily",
    name: "Daily Plan",
    tagline: "Make fasting a daily pattern",
    description:
      "Build a rhythm your body can rely on. Your eating window opens and closes at the same time every day, training your metabolism, hunger and energy to follow a steady pattern. The simplest way to turn fasting into a real habit.",
    fastHours: 14,
    eatHours: 10,
    eatRange: [8, 12],
    defaultOpenHour: 9,
    accent: "text-emerald-400",
  },
  {
    id: "flexible-light",
    name: "Flexible Light",
    tagline: "Good for getting started",
    description:
      "An excellent plan to start your fasting journey. Adjust your eating window to fit your schedule and how you feel each day, and slowly find the perfect rhythm of fasting that works for your body and your life.",
    fastHours: 15,
    eatHours: 9,
    eatRange: [6, 10],
    defaultOpenHour: 9,
    accent: "text-teal-300",
  },
  {
    id: "flexible-advanced",
    name: "Flexible Advanced",
    tagline: "Adjust your fasting goals",
    description:
      "For experienced fasters ready to go deeper. Vary your eating window between 1 and 6 hours to push into longer fasts, deeper ketosis and stronger autophagy — while still keeping the flexibility to adapt to your day.",
    fastHours: 22,
    eatHours: 2,
    eatRange: [1, 6],
    defaultOpenHour: 18,
    accent: "text-rose-300",
  },
  {
    id: "fasting-goal",
    name: "Fasting Goal",
    tagline: "Don't watch the clock",
    description:
      "Stop watching the clock and focus on the goal. Choose how long you want to fast or how long you want to eat, and just hit the target — no fixed open or close times. Ideal for unpredictable days and travel.",
    fastHours: 19,
    eatHours: 5,
    goalMode: true,
    fastRange: [12, 24],
    eatRange: [1, 8],
    defaultOpenHour: 12,
    accent: "text-fuchsia-400",
  },
];

export function getCustomManualPlan(id: string): CustomManualPlan | undefined {
  return CUSTOM_MANUAL_PLANS.find((p) => p.id === id);
}