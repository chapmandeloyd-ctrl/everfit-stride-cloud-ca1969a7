import { useQuery } from "@tanstack/react-query";
import { addDays, format, startOfWeek, startOfDay, endOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "./useEffectiveClientId";

export type RingKey = "fasting" | "weight" | "activity" | "sleep" | "water";
export type DayCompletion = Record<RingKey, boolean>;

export interface DailyRingsData {
  /** Map of yyyy-MM-dd → completion flags for the current week (Sun–Sat). */
  byDate: Record<string, DayCompletion>;
  /** Goals used for evaluation (so UI labels can stay in sync). */
  goals: {
    fastingHours: number;
    activitySteps: number;
    sleepHours: number;
    waterOz: number;
  };
}

const DEFAULT_GOALS = {
  fastingHours: 10,
  activitySteps: 10000,
  sleepHours: 6.5,
  waterOz: 64,
};

const EMPTY_DAY: DayCompletion = {
  fasting: false,
  weight: false,
  activity: false,
  sleep: false,
  water: false,
};

/**
 * Fetches real ring-completion data for the current week (Sun → Sat).
 * - Fasting: any fasting_log row whose ended_at falls on the day AND meets goal hours.
 * - Weight:  any health_data row of type 'weight' OR daily_checkins for that day.
 * - Activity:sum of health_data 'steps' for the day ≥ goal.
 * - Sleep:   daily_checkins.sleep_hours ≥ goal OR health_data 'sleep' ≥ goal.
 */
export function useDailyRings() {
  const clientId = useEffectiveClientId();

  return useQuery<DailyRingsData>({
    queryKey: ["daily-rings", clientId],
    enabled: !!clientId,
    staleTime: 60_000,
    queryFn: async () => {
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const weekEnd = addDays(weekStart, 6);
      const rangeStart = startOfDay(weekStart).toISOString();
      const rangeEnd = endOfDay(weekEnd).toISOString();

      // Initialize 7 empty days
      const byDate: Record<string, DayCompletion> = {};
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        byDate[format(d, "yyyy-MM-dd")] = { ...EMPTY_DAY };
      }

      // Pull the user's configured water goal if present
      const { data: waterGoalRow } = await supabase
        .from("water_goal_settings")
        .select("daily_goal_oz")
        .eq("client_id", clientId!)
        .maybeSingle();
      const goals = {
        ...DEFAULT_GOALS,
        waterOz: Number(waterGoalRow?.daily_goal_oz ?? DEFAULT_GOALS.waterOz),
      };

      // Resolve the Weight metric definition so we can read Smart Pace / AI snapshot weigh-ins
      const { data: weightDef } = await supabase
        .from("metric_definitions")
        .select("id")
        .eq("name", "Weight")
        .limit(1)
        .maybeSingle();

      let weightMetricId: string | null = null;
      if (weightDef?.id) {
        const { data: cm } = await supabase
          .from("client_metrics")
          .select("id")
          .eq("client_id", clientId!)
          .eq("metric_definition_id", weightDef.id)
          .limit(1)
          .maybeSingle();
        weightMetricId = cm?.id ?? null;
      }

      const [fastsRes, checkinsRes, healthRes, weightEntriesRes, waterRes] = await Promise.all([
        supabase
          .from("fasting_log")
          .select("ended_at, actual_hours, target_hours, status")
          .eq("client_id", clientId!)
          .gte("ended_at", rangeStart)
          .lte("ended_at", rangeEnd),
        supabase
          .from("daily_checkins")
          .select("checkin_date, sleep_hours")
          .eq("client_id", clientId!)
          .gte("checkin_date", format(weekStart, "yyyy-MM-dd"))
          .lte("checkin_date", format(weekEnd, "yyyy-MM-dd")),
        supabase
          .from("health_data")
          .select("data_type, value, recorded_at")
          .eq("client_id", clientId!)
          .in("data_type", ["steps", "sleep", "weight"])
          .gte("recorded_at", rangeStart)
          .lte("recorded_at", rangeEnd),
        weightMetricId
          ? supabase
              .from("metric_entries")
              .select("recorded_at")
              .eq("client_metric_id", weightMetricId)
              .gte("recorded_at", rangeStart)
              .lte("recorded_at", rangeEnd)
          : Promise.resolve({ data: [] as { recorded_at: string }[] }),
        supabase
          .from("water_log_entries")
          .select("amount_oz, logged_at")
          .eq("client_id", clientId!)
          .gte("logged_at", rangeStart)
          .lte("logged_at", rangeEnd),
      ]);

      // Fasting → mark day if any completed fast that day meets goal
      for (const row of fastsRes.data ?? []) {
        if (!row.ended_at) continue;
        const key = format(new Date(row.ended_at), "yyyy-MM-dd");
        if (!byDate[key]) continue;
        const hours = Number(row.actual_hours ?? 0);
        if (hours >= goals.fastingHours) {
          byDate[key].fasting = true;
        }
      }

      // Daily check-ins → weight (presence) + sleep (≥ goal hours)
      for (const row of checkinsRes.data ?? []) {
        const key = row.checkin_date as string;
        if (!byDate[key]) continue;
        // a check-in row counts as a weight log only if linked elsewhere; treat as logged
        // (we'll override with explicit health_data weight below if present)
        if (row.sleep_hours != null && Number(row.sleep_hours) >= goals.sleepHours) {
          byDate[key].sleep = true;
        }
      }

      // Health data aggregation
      const stepsByDay: Record<string, number> = {};
      const sleepByDay: Record<string, number> = {};
      for (const row of healthRes.data ?? []) {
        const key = format(new Date(row.recorded_at), "yyyy-MM-dd");
        if (!byDate[key]) continue;
        const v = Number(row.value ?? 0);
        if (row.data_type === "steps") {
          stepsByDay[key] = (stepsByDay[key] ?? 0) + v;
        } else if (row.data_type === "sleep") {
          sleepByDay[key] = Math.max(sleepByDay[key] ?? 0, v);
        } else if (row.data_type === "weight") {
          byDate[key].weight = true;
        }
      }

      // Smart Pace / AI snapshot weigh-ins (canonical weight source) → mark weight ring
      for (const row of weightEntriesRes.data ?? []) {
        if (!row.recorded_at) continue;
        const key = format(new Date(row.recorded_at), "yyyy-MM-dd");
        if (byDate[key]) byDate[key].weight = true;
      }

      for (const [key, steps] of Object.entries(stepsByDay)) {
        if (steps >= goals.activitySteps) byDate[key].activity = true;
      }
      for (const [key, hrs] of Object.entries(sleepByDay)) {
        if (hrs >= goals.sleepHours) byDate[key].sleep = true;
      }

      // Water → mark day if total oz logged ≥ goal
      const waterByDay: Record<string, number> = {};
      for (const row of (waterRes.data as { amount_oz: number; logged_at: string }[] | null) ?? []) {
        if (!row.logged_at) continue;
        const key = format(new Date(row.logged_at), "yyyy-MM-dd");
        if (!byDate[key]) continue;
        waterByDay[key] = (waterByDay[key] ?? 0) + Number(row.amount_oz ?? 0);
      }
      for (const [key, oz] of Object.entries(waterByDay)) {
        if (goals.waterOz > 0 && oz >= goals.waterOz) byDate[key].water = true;
      }

      return { byDate, goals };
    },
  });
}
