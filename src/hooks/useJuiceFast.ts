import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useToast } from "@/hooks/use-toast";
import { needsRefeed, type JuiceDayLog, type JuiceFastMode, type JuiceFastSession } from "@/lib/juiceFast";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useJuiceFast() {
  const clientId = useEffectiveClientId();
  const qc = useQueryClient();
  const { toast } = useToast();

  const sessionQuery = useQuery({
    queryKey: ["juice-fast-active", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("juice_fast_sessions")
        .select("*")
        .eq("client_id", clientId!)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as JuiceFastSession | null) ?? null;
    },
  });

  const session = sessionQuery.data ?? null;

  const logsQuery = useQuery({
    queryKey: ["juice-fast-logs", session?.id],
    enabled: !!session?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("juice_fast_daily_logs")
        .select("*")
        .eq("session_id", session!.id)
        .order("log_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as JuiceDayLog[];
    },
  });

  const logs = logsQuery.data ?? [];
  const todayLog = logs.find((l) => l.log_date === todayKey()) ?? null;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["juice-fast-active", clientId] });
    qc.invalidateQueries({ queryKey: ["juice-fast-logs"] });
  };

  const startFast = useMutation({
    mutationFn: async (input: { mode: JuiceFastMode; days: number; startAt?: Date; notes?: string }) => {
      if (!clientId) throw new Error("No client");
      const startedAt = input.startAt ?? new Date();
      const endsAt = new Date(startedAt.getTime() + input.days * 86_400_000);
      const { data, error } = await supabase
        .from("juice_fast_sessions")
        .insert({
          client_id: clientId,
          mode: input.mode,
          planned_days: input.days,
          started_at: startedAt.toISOString(),
          ends_at: endsAt.toISOString(),
          includes_refeed: needsRefeed(input.days),
          notes: input.notes ?? null,
          status: "active",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as JuiceFastSession;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Juice fast started", description: "Your day counter is live on the dashboard." });
    },
    onError: (e: Error) => toast({ title: "Couldn't start", description: e.message, variant: "destructive" }),
  });

  const endFast = useMutation({
    mutationFn: async (input: { early: boolean; reason?: string }) => {
      if (!session) throw new Error("No active juice fast");
      const { error } = await supabase
        .from("juice_fast_sessions")
        .update({
          status: input.early ? "cancelled" : "completed",
          ended_at: new Date().toISOString(),
          ended_early: input.early,
          end_reason: input.reason ?? null,
        })
        .eq("id", session.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      invalidate();
      toast({
        title: vars.early ? "Juice fast ended early" : "Juice fast complete",
        description: vars.early ? "Logged. Ease back in with something light." : "Nice work — start your refeed gently.",
      });
    },
    onError: (e: Error) => toast({ title: "Couldn't end", description: e.message, variant: "destructive" }),
  });

  const saveDayLog = useMutation({
    mutationFn: async (input: {
      dayNumber: number;
      juiceCount: number;
      waterOz: number;
      snacked: boolean;
      snackNote?: string;
      energyRating?: number | null;
      notes?: string;
    }) => {
      if (!session || !clientId) throw new Error("No active juice fast");
      const { error } = await supabase.from("juice_fast_daily_logs").upsert(
        {
          session_id: session.id,
          client_id: clientId,
          log_date: todayKey(),
          day_number: input.dayNumber,
          juice_count: input.juiceCount,
          water_oz: input.waterOz,
          snacked: input.snacked,
          snack_note: input.snackNote ?? null,
          energy_rating: input.energyRating ?? null,
          notes: input.notes ?? null,
        },
        { onConflict: "session_id,log_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Day logged" });
    },
    onError: (e: Error) => toast({ title: "Couldn't save", description: e.message, variant: "destructive" }),
  });

  const setLogReminder = useMutation({
    mutationFn: async (input: { enabled?: boolean; time?: string }) => {
      if (!session) throw new Error("No active juice fast");
      const patch: Record<string, unknown> = {};
      if (input.enabled !== undefined) patch.log_reminder_enabled = input.enabled;
      if (input.time !== undefined) patch.log_reminder_time = input.time;
      const { error } = await supabase.from("juice_fast_sessions").update(patch).eq("id", session.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      invalidate();
      if (vars.enabled === false) toast({ title: "Daily log reminder off" });
      else if (vars.enabled === true) toast({ title: "Daily log reminder on" });
    },
    onError: (e: Error) => toast({ title: "Couldn't update reminder", description: e.message, variant: "destructive" }),
  });

  return {
    session,
    logs,
    todayLog,
    isLoading: sessionQuery.isLoading,
    startFast,
    endFast,
    saveDayLog,
    setLogReminder,
  };
}