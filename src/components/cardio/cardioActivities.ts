export const DEFAULT_CARDIO_ACTIVITIES = [
  { name: "Running", icon: "running" },
  { name: "Walking", icon: "walking" },
  { name: "Cycling", icon: "bike" },
];
export const DEFAULT_ACTIVITIES = DEFAULT_CARDIO_ACTIVITIES;
export function getCardioIcon(name: string) { return "activity"; }
export function getIconComponent(iconName: string) { return null; }
