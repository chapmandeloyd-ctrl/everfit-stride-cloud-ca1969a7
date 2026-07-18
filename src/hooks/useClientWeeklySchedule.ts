import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  FastRatio,
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
      const rows = (data ?? []) as unknown as WeeklyScheduleDay[];
      if (rows.length === 7) return rows;
      // Fill missing days with default 16:8: fast starts 8PM, breaks 12PM.
      const map = new Map(rows.map((r) => [r.day_of_week, r]));
      return Array.from({ length: 7 }, (_, dow) =>
        map.get(dow) ?? {
          day_of_week: dow,
          ratio: "16:8" as FastRatio,
          window_start_time: "20:00:00",
          window_end_time: "12:00:00",
          enabled: true,
        }
      );
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
    isLoading: scheduleQ.isLoading || overridesQ.isLoading,
    saveWeekly,
    saveOverride,
    deleteOverride,
  };
}

export { WEEKDAY_LABELS };