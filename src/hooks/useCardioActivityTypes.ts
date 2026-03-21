export function useCardioActivityTypes() {
  return {
    activities: [] as any[],
    activityTypes: [] as any[],
    isLoading: false,
    refetch: () => {},
    addActivity: { mutate: (_data: any) => {} },
    updateActivity: { mutate: (_data: any) => {} },
    deleteActivity: { mutate: (_id: string) => {} },
  };
}
