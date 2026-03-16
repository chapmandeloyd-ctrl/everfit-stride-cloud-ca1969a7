export function useCardioActivityTypes() {
  return {
    activities: [] as any[],
    activityTypes: [] as any[],
    isLoading: false,
    refetch: () => {},
    addActivity: async (_data: any) => {},
    updateActivity: async (_id: string, _data: any) => {},
    deleteActivity: async (_id: string) => {},
  };
}
