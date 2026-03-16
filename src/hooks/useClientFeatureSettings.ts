export function useClientFeatureSettings(clientId?: string) {
  return { features: null, settings: null, isLoading: false, refetch: () => {} };
}
