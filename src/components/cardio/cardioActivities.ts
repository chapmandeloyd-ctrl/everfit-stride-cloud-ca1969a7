export const DEFAULT_CARDIO_ACTIVITIES = [
  { name: "Running", icon: "running", icon_name: "running" },
  { name: "Walking", icon: "walking", icon_name: "walking" },
  { name: "Cycling", icon: "bike", icon_name: "bike" },
];
export const DEFAULT_ACTIVITIES = DEFAULT_CARDIO_ACTIVITIES;
export function getCardioIcon(name: string) { return "activity"; }
export function getIconComponent(iconName: string) { return null; }
