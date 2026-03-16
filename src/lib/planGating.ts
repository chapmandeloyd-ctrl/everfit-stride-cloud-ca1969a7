export type PlanGatingMetadata = { isLocked: boolean; reason?: string };
export function isPlanLocked(settings: any) { return false; }
export function canAccessPlan(settings: any, planId: string) { return true; }
export function evaluatePlanGating(settings: any, planId: string): PlanGatingMetadata { return { isLocked: false }; }
