export function useHealthData(clientId?: string) {
  return { data: null, isLoading: false, heartRateData: [], activityData: [], sleepData: [], refetch: () => {}, error: null };
}
export function useHealthConnections(clientId?: string) {
  return { connections: [], data: null, isLoading: false, refetch: () => {}, error: null };
}
export function useRealtimeHealthData(...args: any[]) {
  return { data: null, isLoading: false };
}
export function useHealthStats(clientId?: string) {
  return { stats: null, data: null, isLoading: false, error: null };
}
export function useSyncHealth() {
  return { sync: async () => {}, mutate: () => {}, mutateAsync: async () => {}, isSyncing: false, isPending: false };
}
export function isNativePlatform() { return false; }
export function getPlatform() { return "web"; }
