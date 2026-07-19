import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FlaskConical } from "lucide-react";

interface Props {
  clientId: string;
}

/**
 * Admin-only per-client testing toggles.
 *  1. Force-start / stop the client's active fast (writes active_fast_start_at).
  *  2. Flip the client's fasting card into the Live Schedule calendar view.
 */
export function AdminTestingToggles({ clientId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["admin-testing-toggles", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select(
          "active_fast_start_at, active_fast_target_hours, admin_show_live_schedule, selected_protocol_id"
        )
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const isFasting = !!settings?.active_fast_start_at;
  const showLiveSchedule = settings?.admin_show_live_schedule === true;

  const toggleFast = useMutation({
    mutationFn: async (start: boolean) => {
      if (start) {
        let target = Number(settings?.active_fast_target_hours) || 0;
        if (!target && settings?.selected_protocol_id) {
          const { data: proto } = await supabase
            .from("fasting_protocols")
            .select("fast_target_hours")
            .eq("id", settings.selected_protocol_id)
            .maybeSingle();
          target = Number((proto as any)?.fast_target_hours) || 16;
        }
        if (!target) target = 16;
        const { error } = await supabase
          .from("client_feature_settings")
          .update({
            active_fast_start_at: new Date().toISOString(),
            active_fast_target_hours: target,
            last_fast_ended_at: null,
            eating_window_ends_at: null,
          })
          .eq("client_id", clientId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_feature_settings")
          .update({
            active_fast_start_at: null,
            last_fast_ended_at: new Date().toISOString(),
          })
          .eq("client_id", clientId);
        if (error) throw error;
      }
    },
    onSuccess: (_d, start) => {
      toast({ title: start ? "Fast started (admin)" : "Fast ended (admin)" });
      qc.invalidateQueries({ queryKey: ["admin-testing-toggles", clientId] });
      qc.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
      qc.invalidateQueries({ queryKey: ["my-feature-settings"] });
      qc.invalidateQueries({ queryKey: ["fasting-profile-data"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    },
  });

  const toggleLiveSchedule = useMutation({
    mutationFn: async (show: boolean) => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({ admin_show_live_schedule: show })
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: (_d, show) => {
      toast({ title: show ? "Live Schedule card shown" : "Live Schedule card hidden" });
      qc.invalidateQueries({ queryKey: ["admin-testing-toggles", clientId] });
      qc.invalidateQueries({ queryKey: ["my-feature-settings"] });
      qc.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    },
  });

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest text-amber-400">
          <FlaskConical className="h-4 w-4" />
          Admin Testing Toggles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/30 p-3">
          <div className="min-w-0">
            <Label className="text-sm font-semibold">Force Active Fast</Label>
            <p className="text-xs text-muted-foreground">
              {isFasting ? "Client is currently fasting." : "No active fast."} Toggle to start/stop now.
            </p>
          </div>
          <Switch
            checked={isFasting}
            disabled={toggleFast.isPending}
            onCheckedChange={(v) => toggleFast.mutate(v)}
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/30 p-3">
          <div className="min-w-0">
            <Label className="text-sm font-semibold">Show Live Schedule Card</Label>
            <p className="text-xs text-muted-foreground">
              OFF by default. Turn ON to flip the client's fasting card into the calendar view.
            </p>
          </div>
          <Switch
            checked={showLiveSchedule}
            disabled={toggleLiveSchedule.isPending}
            onCheckedChange={(v) => toggleLiveSchedule.mutate(v)}
          />
        </div>
      </CardContent>
    </Card>
  );
}