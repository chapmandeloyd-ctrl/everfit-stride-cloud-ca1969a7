import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CUSTOM_MANUAL_PLANS } from "@/lib/customManualPlans";

interface Props {
  clientId: string;
  trainerId: string;
}

export function CustomManualPlansTab({ clientId, trainerId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["client-feature-settings", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("custom_manual_plans_enabled")
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const toggle = useMutation({
    mutationFn: async (checked: boolean) => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({ custom_manual_plans_enabled: checked } as any)
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId);
      if (error) throw error;
    },
    onSuccess: (_d, checked) => {
      queryClient.invalidateQueries({ queryKey: ["client-feature-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
      toast({
        title: checked ? "Custom Manual Plans enabled" : "Custom Manual Plans disabled",
        description: checked
          ? "The client now sees the 7-plan picker on their fasting page."
          : "The 7-plan picker is hidden from this client.",
      });
    },
    onError: (e: any) =>
      toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const enabled = (settings as any)?.custom_manual_plans_enabled ?? false;

  return (
    <div className="space-y-6">
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Custom Manual Plans
          </CardTitle>
          <CardDescription>
            Show a curated 7-plan custom fasting picker on this client's Fasting Plans page.
            Some plans (Easy Start, Warrior) have locked durations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-card/40 p-4">
            <div>
              <Label className="text-base font-semibold">Enable for this client</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Adds the Custom Manual Plans section to /client/choose-protocol.
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(c) => toggle.mutate(c)}
              disabled={toggle.isPending}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plans included</CardTitle>
          <CardDescription>Preview of what the client will see when enabled.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {CUSTOM_MANUAL_PLANS.map((p) => (
            <div
              key={p.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card/40 p-3"
            >
              <div className="min-w-0">
                <div className={`text-base font-bold ${p.accent}`}>{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.tagline}</div>
                {!p.manual && (
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {p.fastHours}h fast • {p.eatHours}h eat
                  </div>
                )}
              </div>
              {(p.lockedEat || p.lockedFast) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary shrink-0">
                  <Lock className="h-3 w-3" /> Locked
                </span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}