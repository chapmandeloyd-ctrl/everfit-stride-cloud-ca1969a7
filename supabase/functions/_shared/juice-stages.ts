// Mirror of src/lib/juiceStages.ts thresholds (hour + label + one-line blurb).
// Kept minimal on purpose: the app owns the full benefit copy, the server only
// needs to know WHEN a stage flips and what to call it.
export interface JuiceStageLite {
  hour: number;
  label: string;
  icon: string;
  blurb: string;
}

export const JUICE_ONLY: JuiceStageLite[] = [
  { hour: 0, label: "Digestive Rest", icon: "🥤", blurb: "Solid food stops and digestion eases." },
  { hour: 8, label: "Glycogen Burn", icon: "🟡", blurb: "Stored carbs start burning down." },
  { hour: 16, label: "Fat Switch", icon: "🔥", blurb: "Your body leans on fat for fuel." },
  { hour: 24, label: "Day One Down", icon: "🔵", blurb: "Light ketones, mind starting to clear." },
  { hour: 48, label: "Deep Reset", icon: "🟣", blurb: "Cravings fade and energy steadies." },
  { hour: 72, label: "Cellular Cleanup", icon: "♻️", blurb: "Repair pathways ramp up." },
  { hour: 96, label: "Clarity", icon: "✨", blurb: "Calm focus and deep rest." },
  { hour: 120, label: "Renewal", icon: "🧬", blurb: "Full five-day reset reached." },
  { hour: 168, label: "Extended Reset", icon: "🛡️", blurb: "A week of minimal digestive load." },
  { hour: 240, label: "Full Reset", icon: "👑", blurb: "The deepest reset APEXBEAST supports." },
];

export const JUICE_LIGHT: JuiceStageLite[] = [
  { hour: 0, label: "Digestive Ease", icon: "🥬", blurb: "Meals out, juice in." },
  { hour: 12, label: "Insulin Steady", icon: "🟢", blurb: "Blood sugar smooths out." },
  { hour: 24, label: "Energy Lift", icon: "⚡", blurb: "Lighter, steadier energy." },
  { hour: 48, label: "Craving Reset", icon: "🔵", blurb: "The sugar pull weakens." },
  { hour: 72, label: "Gut Rest", icon: "🌿", blurb: "Digestive system recovering." },
  { hour: 120, label: "Habit Reset", icon: "✨", blurb: "New defaults locking in." },
  { hour: 168, label: "Sustained Lean", icon: "👑", blurb: "A full week, modified." },
];

export function relevantStages(mode: string, totalHours: number): JuiceStageLite[] {
  const all = mode === "juice_plus_light" ? JUICE_LIGHT : JUICE_ONLY;
  const list = all.filter((s) => s.hour < totalHours);
  return list.length ? list : [all[0]];
}

export function currentStage(mode: string, elapsedHours: number, totalHours: number): JuiceStageLite {
  const list = relevantStages(mode, totalHours);
  return [...list].reverse().find((s) => elapsedHours >= s.hour) ?? list[0];
}
