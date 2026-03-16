export function usePlanGating(clientId?: string) {
  return { isLocked: false, canAccess: true, reason: null };
}
