import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  FastRatio,
  PlanWindow,
  ScheduleOverride,
  WeeklyScheduleDay,
} from "@/lib/resolveFastingWindow";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function useClientWeeklySchedule(clientId: string | null | undefined) {
  const qc = useQueryClient();

  const scheduleQ = useQuery({
    queryKey: ["client-weekly-schedule", clientId],
    queryFn: async (): Promise<WeeklyScheduleDay[]> => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("client_weekly_schedule" as any)
        .select("day_of_week, ratio, window_start_time, window_end_time, enabled")
        .eq("client_id", clientId)
        .order("day_of_week");
      if (error) throw error;
      // Return ONLY the days the client actually has saved. Filling the gaps
      // with a fabricated 16:8 / 8PM default made the calendar show phantom
      // times for clients who have no plan at all.
      return (data ?? []) as unknown as WeeklyScheduleDay[];
    },
    enabled: !!clientId,
  });

  const planWindowQ = useQuery({
    queryKey: ["client-plan-window", clientId],
    queryFn: async (): Promise<PlanWindow> => {
      if (!clientId) return { startDate: null, durationDays: null, runMode: null };
      const { data } = await supabase
        .from("client_feature_settings")
        .select("protocol_start_date, assigned_protocol_duration_days, protocol_run_mode")
        .eq("client_id", clientId)
        .maybeSingle();
      const row = data as any;
      return {
        startDate: row?.protocol_start_date ? String(row.protocol_start_date).slice(0, 10) : null,
        durationDays: row?.assigned_protocol_duration_days ?? null,
        runMode: row?.protocol_run_mode === "recurring" ? "recurring" : row?.protocol_run_mode === "one_time" ? "one_time" : null,
      };
    },
    enabled: !!clientId,
  });

  const overridesQ = useQuery({
    queryKey: ["client-schedule-overrides", clientId],
    queryFn: async (): Promise<ScheduleOverride[]> => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("client_schedule_overrides" as any)
        .select("id, label, start_date, end_date, schedule, active")
        .eq("client_id", clientId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ScheduleOverride[];
    },
    enabled: !!clientId,
  });

  const saveWeekly = useMutation({
    mutationFn: async (days: WeeklyScheduleDay[]) => {
      if (!clientId) throw new Error("No client");
      const rows = days.map((d) => ({
        client_id: clientId,
        day_of_week: d.day_of_week,
        ratio: d.ratio,
        window_start_time: d.window_start_time,
        window_end_time: d.window_end_time,
        enabled: d.enabled ?? true,
      }));
      const { error } = await supabase
        .from("client_weekly_schedule" as any)
        .upsert(rows, { onConflict: "client_id,day_of_week" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-weekly-schedule", clientId] });
      qc.invalidateQueries({ queryKey: ["ccp-settings", clientId] });
    },
  });

  const saveOverride = useMutation({
    mutationFn: async (
      override: Omit<ScheduleOverride, "id"> & { id?: string }
    ) => {
      if (!clientId) throw new Error("No client");
      const payload: any = {
        client_id: clientId,
        label: override.label,
        start_date: override.start_date,
        end_date: override.end_date,
        schedule: override.schedule,
        active: override.active,
      };
      if (override.id) payload.id = override.id;
      const { error } = await supabase
        .from("client_schedule_overrides" as any)
        .upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-schedule-overrides", clientId] });
    },
  });

  const deleteOverride = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("client_schedule_overrides" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-schedule-overrides", clientId] });
    },
  });

  return {
    weekly: scheduleQ.data,
    overrides: overridesQ.data,
    planWindow: planWindowQ.data,
    isLoading: scheduleQ.isLoading || overridesQ.isLoading,
    saveWeekly,
    saveOverride,
    deleteOverride,
  };
}

export { WEEKDAY_LABELS };