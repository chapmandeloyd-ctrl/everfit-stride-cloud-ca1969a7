import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  clientId: string;
  trainerId: string;
}

export function QuickControlPanel({ clientId, trainerId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  // Fetch keto types
  const { data: ketoTypes } = useQuery({
    queryKey: ["keto-types-list"],
    queryFn: async () => {
      const { data } = await supabase.from("keto_types").select("id, name, abbreviation").order("name");
      return data || [];
    },
    enabled: expanded,
  });

  // Fetch protocols
  const { data: protocols } = useQuery({
    queryKey: ["fasting-protocols-list"],
    queryFn: async () => {
      const { data } = await supabase.from("fasting_protocols").select("id, name, category").order("name");
      return data || [];
    },
    enabled: expanded,
  });

  // Fetch current settings
  const { data: settings } = useQuery({
    queryKey: ["quick-control-settings", clientId],
    queryFn: async () => {
      const [settingsRes, ketoRes] = await Promise.all([
        supabase.from("client_feature_settings")
          .select("fasting_enabled, selected_protocol_id, macros_enabled, training_enabled")
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
        selected_protocol_id: settingsRes.data?.selected_protocol_id || null,
        keto_type_id: ketoRes.data?.keto_type_id || null,
      };
    },
    enabled: expanded,
  });

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase.from("client_feature_settings").update({ [key]: value }).eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-control-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-health-scores"] });
    },
  });

  // Assign keto type
  const assignKetoMutation = useMutation({
    mutationFn: async (ketoTypeId: string) => {
      // Deactivate existing
      await supabase.from("client_keto_assignments").update({ is_active: false }).eq("client_id", clientId);
      // Insert new
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

  // Assign protocol
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

  if (!expanded) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
        className="flex items-center gap-1 text-[10px] font-semibold text-primary mt-2 hover:underline"
      >
        <Zap className="h-3 w-3" />
        Quick Controls
        <ChevronDown className="h-3 w-3" />
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 rounded-xl bg-muted/30 border border-border/60 space-y-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quick Controls</span>
        <button onClick={() => setExpanded(false)} className="text-muted-foreground hover:text-foreground">
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { key: "fasting_enabled", label: "Fasting" },
          { key: "macros_enabled", label: "Macros" },
          { key: "training_enabled", label: "Training" },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5">
            <Switch
              id={`${clientId}-${key}`}
              checked={settings?.[key as keyof typeof settings] as boolean ?? false}
              onCheckedChange={(checked) => toggleMutation.mutate({ key, value: checked })}
              className="scale-75"
            />
            <Label htmlFor={`${clientId}-${key}`} className="text-[10px] font-semibold cursor-pointer">
              {label}
            </Label>
          </div>
        ))}
      </div>

      <Separator />

      {/* Keto Type */}
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground font-semibold uppercase">Keto Type</Label>
        <Select
          value={settings?.keto_type_id || ""}
          onValueChange={(val) => assignKetoMutation.mutate(val)}
        >
          <SelectTrigger className="h-8 text-xs">
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

      {/* Protocol */}
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground font-semibold uppercase">Protocol</Label>
        <Select
          value={settings?.selected_protocol_id || ""}
          onValueChange={(val) => assignProtocolMutation.mutate(val)}
        >
          <SelectTrigger className="h-8 text-xs">
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
  );
}
