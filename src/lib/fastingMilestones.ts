/**
 * Fasting day-milestone celebration system.
 *
 * Fires encouragement messages when the user crosses 24h, 48h, 72h, etc.
 */

export interface FastingMilestone {
  /** Hours threshold (24, 48, 72 …) */
  hours: number;
  /** Day number completed (1, 2, 3 …) */
  day: number;
  emoji: string;
  title: string;
  /** Generates the body text. `daysRemaining` may be null for open-ended fasts. */
  body: (daysRemaining: number | null) => string;
}

const MILESTONES: FastingMilestone[] = [
  {
    hours: 24,
    day: 1,
    emoji: "🔥",
    title: "Day 1 Complete!",
    body: (rem) =>
      rem !== null && rem > 0
        ? `Incredible willpower! ${rem} more day${rem > 1 ? "s" : ""} to go — you've got this!`
        : "Incredible willpower! You crushed the first 24 hours!",
  },
  {
    hours: 48,
    day: 2,
    emoji: "💪",
    title: "Day 2 Complete!",
    body: (rem) =>
      rem !== null && rem > 0
        ? `Your body is deep in fat-burning mode. Only ${rem} day${rem > 1 ? "s" : ""} left!`
        : "Your body is deep in fat-burning mode. Keep going!",
  },
  {
    hours: 72,
    day: 3,
    emoji: "♻️",
    title: "Day 3 Complete!",
    body: (rem) =>
      rem !== null && rem > 0
        ? `Autophagy is in full effect — cellular renewal activated! ${rem} day${rem > 1 ? "s" : ""} remaining.`
        : "Autophagy is in full effect — cellular renewal activated!",
  },
  {
    hours: 96,
    day: 4,
    emoji: "🧬",
    title: "Day 4 Complete!",
    body: (rem) =>
      rem !== null && rem > 0
        ? `Elite territory! Stem cell regeneration is ramping up. ${rem} day${rem > 1 ? "s" : ""} to the finish!`
        : "Elite territory! Stem cell regeneration is ramping up!",
  },
  {
    hours: 120,
    day: 5,
    emoji: "🏆",
    title: "Day 5 Complete!",
    body: () => "Legendary discipline! You've completed 5 full days of fasting.",
  },
];

// Extend to day 7 for ultra-long fasts
for (let d = 6; d <= 7; d++) {
  MILESTONES.push({
    hours: d * 24,
    day: d,
    emoji: "⭐",
    title: `Day ${d} Complete!`,
    body: (rem) =>
      rem !== null && rem > 0
        ? `Day ${d} done — only ${rem} more to go! Unstoppable!`
        : `Day ${d} done — you are unstoppable!`,
  });
}

/**
 * Given elapsed hours and total target hours, returns any milestone
 * that has JUST been crossed (within the last check window).
 */
export function getMilestonesReached(elapsedHours: number): FastingMilestone[] {
  return MILESTONES.filter((m) => elapsedHours >= m.hours);
}

/**
 * Get the NEXT upcoming milestone (not yet reached).
 */
export function getNextMilestone(elapsedHours: number): FastingMilestone | null {
  return MILESTONES.find((m) => m.hours > elapsedHours) ?? null;
}

/**
 * Get the latest milestone that has been reached.
 */
export function getLatestMilestone(elapsedHours: number): FastingMilestone | null {
  const reached = getMilestonesReached(elapsedHours);
  return reached.length > 0 ? reached[reached.length - 1] : null;
}

/**
 * Calculate days remaining from current elapsed hours to target hours.
 */
export function daysRemainingInFast(elapsedHours: number, targetHours: number): number | null {
  if (targetHours <= 0) return null;
  const remainingHours = Math.max(0, targetHours - elapsedHours);
  return Math.ceil(remainingHours / 24);
}

/**
 * Build the current milestone banner text for display on the timer.
 * Returns null if no milestone has been reached yet (< 24h).
 */
export function getMilestoneBanner(
  elapsedHours: number,
  targetHours: number
): { emoji: string; title: string; body: string } | null {
  const latest = getLatestMilestone(elapsedHours);
  if (!latest) return null;
  const daysLeft = daysRemainingInFast(elapsedHours, targetHours);
  return {
    emoji: latest.emoji,
    title: latest.title,
    body: latest.body(daysLeft),
  };
}
