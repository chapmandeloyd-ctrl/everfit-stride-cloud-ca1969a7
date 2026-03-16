export function useHealthData(clientId?: string) {
  return { data: null, isLoading: false, heartRateData: [], activityData: [], sleepData: [], refetch: () => {} };
}
