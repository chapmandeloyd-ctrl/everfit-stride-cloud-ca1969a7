import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import type { KetoTypeCode } from "@/lib/ketoTypes";

export interface PlaybookSchedule {
  id: string;
  trainer_id: string;
  protocol_id: string | null;
  client_id: string | null;
  keto_mode: "simple" | "advanced";
  default_keto_type: KetoTypeCode | null;
  active_days: number[];
  overrides: { weekday: number; keto_type: KetoTypeCode }[];
  items: PlaybookItem[];
}

export interface PlaybookItem {
  id: string;
  order_index: number;
  label: string;
  time_of_day: string | null;
  relative_trigger: string | null;
  offset_minutes: number | null;
  note: string | null;
  supplement_id: string | null;
  keto_type_filter: string[] | null;
  supplement?: { id: string; name: string; default_dose: string | null } | null;
}

/** Reads the playbook schedule (client-specific first, falling back to trainer template) for a protocol. */
export function usePlaybookSchedule(protocolId: string | null | undefined) {
  const clientId = useEffectiveClientId();
  return useQuery({
    queryKey: ["playbook-schedule", clientId, protocolId],
    enabled: !!clientId && !!protocolId,
    queryFn: async (): Promise<PlaybookSchedule | null> => {
      const { data: schedules, error } = await supabase
        .from("protocol_daily_schedules" as any)
        .select("*")
        .eq("protocol_id", protocolId!)
        .or(`client_id.eq.${clientId},client_id.is.null`);
      if (error) throw error;
      if (!schedules || schedules.length === 0) return null;
      // Prefer client-specific over template
      const list = schedules as any[];
      const schedule = list.find((s) => s.client_id === clientId) ?? list[0];

      const [overridesRes, itemsRes] = await Promise.all([
        supabase
          .from("protocol_schedule_keto_overrides" as any)
          .select("weekday, keto_type")
          .eq("schedule_id", schedule.id),
        supabase
          .from("protocol_schedule_items" as any)
          .select("*, supplement:supplements(id, name, default_dose)")
          .eq("schedule_id", schedule.id)
          .order("order_index"),
      ]);

      return {
        ...schedule,
        overrides: (overridesRes.data as any[]) ?? [],
        items: (itemsRes.data as any[]) ?? [],
      } as PlaybookSchedule;
    },
  });
}