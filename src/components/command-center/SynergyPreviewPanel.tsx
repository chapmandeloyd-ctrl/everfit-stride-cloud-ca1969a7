import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCw, Zap, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlanSynergy } from "@/hooks/usePlanSynergy";
import { toast } from "sonner";
import { SynergyManualEditor } from "./SynergyManualEditor";
import { KetoMacroEditor } from "@/components/keto/KetoMacroEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SynergyPreviewPanelProps {
  clientId: string;
  trainerId: string;
}

export function SynergyPreviewPanel({ clientId, trainerId }: SynergyPreviewPanelProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: featureSettings } = useQuery({
    queryKey: ["synergy-panel-settings", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, selected_quick_plan_id")
        .eq("client_id", clientId)
        .maybeSingle();
      return data;
    },
  });

  const { data: ketoAssignment } = useQuery({
    queryKey: ["synergy-panel-keto", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_keto_assignments")
        .select("id, keto_type_id, keto_types(abbreviation, name, color)")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
  });

  const { data: allProtocols } = useQuery({
    queryKey: ["synergy-all-protocols"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fasting_protocols")
        .select("id, name, category, fast_target_hours")
        .order("category")
        .order("duration_days");
      return data || [];
    },
  });

  const { data: allQuickPlans } = useQuery({
    queryKey: ["synergy-all-quick-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quick_fasting_plans")
        .select("id, name, fast_hours")
        .order("order_index");
      return data || [];
    },
  });

  const { data: allKetoTypes } = useQuery({
    queryKey: ["synergy-all-keto-types"],
    queryFn: async () => {
      const { data } = await supabase
        .from("keto_types")
        .select("id, abbreviation, name, color")
        .eq("is_active", true)
        .order("order_index");
      return data || [];
    },
  });

  const protocolId = featureSettings?.selected_protocol_id;
  const quickPlanId = featureSettings?.selected_quick_plan_id;
  const activeProtocolId = protocolId || quickPlanId;
  const protocolType = protocolId ? "program" as const : quickPlanId ? "quick_plan" as const : null;

  const { data: protocolInfo } = useQuery({
    queryKey: ["synergy-panel-protocol-info", activeProtocolId, protocolType],
    queryFn: async () => {
      if (protocolType === "program") {
        const { data } = await supabase
          .from("fasting_protocols")
          .select("name, fast_target_hours")
          .eq("id", activeProtocolId!)
          .maybeSingle();
        return data;
      }
      const { data } = await supabase
        .from("quick_fasting_plans")
        .select("name, fast_hours")
        .eq("id", activeProtocolId!)
        .maybeSingle();
      return data ? { name: data.name, fast_target_hours: data.fast_hours } : null;
    },
    enabled: !!activeProtocolId && !!protocolType,
  });

  const ketoTypeId = ketoAssignment?.keto_type_id || null;
  const ketoType = ketoAssignment?.keto_types as { abbreviation: string; name: string; color: string } | null;

  const { data: synergy, isLoading: synergyLoading } = usePlanSynergy(
    protocolType,
    activeProtocolId || null,
    ketoTypeId,
  );

  const assignProtocolMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: "program" | "quick_plan" }) => {
      const updates: Record<string, unknown> = type === "program"
        ? { selected_protocol_id: id, selected_quick_plan_id: null, protocol_assigned_by: trainerId }
        : { selected_quick_plan_id: id, selected_protocol_id: null, protocol_assigned_by: trainerId };
      const { error } = await supabase
        .from("client_feature_settings")
        .update(updates)
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["synergy-panel-settings"] });
      queryClient.invalidateQueries({ queryKey: ["plan-synergy"] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
      toast.success("Protocol assigned!");
    },
    onError: () => toast.error("Failed to assign protocol"),
  });

  const assignKetoMutation = useMutation({
    mutationFn: async (ketoId: string) => {
      if (ketoAssignment?.id) {
        await supabase
          .from("client_keto_assignments")
          .update({ is_active: false })
          .eq("id", ketoAssignment.id);
      }
      await supabase.from("client_keto_assignments").insert({
        client_id: clientId,
        keto_type_id: ketoId,
        assigned_by: trainerId,
        is_active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["synergy-panel-keto"] });
      queryClient.invalidateQueries({ queryKey: ["plan-synergy"] });
      queryClient.invalidateQueries({ queryKey: ["client-keto-assignment"] });
      toast.success("Keto type assigned!");
    },
    onError: () => toast.error("Failed to assign keto type"),
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      if (!activeProtocolId || !ketoTypeId || !protocolType) throw new Error("Missing assignments");
      await supabase
        .from("plan_synergy_content")
        .delete()
        .eq("protocol_type", protocolType)
        .eq("protocol_id", activeProtocolId)
        .eq("keto_type_id", ketoTypeId);
      const { data, error } = await supabase.functions.invoke("generate-plan-synergy", {
        body: { protocol_type: protocolType, protocol_id: activeProtocolId, keto_type_id: ketoTypeId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-synergy"] });
      toast.success("Synergy content regenerated!");
    },
    onError: () => toast.error("Failed to regenerate synergy"),
  });

  const hasBoth = !!activeProtocolId && !!ketoTypeId;

  const protocolOptions = [
    ...(allProtocols?.map(p => ({ id: p.id, label: `${p.name} (${p.fast_target_hours}h)`, type: "program" as const })) || []),
    ...(allQuickPlans?.map(p => ({ id: p.id, label: `${p.name} (${p.fast_hours}h)`, type: "quick_plan" as const })) || []),
  ];

  const currentProtocolValue = activeProtocolId ? `${protocolType}:${activeProtocolId}` : "";

  // If in editing mode, show the manual editor
  if (isEditing && hasBoth && protocolType && activeProtocolId && ketoTypeId) {
    return (
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Pencil className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Manual Synergy Editor</h3>
              <p className="text-[10px] text-muted-foreground">
                Paste your content — it renders exactly as you write it
              </p>
            </div>
          </div>
          <SynergyManualEditor
            protocolType={protocolType}
            protocolId={activeProtocolId}
            ketoTypeId={ketoTypeId}
            protocolName={protocolInfo?.name || "Protocol"}
            ketoTypeName={ketoType?.name || "Keto Type"}
            existingContent={synergy?.synergy_text}
            onSaved={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Protocol + Keto Synergy</h3>
              <p className="text-[11px] text-muted-foreground">AI-generated or manually written</p>
            </div>
          </div>
          {hasBoth && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
              {synergy && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1"
                  onClick={() => regenerateMutation.mutate()}
                  disabled={regenerateMutation.isPending}
                >
                  <RefreshCw className={`h-3 w-3 ${regenerateMutation.isPending ? "animate-spin" : ""}`} />
                  AI Generate
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Assignment selectors */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Protocol</p>
            <Select
              value={currentProtocolValue}
              onValueChange={(val) => {
                const [type, id] = val.split(":");
                assignProtocolMutation.mutate({ id, type: type as "program" | "quick_plan" });
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select protocol...">
                  {protocolInfo?.name || "Select protocol..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {allProtocols && allProtocols.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Programs</div>
                    {allProtocols.map(p => (
                      <SelectItem key={`program:${p.id}`} value={`program:${p.id}`}>
                        {p.name} <span className="text-muted-foreground">({p.fast_target_hours}h)</span>
                      </SelectItem>
                    ))}
                  </>
                )}
                {allQuickPlans && allQuickPlans.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Quick Plans</div>
                    {allQuickPlans.map(p => (
                      <SelectItem key={`quick_plan:${p.id}`} value={`quick_plan:${p.id}`}>
                        {p.name} <span className="text-muted-foreground">({p.fast_hours}h)</span>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Keto Type</p>
            <Select
              value={ketoTypeId || ""}
              onValueChange={(val) => assignKetoMutation.mutate(val)}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select keto type...">
                  {ketoType ? (
                    <span className="flex items-center gap-1.5">
                      <span className="font-black" style={{ color: ketoType.color }}>{ketoType.abbreviation}</span>
                      <span className="text-xs">{ketoType.name}</span>
                    </span>
                  ) : "Select keto type..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {allKetoTypes?.map(kt => (
                  <SelectItem key={kt.id} value={kt.id}>
                    <span className="flex items-center gap-2">
                      <span className="font-black text-sm" style={{ color: kt.color }}>{kt.abbreviation}</span>
                      <span>{kt.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Synergy content */}
        {!hasBoth && (
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <Zap className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Assign both a protocol and keto type to write or generate the synergy content.
            </p>
          </div>
        )}

        {hasBoth && synergyLoading && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading synergy content...</span>
          </div>
        )}

        {hasBoth && !synergy?.synergy_text && !synergyLoading && (
          <div className="rounded-lg bg-muted/50 p-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">No synergy content yet.</p>
            <div className="flex gap-2 justify-center">
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Pencil className="h-3 w-3 mr-1" /> Write Manually
              </Button>
              <Button
                size="sm"
                onClick={() => regenerateMutation.mutate()}
                disabled={regenerateMutation.isPending}
              >
                <Sparkles className="h-3 w-3 mr-1" /> AI Generate
              </Button>
            </div>
          </div>
        )}

        {hasBoth && synergy?.synergy_text && !synergyLoading && (
          <div className="space-y-3">
            <Badge variant="secondary" className="text-[10px]">
              CLIENT PREVIEW
            </Badge>
            {(() => {
              const tc = ketoType?.color || "#ef4444";
              try {
                const s = JSON.parse(synergy.synergy_text);

                return (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {/* Keto Synergy */}
                    {s.keto_synergy && (
                      <div className="relative rounded-lg overflow-hidden border p-3 pl-4" style={{ borderColor: `${tc}40` }}>
                        <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: tc }} />
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Sparkles className="h-3 w-3" style={{ color: tc }} />
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: tc }}>Keto Synergy</span>
                        </div>
                        <p className="text-xs leading-relaxed text-foreground line-clamp-3">{s.keto_synergy}</p>
                      </div>
                    )}

                    {/* How It Works */}
                    {s.how_it_works && (
                      <div className="relative rounded-lg overflow-hidden border border-border/50 p-3 pl-4">
                        <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: `${tc}60` }} />
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Zap className="h-3 w-3" style={{ color: tc }} />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">How It Works</span>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{s.how_it_works}</p>
                      </div>
                    )}

                    {/* Adaptation Timeline */}
                    {s.adaptation_timeline?.length > 0 && (
                      <div className="relative rounded-lg overflow-hidden border border-border/50 p-3 pl-4">
                        <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: `${tc}60` }} />
                        <div className="flex items-center gap-1.5 mb-2">
                          <RefreshCw className="h-3 w-3" style={{ color: tc }} />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Adaptation Timeline</span>
                        </div>
                        <div className="space-y-1.5">
                          {s.adaptation_timeline.slice(0, 3).map((p: { phase?: number; title: string; period: string }, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0" style={{ backgroundColor: `${tc}15`, color: tc }}>
                                {p.phase || i + 1}
                              </span>
                              <span className="text-xs font-semibold text-foreground">{p.title}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ color: tc, backgroundColor: `${tc}12` }}>{p.period}</span>
                            </div>
                          ))}
                          {s.adaptation_timeline.length > 3 && (
                            <p className="text-[10px] text-muted-foreground ml-7">+{s.adaptation_timeline.length - 3} more phases</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Eat / Avoid preview */}
                    {(s.eat_this?.length > 0 || s.avoid_this?.length > 0) && (
                      <div className="grid grid-cols-2 gap-2">
                        {s.eat_this?.length > 0 && (
                          <div className="relative rounded-lg overflow-hidden border border-border/50 p-2.5 pl-3.5">
                            <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500/60" />
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-1">
                              <Sparkles className="h-2.5 w-2.5" /> Eat This
                            </span>
                            {s.eat_this.slice(0, 3).map((item: string, i: number) => (
                              <p key={i} className="text-[10px] text-foreground truncate">• {item}</p>
                            ))}
                          </div>
                        )}
                        {s.avoid_this?.length > 0 && (
                          <div className="relative rounded-lg overflow-hidden border border-border/50 p-2.5 pl-3.5">
                            <div className="absolute inset-y-0 left-0 w-1 bg-destructive/60" />
                            <span className="text-[9px] font-bold uppercase tracking-wider text-destructive flex items-center gap-1 mb-1">
                              <Zap className="h-2.5 w-2.5" /> Avoid
                            </span>
                            {s.avoid_this.slice(0, 3).map((item: string, i: number) => (
                              <p key={i} className="text-[10px] text-foreground truncate">• {item}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Coach Warning */}
                    {s.coach_warning && (
                      <div className="bg-destructive/10 border border-destructive/25 rounded-lg p-2.5 flex items-center gap-2">
                        <Sparkles className="h-3 w-3 text-destructive shrink-0" />
                        <p className="text-[11px] font-semibold text-foreground">{s.coach_warning}</p>
                      </div>
                    )}
                  </div>
                );
              } catch {
                return (
                  <div className="relative rounded-lg overflow-hidden border border-primary/20 p-4 pt-5">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-orange-500 to-red-500" />
                    <p className="text-sm leading-relaxed text-foreground line-clamp-4">{synergy.synergy_text}</p>
                  </div>
                );
              }
            })()}
            <p className="text-[10px] text-muted-foreground">
              Click "Edit" to modify all sections
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
