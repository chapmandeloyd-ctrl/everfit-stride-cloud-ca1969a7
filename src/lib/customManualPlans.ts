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
      "Control your fasting by opening fasting and eating windows manually.",
    fastHours: 0,
    eatHours: 0,
    manual: true,
    defaultOpenHour: 8,
    accent: "text-violet-400",
  },
  {
    id: "easy-start",
    name: "Easy Start",
    tagline: "Perfect for beginners",
    description:
      "Include your sleep hours in the fasting period and eat as usual.",
    fastHours: 12,
    eatHours: 12,
    lockedEat: true,
    defaultOpenHour: 8,
    accent: "text-amber-300",
  },
  {
    id: "daily",
    name: "Daily Plan",
    tagline: "Make fasting a daily pattern",
    description:
      "Your eating window and fasting start at the same time every day.",
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
      "Adjust your eating window to fit your schedule and how you feel.",
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
      "Vary your eating window between 0.5h and 6h.",
    fastHours: 22,
    eatHours: 2,
    eatRange: [1, 6],
    defaultOpenHour: 18,
    accent: "text-rose-300",
  },
  {
    id: "warrior",
    name: "The Warrior Diet",
    tagline: "One of the strictest plans",
    description:
      "Fast all day, then eat one abundant meal in the evening.",
    fastHours: 20,
    eatHours: 4,
    lockedEat: true,
    defaultOpenHour: 13,
    accent: "text-pink-400",
  },
  {
    id: "fasting-goal",
    name: "Fasting Goal",
    tagline: "Don't watch the clock",
    description:
      "Focus on how much you're fasting or eating instead of fixed times.",
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