export function useHealthData(..._args: any[]) {
  return { data: null, isLoading: false, heartRateData: [], activityData: [], sleepData: [], refetch: () => {}, error: null };
}
export function useHealthConnections(clientId?: string) {
  return { connections: [] as any[], data: [] as any[], isLoading: false, refetch: () => {}, error: null };
}
export function useRealtimeHealthData(..._args: any[]) {
  return { data: null, isLoading: false };
}
export function useHealthStats(clientId?: string) {
  return { stats: null, data: null, isLoading: false, error: null };
}
export function useSyncHealth() {
  return {
    sync: async () => ({ count: 0 }),
    mutate: () => {},
    mutateAsync: async () => ({ count: 0 }),
    isSyncing: false,
    isPending: false,
    count: 0,
  };
}
export function isNativePlatform() { return false; }
export function getPlatform() { return "web"; }
