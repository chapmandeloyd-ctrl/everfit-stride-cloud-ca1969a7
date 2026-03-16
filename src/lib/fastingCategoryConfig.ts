export const CATEGORY_CONFIG: Record<string, any> = {};
export const CATEGORY_ORDER: string[] = [];
export function getDurationLabel(hours: number) { return `${hours}h`; }
export function getDifficultyLabel(level: number) { return level <= 1 ? "Easy" : level <= 3 ? "Medium" : "Hard"; }
export default CATEGORY_CONFIG;
