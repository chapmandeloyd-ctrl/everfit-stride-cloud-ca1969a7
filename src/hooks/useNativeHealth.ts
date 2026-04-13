import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { supabase } from "@/integrations/supabase/client";
import {
  isNativeHealthAvailable,
  requestHealthPermissions,
  readTodayHealthData,
  syncHealthDataToBackend,
  NativeHealthData,
} from "@/lib/native-health";
import { toast } from "sonner";

export function useNativeHealth() {
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const [permissionGranted, setPermissionGranted] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  // Check availability
  const { data: available = false } = useQuery({
    queryKey: ["native-health-available"],
    queryFn: isNativeHealthAvailable,
    enabled: isNative,
    staleTime: Infinity,
  });

  // Read today's data
  const {
    data: healthData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["native-health-data", clientId],
    queryFn: readTodayHealthData,
    enabled: isNative && available && permissionGranted,
    refetchInterval: 5 * 60 * 1000, // every 5 min
  });

  // Request permissions
  const requestPermissions = useCallback(async () => {
    const granted = await requestHealthPermissions();
    setPermissionGranted(granted);
    if (granted) {
      toast.success("Health data access granted");
      refetch();
    } else {
      toast.error("Health permissions denied");
    }
    return granted;
  }, [refetch]);

  // Auto-request on mount if native
  useEffect(() => {
    if (isNative && available && !permissionGranted) {
      requestHealthPermissions().then((granted) => {
        setPermissionGranted(granted);
      });
    }
  }, [isNative, available, permissionGranted]);

  // Sync to backend whenever we get fresh data
  useEffect(() => {
    if (healthData && clientId) {
      syncHealthDataToBackend(clientId, supabase).then((synced) => {
        if (synced) {
          // Invalidate dashboard health stats so they refresh
          queryClient.invalidateQueries({ queryKey: ["health-stats"] });
        }
      });
    }
  }, [healthData, clientId, queryClient]);

  return {
    isNative,
    available,
    permissionGranted,
    healthData,
    isLoading,
    requestPermissions,
    refetch,
  };
}
