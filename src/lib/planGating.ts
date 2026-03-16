export type PlanGatingMetadata = {
  id?: string;
  name?: string;
  engine_allowed?: string[];
  min_level_required?: number;
  max_level_allowed?: number | null;
  plan_type?: string;
  intensity_tier?: string;
  is_extended_fast?: boolean;
  is_youth_safe?: boolean;
  isLocked?: boolean;
  isAccessible?: boolean;
  isCoachApproved?: boolean;
  isOptionalTool?: boolean;
  isVisible?: boolean;
  lockMessage?: string;
  reason?: string;
};

export type PlanGatingResult = {
  isLocked: boolean;
  isAccessible: boolean;
  isCoachApproved: boolean;
  isOptionalTool: boolean;
  isVisible: boolean;
  lockMessage?: string;
};

export function isPlanLocked(settings: any) { return false; }
export function canAccessPlan(settings: any, planId: string) { return true; }
export function evaluatePlanGating(settings: any, planId: string): PlanGatingResult {
  return { isLocked: false, isAccessible: true, isVisible: true, isCoachApproved: false, isOptionalTool: false };
}
