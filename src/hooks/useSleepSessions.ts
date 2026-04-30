import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SleepSession {
  id: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
}

export function useSleepSessions(
  clientId: string | undefined,
  days: number,
  enabled = true,
) {
  const { user, loading } = useAuth();

  return useQuery({
    queryKey: ["sleep-sessions", clientId, days],
    enabled: !!clientId && !loading && !!user && enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<SleepSession[]> => {
      if (!clientId) return [];
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from("sleep_sessions")
        .select("id, started_at, ended_at, duration_minutes")
        .eq("client_id", clientId)
        .gte("started_at", since.toISOString())
        .order("started_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
