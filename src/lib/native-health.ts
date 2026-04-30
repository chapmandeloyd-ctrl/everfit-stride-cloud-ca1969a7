/**
 * KSOM360 Native HealthKit Bridge
 * 
 * Uses @capgo/capacitor-health to read real device health data
 * (steps, calories, heart rate, weight, sleep) from Apple HealthKit.
 * 
 * Falls back gracefully on web — all methods return null when
 * the native plugin is unavailable.
 */

import { Capacitor } from "@capacitor/core";

const HEALTH_READ_TYPES = [
  "steps",
  "calories",
  "heartRate",
  "weight",
  "sleep",
] as const;

// Give iOS up to 60 seconds to show and complete the HealthKit permission sheet
const HEALTH_REQUEST_TIMEOUT_MS = 60_000;
const HEALTH_CHECK_TIMEOUT_MS = 6_000;
const HEALTH_PROBE_INTERVAL_MS = 1_500;
const HEALTH_PROBE_TIMEOUT_MS = 15_000;

const TIMEOUT_RESULT = Symbol("native-health-timeout");

type NativeHealthPlugin = {
  isAvailable?: () => Promise<boolean | { available?: boolean }>;
  requestAuthorization: (options: { read: string[]; write: string[] }) => Promise<unknown>;
  checkAuthorization?: (options: { read: string[]; write: string[] }) => Promise<{
    readAuthorized?: string[];
  }>;
  queryAggregated: (options: {
    dataType: string;
    startDate: string;
    endDate: string;
    bucket: string;
    aggregation: string;
  }) => Promise<any>;
  readSamples: (options: {
    dataType: string;
    startDate: string;
    endDate: string;
    limit: number;
  }) => Promise<any>;
};

let Health: NativeHealthPlugin | null = null;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | typeof TIMEOUT_RESULT> {
  const timeoutPromise: Promise<typeof TIMEOUT_RESULT> = delay(timeoutMs).then(
    (): typeof TIMEOUT_RESULT => TIMEOUT_RESULT,
  );

  return Promise.race<T | typeof TIMEOUT_RESULT>([
    promise,
    timeoutPromise,
  ]);
}

async function getHealth(): Promise<NativeHealthPlugin | null> {
  if (Health) return Health;
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import("@capgo/capacitor-health");
    Health = mod.Health as NativeHealthPlugin;
    return Health;
  } catch (err) {
    console.warn("[HealthKit] Plugin not available", err);
    return null;
  }
}

export interface NativeHealthData {
  steps: number | null;
  activeCalories: number | null;
  restingCalories: number | null;
  heartRate: number | null;
  weight: number | null;
  sleepMinutes: number | null;
  sleepSessions: Array<{ startedAt: string; endedAt: string }>;
}

/**
 * Check if native health is available on this device
 */
export async function isNativeHealthAvailable(): Promise<boolean> {
  const h = await getHealth();
  if (!h) return false;
  try {
    const result = typeof h.isAvailable === "function" ? await h.isAvailable() : true;
    if (typeof result === "boolean") return result;
    if (typeof result?.available === "boolean") return result.available;
    return true;
  } catch (err) {
    console.warn("[HealthKit] Availability check failed, treating plugin as present", err);
    return true;
  }
}

export async function checkNativeHealthPermissions(): Promise<boolean> {
  const h = await getHealth();
  if (!h || typeof h.checkAuthorization !== "function") return false;
  try {
    const result = await withTimeout(h.checkAuthorization({
      read: [...HEALTH_READ_TYPES],
      write: [],
    }), HEALTH_CHECK_TIMEOUT_MS);

    if (result === TIMEOUT_RESULT) {
      console.warn("[HealthKit] Permission status check timed out, probing read access instead");
      return await probeNativeHealthAccess(h);
    }

    return Array.isArray(result?.readAuthorized) && result.readAuthorized.length > 0;
  } catch (err) {
    console.warn("[HealthKit] Permission status check failed", err);
    return await probeNativeHealthAccess(h);
  }
}

function getAuthorizationArrays(result: unknown): {
  readAuthorized: string[];
  readDenied: string[];
} {
  if (!result || typeof result !== "object") {
    return {
      readAuthorized: [],
      readDenied: [],
    };
  }

  const payload = result as {
    readAuthorized?: string[];
    readDenied?: string[];
  };

  return {
    readAuthorized: Array.isArray(payload.readAuthorized) ? payload.readAuthorized : [],
    readDenied: Array.isArray(payload.readDenied) ? payload.readDenied : [],
  };
}

async function resolveAuthorizationResult(
  result: unknown,
  h: NativeHealthPlugin,
): Promise<boolean> {
  const { readAuthorized, readDenied } = getAuthorizationArrays(result);

  if (readAuthorized.length > 0) {
    return true;
  }

  if (readDenied.length > 0) {
    return false;
  }

  return await probeNativeHealthAccess(h);
}

/**
 * Request HealthKit permissions for all metrics we need.
 * On iOS, we wait for the FULL native authorization flow (up to 60s)
 * so that the iOS HealthKit permission sheet can actually appear.
 */
export async function requestHealthPermissions(): Promise<boolean> {
  const h = await getHealth();
  if (!h) {
    console.warn("[HealthKit] Plugin not available");
    return false;
  }

  console.log("[HealthKit] Calling native requestAuthorization...");

  try {
    const result = await withTimeout(
      h.requestAuthorization({
        read: [...HEALTH_READ_TYPES],
        write: [],
      }),
      HEALTH_REQUEST_TIMEOUT_MS,
    );

    if (result === TIMEOUT_RESULT) {
      console.warn("[HealthKit] Authorization request timed out after 60s");
      return false;
    }

    const { readAuthorized, readDenied } = getAuthorizationArrays(result);
    console.log(
      `[HealthKit] Native authorization returned (authorized=${readAuthorized.length}, denied=${readDenied.length})`,
    );

    return await resolveAuthorizationResult(result, h);
  } catch (err) {
    console.error("[HealthKit] Permission request failed:", err);
    return false;
  }
}

async function probeNativeHealthAccess(h: NativeHealthPlugin): Promise<boolean> {
  const now = new Date();
  const startDate = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
  const endDate = now.toISOString();

  try {
    const result = await withTimeout(
      h.queryAggregated({
        dataType: "steps",
        startDate,
        endDate,
        bucket: "day",
        aggregation: "sum",
      }),
      HEALTH_CHECK_TIMEOUT_MS,
    );

    if (result === TIMEOUT_RESULT) {
      return false;
    }

    return Array.isArray(result?.samples);
  } catch (err) {
    console.warn("[HealthKit] Read-access probe failed", err);
    return false;
  }
}

async function waitForNativeHealthAccess(h: NativeHealthPlugin): Promise<boolean> {
  const endTime = Date.now() + HEALTH_PROBE_TIMEOUT_MS;

  while (Date.now() < endTime) {
    if (await probeNativeHealthAccess(h)) {
      return true;
    }

    await delay(HEALTH_PROBE_INTERVAL_MS);
  }

  return false;
}

/**
 * Read today's health data from HealthKit
 */
export async function readTodayHealthData(): Promise<NativeHealthData | null> {
  const h = await getHealth();
  if (!h) return null;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = startOfDay.toISOString();
  const endDate = now.toISOString();

  try {
    const sleepRangeStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const [stepsRes, caloriesRes, hrRes, weightRes, sleepRes, sleepHistoryRes] =
      await Promise.allSettled([
        h.queryAggregated({ dataType: "steps", startDate, endDate, bucket: "day", aggregation: "sum" }),
        h.queryAggregated({ dataType: "calories", startDate, endDate, bucket: "day", aggregation: "sum" }),
        h.readSamples({ dataType: "heartRate", startDate, endDate, limit: 1 }),
        h.readSamples({ dataType: "weight", startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), endDate, limit: 1 }),
        h.readSamples({ dataType: "sleep", startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), endDate, limit: 1 }),
        h.readSamples({ dataType: "sleep", startDate: sleepRangeStart, endDate, limit: 200 }),
      ]);

    const steps =
      stepsRes.status === "fulfilled" ? stepsRes.value?.samples?.[0]?.value ?? null : null;
    const activeCalories =
      caloriesRes.status === "fulfilled"
        ? caloriesRes.value?.samples?.[0]?.value ?? null
        : null;
    const heartRate =
      hrRes.status === "fulfilled"
        ? hrRes.value?.samples?.[0]?.value ?? null
        : null;
    const weight =
      weightRes.status === "fulfilled"
        ? weightRes.value?.samples?.[0]?.value ?? null
        : null;

    let sleepMinutes: number | null = null;
    if (sleepRes.status === "fulfilled" && sleepRes.value?.samples?.[0]) {
      const s = sleepRes.value.samples[0];
      if (s.startDate && s.endDate) {
        sleepMinutes = Math.round(
          (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) /
            60000
        );
      } else if (s.value) {
        sleepMinutes = Math.round(s.value);
      }
    }

    const sleepSessions: Array<{ startedAt: string; endedAt: string }> = [];
    if (sleepHistoryRes.status === "fulfilled" && Array.isArray(sleepHistoryRes.value?.samples)) {
      for (const s of sleepHistoryRes.value.samples) {
        if (s.startDate && s.endDate) {
          sleepSessions.push({
            startedAt: new Date(s.startDate).toISOString(),
            endedAt: new Date(s.endDate).toISOString(),
          });
        }
      }
    }

    return {
      steps: steps != null ? Math.round(steps) : null,
      activeCalories: activeCalories != null ? Math.round(activeCalories) : null,
      restingCalories: null, // Requires separate basal energy query
      heartRate: heartRate != null ? Math.round(heartRate) : null,
      weight: weight != null ? Math.round(weight * 10) / 10 : null, // kg, 1 decimal
      sleepMinutes,
      sleepSessions,
    };
  } catch (err) {
    console.error("[HealthKit] Failed to read data:", err);
    return null;
  }
}

/**
 * Sync native HealthKit data to the backend (health_data table)
 * so the dashboard and trainer view stay updated.
 */
export async function syncHealthDataToBackend(
  clientId: string,
  supabase: any
): Promise<boolean> {
  const data = await readTodayHealthData();
  if (!data) return false;

  const now = new Date().toISOString();
  const entries: Array<{
    client_id: string;
    data_type: string;
    value: number;
    unit: string;
    recorded_at: string;
    source: string;
  }> = [];

  if (data.steps != null) {
    entries.push({
      client_id: clientId,
      data_type: "steps",
      value: data.steps,
      unit: "count",
      recorded_at: now,
      source: "apple_health",
    });
  }
  if (data.activeCalories != null) {
    entries.push({
      client_id: clientId,
      data_type: "active_energy",
      value: data.activeCalories,
      unit: "kcal",
      recorded_at: now,
      source: "apple_health",
    });
  }
  if (data.heartRate != null) {
    entries.push({
      client_id: clientId,
      data_type: "heart_rate",
      value: data.heartRate,
      unit: "bpm",
      recorded_at: now,
      source: "apple_health",
    });
  }
  if (data.weight != null) {
    // Convert kg to lbs for consistency with existing system
    const lbs = Math.round(data.weight * 2.20462 * 10) / 10;
    entries.push({
      client_id: clientId,
      data_type: "weight",
      value: lbs,
      unit: "lbs",
      recorded_at: now,
      source: "apple_health",
    });
  }
  if (data.sleepMinutes != null) {
    const hours = Math.round((data.sleepMinutes / 60) * 10) / 10;
    entries.push({
      client_id: clientId,
      data_type: "sleep",
      value: hours,
      unit: "hrs",
      recorded_at: now,
      source: "apple_health",
    });
  }

  if (entries.length === 0) return false;

  try {
    const { error } = await supabase.from("health_data").upsert(entries, {
      onConflict: "client_id,data_type,recorded_at",
      ignoreDuplicates: false,
    });
    if (error) {
      console.error("[HealthKit] Sync failed:", error);
      return false;
    }
    console.log(`[HealthKit] Synced ${entries.length} metrics to backend`);

    // Persist sleep intervals (bedtime → wake) for the depth-view chart.
    if (data.sleepSessions && data.sleepSessions.length > 0) {
      const sessionRows = data.sleepSessions.map((s) => ({
        client_id: clientId,
        started_at: s.startedAt,
        ended_at: s.endedAt,
        duration_minutes: Math.max(
          0,
          Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000),
        ),
        source: "apple_health",
      }));
      const { error: sleepErr } = await supabase
        .from("sleep_sessions")
        .upsert(sessionRows, {
          onConflict: "client_id,started_at,ended_at,source",
          ignoreDuplicates: true,
        });
      if (sleepErr) {
        console.warn("[HealthKit] sleep_sessions upsert failed:", sleepErr);
      } else {
        console.log(`[HealthKit] Synced ${sessionRows.length} sleep intervals`);
      }
    }

    // Smart Pace integration: if we synced a weight, push it through the engine.
    if (data.weight != null) {
      try {
        const lbs = Math.round(data.weight * 2.20462 * 10) / 10;
        const { applySmartPaceWeighIn } = await import("./smartPaceWeighIn");
        const sp = await applySmartPaceWeighIn({
          clientId,
          weightLbs: lbs,
          source: "healthkit",
        });
        if (sp.applied) {
          console.log("[SmartPace] HealthKit weigh-in processed:", sp.message);
        }
      } catch (e) {
        console.warn("[SmartPace] HealthKit pipe failed:", e);
      }
    }

    return true;
  } catch (err) {
    console.error("[HealthKit] Sync error:", err);
    return false;
  }
}
