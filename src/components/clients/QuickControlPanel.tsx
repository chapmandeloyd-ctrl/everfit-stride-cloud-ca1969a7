import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Flame, Utensils, Dumbbell, Scale, Lock } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  clientId: string;
  trainerId: string;
}

const TOGGLES = [
  { key: "fasting_enabled", label: "Fasting", Icon: Flame },
  { key: "macros_enabled", label: "Macros", Icon: Utensils },
  { key: "training_enabled", label: "Training", Icon: Dumbbell },
  { key: "smart_pace_enabled", label: "Smart Pace", Icon: Scale },
] as const;

export function QuickControlPanel({ clientId, trainerId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: ketoTypes } = useQuery({
    queryKey: ["keto-types-list"],
    queryFn: async () => {
      const { data } = await supabase.from("keto_types").select("id, name, abbreviation").order("name");
      return data || [];
    },
  });

  const { data: protocols } = useQuery({
    queryKey: ["fasting-protocols-list"],
    queryFn: async () => {
      const { data } = await supabase.from("fasting_protocols").select("id, name, category").order("name");
      return data || [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["quick-control-settings", clientId],
    queryFn: async () => {
      const [settingsRes, ketoRes] = await Promise.all([
        supabase.from("client_feature_settings")
          .select("fasting_enabled, selected_protocol_id, macros_enabled, training_enabled, smart_pace_enabled, lock_client_plan_choice")
          .eq("client_id", clientId)
          .maybeSingle(),
        supabase.from("client_keto_assignments")
          .select("keto_type_id")
          .eq("client_id", clientId)
          .eq("is_active", true)
          .maybeSingle(),
      ]);
      return {
        fasting_enabled: settingsRes.data?.fasting_enabled ?? false,
        macros_enabled: settingsRes.data?.macros_enabled ?? false,
        training_enabled: settingsRes.data?.training_enabled ?? false,
        smart_pace_enabled: settingsRes.data?.smart_pace_enabled ?? false,
        selected_protocol_id: settingsRes.data?.selected_protocol_id || null,
        keto_type_id: ketoRes.data?.keto_type_id || null,
        lock_client_plan_choice: settingsRes.data?.lock_client_plan_choice ?? false,
      };
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase.from("client_feature_settings").update({ [key]: value }).eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["quick-control-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-health-scores"] });
      toast({ title: `${vars.key.replace("_enabled", "").replace("_", " ")} ${vars.value ? "enabled" : "disabled"}` });
    },
  });

  const assignKetoMutation = useMutation({
    mutationFn: async (ketoTypeId: string) => {
      await supabase.from("client_keto_assignments").update({ is_active: false }).eq("client_id", clientId);
      const { error } = await supabase.from("client_keto_assignments").insert({
        client_id: clientId,
        keto_type_id: ketoTypeId,
        assigned_by: trainerId,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-control-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-health-scores"] });
      toast({ title: "Keto type assigned" });
    },
  });

  const assignProtocolMutation = useMutation({
    mutationFn: async (protocolId: string) => {
      const { error } = await supabase.from("client_feature_settings")
        .update({ selected_protocol_id: protocolId, protocol_start_date: new Date().toISOString().split("T")[0] })
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-control-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-health-scores"] });
      toast({ title: "Protocol assigned" });
    },
  });

  const lockChoiceMutation = useMutation({
    mutationFn: async (value: boolean) => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({ lock_client_plan_choice: value })
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: (_, value) => {
      queryClient.invalidateQueries({ queryKey: ["quick-control-settings", clientId] });
      toast({ title: value ? "Coach-only assignment ON" : "Client choice unlocked" });
    },
  });

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 overflow-hidden" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border/60">
        <Zap className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Quick Controls</span>
      </div>

      <div className="p-3 space-y-3">
        {/* Toggles — 2x2 grid, no overlap */}
        <div className="grid grid-cols-2 gap-2">
          {TOGGLES.map(({ key, label, Icon }) => {
            const checked = (settings?.[key as keyof typeof settings] as boolean) ?? false;
            return (
              <label
                key={key}
                htmlFor={`${clientId}-${key}`}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-background border border-border/60 cursor-pointer hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${checked ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-semibold truncate">{label}</span>
                </div>
                <Switch
                  id={`${clientId}-${key}`}
                  checked={checked}
                  onCheckedChange={(v) => toggleMutation.mutate({ key, value: v })}
                  className="scale-75 shrink-0"
                />
              </label>
            );
          })}
        </div>

        {/* Selectors — stacked */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider px-1">Keto Type</label>
            <Select
              value={settings?.keto_type_id || ""}
              onValueChange={(val) => assignKetoMutation.mutate(val)}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ketoTypes?.map((kt) => (
                  <SelectItem key={kt.id} value={kt.id} className="text-xs">
                    {kt.abbreviation} — {kt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider px-1">Protocol</label>
            <Select
              value={settings?.selected_protocol_id || ""}
              onValueChange={(val) => assignProtocolMutation.mutate(val)}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="Select protocol" />
              </SelectTrigger>
              <SelectContent>
                {protocols?.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Coach-only assignment lock */}
        <label
          htmlFor={`${clientId}-lock-plan`}
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-background border border-border/60 cursor-pointer hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Lock className={`h-3.5 w-3.5 shrink-0 ${settings?.lock_client_plan_choice ? "text-primary" : "text-muted-foreground"}`} />
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">Coach-only plan assignment</div>
              <div className="text-[10px] text-muted-foreground truncate">Locks client from picking their own protocol / keto type</div>
            </div>
          </div>
          <Switch
            id={`${clientId}-lock-plan`}
            checked={settings?.lock_client_plan_choice ?? false}
            onCheckedChange={(v) => lockChoiceMutation.mutate(v)}
            className="scale-75 shrink-0"
          />
        </label>
      </div>
    </div>
  );
}
