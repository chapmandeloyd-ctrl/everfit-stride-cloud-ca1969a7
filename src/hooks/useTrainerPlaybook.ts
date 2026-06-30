import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { KetoTypeCode } from "@/lib/ketoTypes";

export interface Supplement {
  id: string;
  trainer_id: string;
  name: string;
  default_dose: string | null;
  default_timing: string | null;
  notes: string | null;
  is_active: boolean;
}

export function useSupplements() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["supplements", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Supplement[]> => {
      const { data, error } = await supabase
        .from("supplements" as any)
        .select("*")
        .eq("trainer_id", user!.id)
        .order("name");
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (s: Partial<Supplement> & { name: string }) => {
      const payload: any = { ...s, trainer_id: user!.id };
      const { data, error } = await supabase
        .from("supplements" as any)
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplements"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplements" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplements"] }),
  });

  return { ...query, upsert, remove };
}

export interface TrainerSchedule {
  id: string;
  trainer_id: string;
  protocol_id: string | null;
  client_id: string | null;
  keto_mode: "simple" | "advanced";
  default_keto_type: KetoTypeCode | null;
  active_days: number[];
}

export function useTrainerSchedule(protocolId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const scheduleQ = useQuery({
    queryKey: ["trainer-schedule", user?.id, protocolId],
    enabled: !!user?.id && !!protocolId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocol_daily_schedules" as any)
        .select("*")
        .eq("trainer_id", user!.id)
        .eq("protocol_id", protocolId!)
        .is("client_id", null)
        .maybeSingle();
      if (error) throw error;
      return data as any as TrainerSchedule | null;
    },
  });

  const overridesQ = useQuery({
    queryKey: ["trainer-schedule-overrides", scheduleQ.data?.id],
    enabled: !!scheduleQ.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocol_schedule_keto_overrides" as any)
        .select("*")
        .eq("schedule_id", scheduleQ.data!.id);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const itemsQ = useQuery({
    queryKey: ["trainer-schedule-items", scheduleQ.data?.id],
    enabled: !!scheduleQ.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocol_schedule_items" as any)
        .select("*, supplement:supplements(id, name, default_dose)")
        .eq("schedule_id", scheduleQ.data!.id)
        .order("order_index");
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const upsertSchedule = useMutation({
    mutationFn: async (s: Partial<TrainerSchedule>) => {
      const payload: any = { ...s, trainer_id: user!.id, protocol_id: protocolId, client_id: null };
      const { data, error } = await supabase
        .from("protocol_daily_schedules" as any)
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trainer-schedule"] }),
  });

  const setOverride = useMutation({
    mutationFn: async (o: { weekday: number; keto_type: KetoTypeCode | null }) => {
      const sid = scheduleQ.data?.id;
      if (!sid) throw new Error("No schedule");
      if (o.keto_type === null) {
        const { error } = await supabase
          .from("protocol_schedule_keto_overrides" as any)
          .delete()
          .eq("schedule_id", sid)
          .eq("weekday", o.weekday);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("protocol_schedule_keto_overrides" as any)
          .upsert(
            { schedule_id: sid, weekday: o.weekday, keto_type: o.keto_type },
            { onConflict: "schedule_id,weekday" }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trainer-schedule-overrides"] }),
  });

  const upsertItem = useMutation({
    mutationFn: async (it: any) => {
      const sid = scheduleQ.data?.id;
      if (!sid) throw new Error("No schedule");
      const payload = { ...it, schedule_id: sid };
      const { error } = await supabase.from("protocol_schedule_items" as any).upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trainer-schedule-items"] }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("protocol_schedule_items" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trainer-schedule-items"] }),
  });

  return {
    schedule: scheduleQ.data,
    overrides: overridesQ.data ?? [],
    items: itemsQ.data ?? [],
    isLoading: scheduleQ.isLoading,
    upsertSchedule,
    setOverride,
    upsertItem,
    deleteItem,
  };
}