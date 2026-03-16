export type PlanGatingMetadata = {
  id?: string;
  isLocked: boolean;
  isAccessible?: boolean;
  isCoachApproved?: boolean;
  isOptionalTool?: boolean;
  isVisible?: boolean;
  lockMessage?: string;
  reason?: string;
};
export function isPlanLocked(settings: any) { return false; }
export function canAccessPlan(settings: any, planId: string) { return true; }
export function evaluatePlanGating(settings: any, planId: string): PlanGatingMetadata {
  return { isLocked: false, isAccessible: true, isVisible: true, isCoachApproved: false, isOptionalTool: false };
}
