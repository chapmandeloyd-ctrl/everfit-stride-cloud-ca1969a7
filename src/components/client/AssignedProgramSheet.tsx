import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, Flame, Clock, Target, Sparkles, Crown } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useToast } from "@/hooks/use-toast";
import { getDifficultyLabel } from "@/lib/fastingCategoryConfig";
import { MEAL_PLANS } from "@/pages/client/ClientFastingPlanDetailPreview";

const GOLD = "hsl(42 70% 55%)";
const IVORY = "hsl(40 20% 92%)";
const MUTED = "hsl(40 10% 60%)";
const BLACK = "hsl(0 0% 4%)";
const SURFACE = "hsl(0 0% 7%)";
const SURFACE_2 = "hsl(0 0% 10%)";

/** Map keto abbreviation → meal-plan key in MEAL_PLANS. */
function ketoKeyFromAbbr(abbr?: string | null): string {
  if (!abbr) return "skd";
  const a = abbr.toLowerCase();
  if (a in MEAL_PLANS) return a;
  // Fallback rough mapping for abbreviations not in the mock library
  if (a === "crk" || a === "med" || a === "mct") return "skd";
  return "skd";
}

interface AssignedProgramSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  canStart?: boolean;
}

export function AssignedProgramSheet({ open, onOpenChange, canStart = true }: AssignedProgramSheetProps) {
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: featureSettings } = useQuery({
    queryKey: ["assigned-sheet-settings", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, selected_quick_plan_id")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && open,
  });

  const { data: ketoAssignment } = useQuery({
    queryKey: ["assigned-sheet-keto", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_keto_assignments")
        .select("keto_type_id")
        .eq("client_id", clientId!)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && open,
  });

  const protocolId = featureSettings?.selected_protocol_id;
  const quickPlanId = featureSettings?.selected_quick_plan_id;
  const isQuickPlan = !protocolId && !!quickPlanId;
  const activeProtocolId = protocolId || quickPlanId;
  const ketoTypeId = ketoAssignment?.keto_type_id;

  const { data: protocol } = useQuery({
    queryKey: ["assigned-sheet-protocol", activeProtocolId, isQuickPlan],
    queryFn: async (): Promise<any> => {
      if (isQuickPlan) {
        const { data, error } = await supabase
          .from("quick_fasting_plans").select("*").eq("id", quickPlanId!).single();
        if (error) throw error;
        return {
          ...data,
          fast_target_hours: (data as any).fast_hours,
          duration_days: 0,
          difficulty_level: (data as any).intensity_tier || (data as any).difficulty_group || "beginner",
        };
      }
      const { data, error } = await supabase
        .from("fasting_protocols").select("*").eq("id", protocolId!).single();
      if (error) throw error;
      return { ...data, difficulty_level: (data as any).difficulty_level || "beginner" };
    },
    enabled: !!activeProtocolId && open,
  });

  const { data: ketoType } = useQuery({
    queryKey: ["assigned-sheet-keto-type", ketoTypeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keto_types").select("*").eq("id", ketoTypeId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!ketoTypeId && open,
  });

  const startFastMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("No client selected");
      const targetHours = protocol?.fast_target_hours || 16;
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
        .select("client_id, active_fast_start_at")
        .maybeSingle();
      if (error) throw error;
      if (!data?.active_fast_start_at) throw new Error("Fast timer could not be started.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting", clientId] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings", clientId] });
      toast({ title: "Fast Started! 🔥", description: "Your fasting timer is now running." });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Timer didn't start",
        description: error instanceof Error ? error.message : "Could not start fast.",
        variant: "destructive"
      });
    },
  });

  const durationLabel = !protocol
    ? ""
    : protocol.duration_days === 0
    ? "∞"
    : (() => {
        const wks = Math.ceil(protocol.duration_days / 7);
        return `${wks} wk${wks !== 1 ? "s" : ""}`;
      })();

  const ketoKey = ketoKeyFromAbbr(ketoType?.abbreviation);
  const plan = MEAL_PLANS[ketoKey] ?? MEAL_PLANS.skd;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[92vh] overflow-y-auto p-0 bg-black border-amber-300/20 text-white"
      >
        {!protocol ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          </div>
        ) : (
          <div className="pb-32">
            {/* Header */}
            <div className="px-5 pt-5 pb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300/80">
                Your Complete Plan
              </p>
              <h1 className="text-2xl font-bold leading-tight mt-1">{protocol.name}</h1>
            </div>

            {/* Hero — Fasting */}
            <div className="px-5">
              <div className="relative rounded-2xl overflow-hidden border border-amber-300/20 bg-gradient-to-b from-amber-300/[0.08] to-amber-300/[0.02] p-5 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
                    Fasting Protocol
                  </p>
                  <h2 className="text-3xl font-black text-white leading-none">
                    {protocol.fast_target_hours}h Fast
                  </h2>
                  {ketoType && (
                    <p className="text-sm text-white/80 mt-1">
                      <span className="font-black text-amber-300">{ketoType.abbreviation}</span>
                      <span className="mx-1.5 text-white/40">·</span>
                      <span>{ketoType.name}</span>
                    </p>
                  )}
                </div>

                <div className="inline-flex items-center gap-1.5 h-7 rounded-full px-3 border border-amber-300/40 bg-amber-300/10">
                  <Crown className="h-3 w-3 text-amber-300" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    Coach Assigned
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <StatTile icon={<Clock className="h-4 w-4 text-amber-300" />} value={`${protocol.fast_target_hours}h`} label="Fast" accent />
                  <StatTile icon={<Target className="h-4 w-4 text-white/60" />} value={durationLabel || "—"} label="Duration" />
                  <StatTile icon={<Sparkles className="h-4 w-4 text-white/60" />} value={getDifficultyLabel(protocol.difficulty_level)} label="Level" />
                </div>

                {protocol.description && typeof protocol.description === "string" && (
                  <p className="text-sm text-white/75 leading-relaxed">{protocol.description}</p>
                )}
              </div>
            </div>

            {/* Keto Type */}
            {ketoType && (
              <div className="px-5 mt-6">
                <SectionDivider label="Your Keto Type" />
                <div className="rounded-2xl border border-amber-300/15 bg-white/[0.03] p-5 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/70">
                      Keto Strategy
                    </p>
                    <h3 className="text-2xl font-black text-white mt-1">{ketoType.abbreviation}</h3>
                    <p className="text-sm text-white/70">{ketoType.name}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <MacroTile label="Fat" value={ketoType.fat_pct} />
                    <MacroTile label="Protein" value={ketoType.protein_pct} />
                    <MacroTile label="Carbs" value={ketoType.carbs_pct} />
                  </div>
                  {ketoType.description && (
                    <p className="text-sm text-white/75 leading-relaxed">{ketoType.description}</p>
                  )}
                </div>
              </div>
            )}

            {/* Daily Meal Timeline */}
            <div className="px-5 mt-6">
              <SectionDivider label="Daily Meal Timeline" />
              {/* Daily totals */}
              <div
                className="mb-3 p-3 grid grid-cols-4 gap-2 text-center rounded-lg"
                style={{ background: SURFACE, border: `1px solid ${GOLD}33` }}
              >
                {[
                  { label: "Cal", value: plan.totals.cal, dot: GOLD },
                  { label: "Fat", value: `${plan.totals.fat}g`, dot: "#E8C77A" },
                  { label: "Carbs", value: `${plan.totals.carbs}g`, dot: "#7DB6E8" },
                  { label: "Protein", value: `${plan.totals.protein}g`, dot: "#9B7DD9" },
                ].map((t) => (
                  <div key={t.label}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="inline-block rounded-full" style={{ width: 5, height: 5, background: t.dot }} />
                      <span className="text-[8px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{t.label}</span>
                    </div>
                    <div className="font-serif text-sm" style={{ color: IVORY }}>{t.value}</div>
                  </div>
                ))}
              </div>

              <div className="relative">
                <div
                  aria-hidden
                  className="absolute top-0 bottom-0"
                  style={{
                    left: 4,
                    width: 4,
                    backgroundImage: `radial-gradient(circle, ${GOLD} 1.6px, transparent 1.8px)`,
                    backgroundSize: "4px 8px",
                    backgroundRepeat: "repeat-y",
                    backgroundPosition: "center top",
                  }}
                />
                <div className="space-y-3">
                  {plan.meals.map((m, i) => {
                    const dotColor =
                      m.tone === "fast"
                        ? GOLD
                        : m.label.toLowerCase().includes("snack")
                        ? "#E8C77A"
                        : "#7DB6E8";
                    return (
                      <div key={i} className="relative pl-6">
                        <span
                          aria-hidden
                          className="absolute rounded-full top-1/2 -translate-y-1/2"
                          style={{
                            left: 0,
                            width: 12,
                            height: 12,
                            background: BLACK,
                            border: `2px solid ${dotColor}`,
                            boxShadow: `0 0 0 3px ${BLACK}`,
                          }}
                        />
                        <div className="text-[9px] uppercase tracking-[0.25em] mb-1" style={{ color: MUTED }}>
                          {m.window}
                        </div>
                        <div
                          className="p-4 rounded-lg"
                          style={{
                            background: SURFACE,
                            border: `1px solid ${m.tone === "fast" ? `${GOLD}55` : `${GOLD}22`}`,
                          }}
                        >
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="font-serif text-sm" style={{ color: IVORY }}>{m.label}</span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: MUTED }}>{m.text}</p>
                          {m.tone !== "fast" && m.cal != null && (
                            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${GOLD}1f` }}>
                              <div className="flex items-baseline justify-between mb-2">
                                <span className="text-[9px] uppercase tracking-[0.25em]" style={{ color: GOLD }}>Macros</span>
                                <div className="flex items-baseline gap-1">
                                  <span className="font-serif text-base" style={{ color: IVORY }}>{m.cal}</span>
                                  <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>cal</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { label: "Fat", value: m.fat, dot: "#E8C77A" },
                                  { label: "Carbs", value: m.carbs, dot: "#7DB6E8" },
                                  { label: "Protein", value: m.protein, dot: "#9B7DD9" },
                                ].map((macro) => (
                                  <div
                                    key={macro.label}
                                    className="p-2 text-center rounded-md"
                                    style={{ background: SURFACE_2, border: `1px solid ${GOLD}14` }}
                                  >
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                      <span className="inline-block rounded-full" style={{ width: 5, height: 5, background: macro.dot }} />
                                      <span className="text-[8px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{macro.label}</span>
                                    </div>
                                    <div className="font-serif text-sm" style={{ color: IVORY }}>
                                      {macro.value}
                                      <span className="text-[9px] ml-0.5" style={{ color: MUTED }}>g</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sticky CTA */}
            <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-gradient-to-t from-black via-black/95 to-black/80 border-t border-white/10">
              {canStart ? (
                <Button
                  className="w-full h-12 text-base font-black gap-2 bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-600 text-black hover:brightness-110 shadow-[0_4px_20px_-4px_rgba(251,191,36,0.5)] ring-1 ring-amber-300/70"
                  onClick={() => startFastMutation.mutate()}
                  disabled={startFastMutation.isPending}
                >
                  {startFastMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Flame className="h-5 w-5" />
                  )}
                  {startFastMutation.isPending ? "Starting..." : "Start My Program"}
                </Button>
              ) : (
                <div className="text-center text-xs text-amber-300/80 py-3">
                  Locked by your coach
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function StatTile({ icon, value, label, accent }: { icon: React.ReactNode; value: string; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-2.5 text-center border min-w-0 ${
      accent ? "bg-amber-300/10 border-amber-300/30" : "bg-white/[0.06] border-white/15"
    }`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <p className={`text-sm font-black leading-tight truncate ${accent ? "text-amber-300" : "text-white"}`}>{value}</p>
      <p className="text-[9px] text-white/60 uppercase tracking-wider font-bold mt-0.5">{label}</p>
    </div>
  );
}

function MacroTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl p-3 text-center bg-white/5 border border-white/10">
      <p className="text-xl font-black text-white leading-none">
        {value}<span className="text-sm text-white/50">%</span>
      </p>
      <p className="text-[10px] text-white/60 uppercase tracking-wider font-bold mt-1.5">{label}</p>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="h-px flex-1 bg-amber-300/20" />
      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300/80">{label}</span>
      <div className="h-px flex-1 bg-amber-300/20" />
    </div>
  );
}