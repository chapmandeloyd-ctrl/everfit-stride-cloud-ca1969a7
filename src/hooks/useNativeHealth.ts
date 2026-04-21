import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  isNativeHealthAvailable,
  checkNativeHealthPermissions,
  requestHealthPermissions,
  readTodayHealthData,
  syncHealthDataToBackend,
} from "@/lib/native-health";
import { toast } from "sonner";

// No aggressive timeout — let native iOS flow complete naturally

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useNativeHealth() {
  const clientId = useEffectiveClientId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isNative = Capacitor.isNativePlatform();

  // True when the trainer is impersonating a client.
  // HealthKit is tied to the iPhone's owner, NOT the impersonated identity,
  // so we must block connect attempts during impersonation to avoid the
  // "Connecting…" stuck state caused by mismatched contexts.
  const isImpersonating = !!user && !!clientId && clientId !== user.id;

  const refreshNativeHealthState = useCallback(async () => {
    const [latestAvailable, latestPermission] = await Promise.all([
      isNativeHealthAvailable(),
      checkNativeHealthPermissions(),
    ]);

    queryClient.setQueryData(["native-health-available"], latestAvailable);
    queryClient.setQueryData(["native-health-permissions"], latestPermission);

    return {
      latestAvailable,
      latestPermission,
    };
  }, [queryClient]);

  const { data: available = false } = useQuery({
    queryKey: ["native-health-available"],
    queryFn: isNativeHealthAvailable,
    enabled: isNative,
    staleTime: 30_000,
    retry: 2,
  });

  const { data: permissionGranted = false } = useQuery({
    queryKey: ["native-health-permissions"],
    queryFn: checkNativeHealthPermissions,
    enabled: isNative && available,
    staleTime: 10_000,
  });

  const {
    data: healthData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["native-health-data", clientId],
    queryFn: readTodayHealthData,
    enabled: isNative && permissionGranted,
    refetchInterval: 5 * 60 * 1000,
  });

  const confirmNativePermission = useCallback(async () => {
    const deadline = Date.now() + 20_000;

    while (Date.now() < deadline) {
      const { latestPermission } = await refreshNativeHealthState();

      if (latestPermission) {
        void refetch();
        return true;
      }

      await wait(1_500);
    }

    queryClient.setQueryData(["native-health-permissions"], false);
    return false;
  }, [queryClient, refetch, refreshNativeHealthState]);

  const startPermissionVerification = useCallback(() => {
    queryClient.setQueryData(["native-health-available"], true);

    void confirmNativePermission().then((verified) => {
      if (verified) {
        queryClient.setQueryData(["native-health-permissions"], true);
        toast.success("Health data access granted", { id: "apple-health-status" });
        return;
      }

      queryClient.setQueryData(["native-health-permissions"], false);
      toast.error("Apple Health did not finish connecting. Please try again.", { id: "apple-health-status" });
    });
  }, [confirmNativePermission, queryClient]);

  const requestPermissions = useCallback(async () => {
    console.log("[HealthKit] requestPermissions called");

    if (isImpersonating) {
      toast.error(
        "Apple Health can only be connected from the client's own iPhone — exit Preview as Client first.",
        { id: "apple-health-status" },
      );
      return false;
    }

    const granted = await requestHealthPermissions();

    if (granted) {
      // iOS deliberately returns "notDetermined" for read permissions even
      // after the user grants them (privacy feature). Trust the native
      // authorization result here instead of polling checkAuthorization,
      // which would otherwise hang and leave the UI stuck on "Connecting…".
      queryClient.setQueryData(["native-health-available"], true);
      queryClient.setQueryData(["native-health-permissions"], true);
      void refetch();
      toast.success("Health data access granted", { id: "apple-health-status" });
      return true;
    }

    queryClient.setQueryData(["native-health-permissions"], false);
    toast.error("Health permissions denied", { id: "apple-health-status" });
    return false;
  }, [isImpersonating, queryClient, refetch]);

  useEffect(() => {
    if (healthData && clientId) {
      syncHealthDataToBackend(clientId, supabase).then((synced) => {
        if (synced) {
          queryClient.invalidateQueries({ queryKey: ["health-stats"] });
        }
      });
    }
  }, [healthData, clientId, queryClient]);

  return {
    isNative,
    available: available || permissionGranted,
    permissionGranted,
    isImpersonating,
    healthData,
    isLoading,
    requestPermissions,
    refetch,
  };
}
