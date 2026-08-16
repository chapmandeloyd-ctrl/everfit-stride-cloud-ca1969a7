import {
  resolveDayForDate,
  isWithinPlanWindow,
  timeToHour,
  breakFastHourFor,
  type WeeklyScheduleDay,
  type ScheduleOverride,
  type PlanWindow,
} from "@/lib/resolveFastingWindow";

export interface NextFastStart {
  /** Exact local datetime the fast begins. */
  at: Date;
  /** Calendar days between today and the start day (0 = today). */
  daysAway: number;
  day: WeeklyScheduleDay;
  startHour: number;
  breakHour: number;
}

function atHour(date: Date, hour: number): Date {
  const d = new Date(date);
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Scans forward up to `horizon` days for the next day that actually has a
 * fast scheduled (enabled, not eat-all-day, inside the plan window).
 */
export function findNextFastStart(
  weekly: WeeklyScheduleDay[] | null | undefined,
  overrides: ScheduleOverride[] | null | undefined,
  planWindow: PlanWindow | null | undefined,
  now: Date = new Date(),
  horizon = 14,
): NextFastStart | null {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i <= horizon; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    if (planWindow && !isWithinPlanWindow(planWindow, date)) continue;

    const day = resolveDayForDate(weekly ?? null, overrides ?? null, date);
    if (!day || day.enabled === false || day.ratio === "eat_all_day") continue;

    const startHour = timeToHour(day.window_start_time);
    const at = atHour(date, startHour);
    if (at.getTime() <= now.getTime()) continue;

    return {
      at,
      daysAway: i,
      day,
      startHour,
      breakHour: breakFastHourFor(day.ratio, startHour),
    };
  }
  return null;
}

export type RunwayPhase =
  | "far"
  | "wind_down"
  | "prep"
  | "start_day"
  | "in_fast"
  | "eating_window";

export interface RunwayContent {
  phase: RunwayPhase;
  eyebrow: string;
  headline: string;
  blurb: string;
  items: { id: string; label: string; hint?: string }[];
}

export function runwayPhaseFor(daysAway: number): RunwayPhase {
  if (daysAway <= 0) return "start_day";
  if (daysAway === 1) return "prep";
  if (daysAway === 2) return "wind_down";
  return "far";
}

/** Coaching content for each runway phase. `lastMeal` is a formatted time. */
export function runwayContent(
  phase: RunwayPhase,
  opts: { dayLabel: string; startTime: string; daysAway: number },
): RunwayContent {
  const { dayLabel, startTime, daysAway } = opts;

  switch (phase) {
    case "eating_window":
      return {
        phase,
        eyebrow: "Eating window",
        headline: `Window closes at ${startTime}`,
        blurb: `Your window is open until ${startTime} ${dayLabel === "today" ? "today" : dayLabel}, then the fast starts automatically. Eat like the next fast already started.`,
        items: [
          { id: "ew_protein", label: "Get your protein in first", hint: "Protein-forward meals carry you deepest into the fast" },
          { id: "ew_lastmeal", label: `Finish your last meal before ${startTime}` },
          { id: "ew_hydrate", label: "Hydrate now — water plus electrolytes" },
          { id: "ew_prep", label: "Have black coffee, tea, or sparkling water ready" },
        ],
      };
    case "in_fast":
      return {
        phase,
        eyebrow: "Fast in progress",
        headline: "Break this one well",
        blurb: `You're fasting right now — no prep needed. When the timer ends, how you break the fast matters as much as the fast itself. Your next window starts ${dayLabel} at ${startTime}.`,
        items: [
          { id: "if_broth", label: "Break with broth, protein, or something soft", hint: "Go slow — no big carb or fried meal first" },
          { id: "if_wait", label: "Wait 30-45 min before your real meal" },
          { id: "if_salt", label: "Keep electrolytes going while you fast" },
          { id: "if_water", label: "Water, black coffee or plain tea only until then" },
        ],
      };
    case "far":
      return {
        phase,
        eyebrow: "Runway",
        headline: `Nothing to change yet`,
        blurb: `Your first fast isn't until ${dayLabel}. Eat normally — we'll tell you exactly when to start prepping.`,
        items: [
          { id: "weigh", label: "Log a starting weigh-in", hint: "Gives your pace tracker a baseline" },
          { id: "water", label: "Drink water with every meal", hint: "Hydration now makes day one easier" },
          { id: "read", label: "Skim the fasting protocol you picked" },
        ],
      };
    case "wind_down":
      return {
        phase,
        eyebrow: "Wind-down day",
        headline: "Enjoy today",
        blurb: `Your fast starts ${dayLabel} at ${startTime}. Today is your free day — have the meal you've been wanting, then we tighten up tomorrow.`,
        items: [
          { id: "cheat", label: "Have your cheat meal or favorite meal today" },
          { id: "groceries", label: "Stock up: water, electrolytes, black coffee or tea" },
          { id: "clear", label: "Clear the snacks you know will tempt you" },
        ],
      };
    case "prep":
      return {
        phase,
        eyebrow: "Prep day",
        headline: "Set tomorrow up to be easy",
        blurb: `Tomorrow's fast starts at ${startTime}. What you do today decides how day one feels.`,
        items: [
          { id: "taper", label: "Taper sugar and refined carbs at dinner", hint: "Lower insulin = a smoother first fast" },
          { id: "protein", label: "Make dinner protein + healthy fat heavy", hint: "Keeps you full deep into the fast" },
          { id: "hydrate", label: "Hit your water goal today", hint: "Front-load hydration, don't play catch-up" },
          { id: "salt", label: "Add electrolytes — sodium, potassium, magnesium" },
          { id: "alcohol", label: "Skip alcohol tonight" },
          { id: "sleep", label: "Get to bed on time" },
        ],
      };
    default:
      return {
        phase,
        eyebrow: daysAway <= 0 ? "Start day" : "Start day",
        headline: "Today's the day",
        blurb: `Your fast starts at ${startTime} and the timer will begin automatically. Final calls before then.`,
        items: [
          { id: "lastmeal", label: `Finish your last meal before ${startTime}` },
          { id: "salt2", label: "Salt water or electrolytes before you close the window" },
          { id: "drinks", label: "Have black coffee, tea, or sparkling water ready" },
          { id: "plan", label: "Know what breaks the fast — protein first, go slow" },
        ],
      };
  }
}
