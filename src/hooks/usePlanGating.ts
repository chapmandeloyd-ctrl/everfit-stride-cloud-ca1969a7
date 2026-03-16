import type { PlanGatingMetadata, PlanGatingResult } from "@/lib/planGating";

export function usePlanGating(clientId?: string) {
  const evaluatePlan = (meta: PlanGatingMetadata): PlanGatingResult => {
    return {
      isLocked: false,
      isAccessible: true,
      isVisible: true,
      isCoachApproved: false,
      isOptionalTool: false,
    };
  };

  return { isLocked: false, canAccess: true, reason: null, evaluatePlan, isReady: true };
}
