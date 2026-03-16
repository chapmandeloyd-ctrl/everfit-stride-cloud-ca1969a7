export function useHealthData(clientId?: string) {
  return { data: null, isLoading: false, heartRateData: [], activityData: [], sleepData: [], refetch: () => {} };
}
export function useHealthConnections(clientId?: string) {
  return { connections: [], isLoading: false, refetch: () => {} };
}
export function useRealtimeHealthData(clientId?: string, _interval?: number, _enabled?: boolean) {
  return { data: null, isLoading: false };
}
export function useHealthStats(clientId?: string) {
  return { stats: null, isLoading: false };
}
export function useSyncHealth() {
  return { sync: async () => {}, isSyncing: false };
}
export function isNativePlatform() { return false; }
export function getPlatform() { return "web"; }
