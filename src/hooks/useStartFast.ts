import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { emitActivityEvent } from "@/lib/activityEvents";
import { useToast } from "@/hooks/use-toast";

/**
 * Shared Start-Fast mutation used by the Live Schedule dialog (and any
 * future entry points). Mirrors the mutation embedded in ClientDashboard's
 * FastingProtocolCard but usable from any subtree.
 */
export function useStartFast() {
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("No client selected");
      // Look up existing target (or fall back to 16h). Kept lightweight — the
      // full protocol-aware resolution still lives in ClientDashboard.
      const { data: existing } = await supabase
        .from("client_feature_settings")
        .select("active_fast_target_hours")
        .eq("client_id", clientId)
        .maybeSingle();
      const targetHours = (existing as any)?.active_fast_target_hours || 16;
      const startedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from("client_feature_settings")
        .update({
          active_fast_start_at: startedAt,
          active_fast_target_hours: targetHours,
          last_fast_ended_at: null,
          eating_window_ends_at: null,
        })
        .eq("client_id", clientId)
        .select("client_id, active_fast_start_at, active_fast_target_hours")
        .maybeSingle();
      if (error) throw error;
      if (!data?.active_fast_start_at || !data?.active_fast_target_hours) {
        throw new Error("Fast timer could not be started.");
      }
      emitActivityEvent({
        clientId,
        eventType: "fast_started",
        title: "Fast started",
        subtitle: `${data.active_fast_target_hours}h target`,
        category: "fasting",
        icon: "play",
        metadata: { target_hours: data.active_fast_target_hours },
      });
      return { targetHours: data.active_fast_target_hours };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting", clientId] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["fasting-profile-data"] });
      toast({ title: "Fast started", description: "Your fasting timer is now running." });
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't start fast",
        description: err?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    },
  });
}