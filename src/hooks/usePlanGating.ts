export function usePlanGating(clientId?: string) {
  return { isLocked: false, canAccess: true, reason: null, evaluatePlan: (_id: string) => ({ isLocked: false }), isReady: true };
}
