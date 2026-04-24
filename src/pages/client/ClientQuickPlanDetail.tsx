import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Clock,
  Zap,
  Target,
  Users,
  Flame,
  Shield,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  Info,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { FastingSafetyNotice } from "@/components/FastingSafetyNotice";
import { FastingStructureComparison } from "@/components/FastingStructureComparison";
import { getTierForLevel, getIntensityLabel } from "@/lib/quickPlanTierConfig";

interface PlanDescription {
  subtitle?: string;
  how_it_works?: string;
  benefits?: string[];
  daily_structure?: {
    stop_eating?: string;
    break_fast?: string;
    meals?: string[];
    note?: string;
  };
  focus?: string;
  who_for?: string[];
  length?: string;
  coach_guidance?: string[];
}

interface QuickPlan {
  id: string;
  name: string;
  fast_hours: number;
  eat_hours: number;
  difficulty_group: string;
  order_index: number;
  description: PlanDescription | null;
  engine_allowed: string[];
  min_level_required: number;
  max_level_allowed: number | null;
  plan_type: string;
  intensity_tier: string;
  is_extended_fast: boolean;
  is_youth_safe: boolean;
}

function getDifficultyLabel(group: string) {
  switch (group) {
    case "beginner": return "Beginner";
    case "intermediate": return "Intermediate";
    case "advanced": return "Advanced";
    case "long_fasts": return "Expert";
    case "expert": return "Expert";
    default: return group;
  }
}

/* ── Section wrapper (matches Complete Plan) ── */
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h3 className="text-sm font-bold">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export default function ClientQuickPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: plan, isLoading } = useQuery({
    queryKey: ["quick-plan-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quick_fasting_plans")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as QuickPlan;
    },
    enabled: !!id,
  });

  const { data: activeKetoAssignment } = useQuery({
    queryKey: ["active-keto-assignment", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_keto_assignments")
        .select("keto_type_id")
        .eq("client_id", clientId!)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const ketoTypeId = activeKetoAssignment?.keto_type_id;

  const { data: ketoType } = useQuery({
    queryKey: ["quick-plan-keto-type", ketoTypeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keto_types")
        .select("*")
        .eq("id", ketoTypeId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!ketoTypeId,
  });

  const selectPlanMutation = useMutation({
    mutationFn: async ({ startNow }: { startNow: boolean }) => {
      if (!plan) throw new Error("No plan");
      if (!clientId) throw new Error("No client selected");
      const updates: Record<string, any> = {
        selected_quick_plan_id: plan.id,
        selected_protocol_id: null,
        protocol_start_date: null,
        active_fast_target_hours: plan.fast_hours,
      };
      if (startNow) {
        updates.active_fast_start_at = new Date().toISOString();
        updates.last_fast_ended_at = null;
        updates.eating_window_ends_at = null;
      }
      const { data, error } = await supabase
        .from("client_feature_settings")
        .update(updates)
        .eq("client_id", clientId)
        .select("client_id, active_fast_start_at")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Plan could not be saved.");
      if (startNow && !data.active_fast_start_at) throw new Error("Fast timer could not be started.");
    },
    onSuccess: (_, { startNow }) => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting", clientId] });
      queryClient.invalidateQueries({ queryKey: ["fasting-gate-state"] });
      queryClient.invalidateQueries({ queryKey: ["fasting-profile-data"] });
      toast.success(startNow ? "Fast started!" : "Plan saved!");
      navigate("/client/dashboard");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to select plan"),
  });

  if (isLoading || !plan) {
    return (
      <ClientLayout>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </ClientLayout>
    );
  }

  const desc = plan.description;
  const themeColor = ketoType?.color || "#ef4444";
  const maxPct = ketoType ? Math.max(ketoType.fat_pct, ketoType.protein_pct, ketoType.carbs_pct) : 1;

  return (
    <ClientLayout>
      <div className="pb-8 w-full">
        {/* Back + Title */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/programs")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quick Plan</p>
            <h1 className="text-lg font-bold leading-tight">{plan.name}</h1>
          </div>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* PART 1 — YOUR KSOM PLAN (Protocol Hero)    */}
        {/* ═══════════════════════════════════════════ */}
        <div className="px-5 mt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Part 1 — Your Fasting Plan
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        <div className="px-5">
          <Card className="overflow-hidden" style={{ backgroundColor: "hsl(var(--primary) / 0.06)", borderColor: "hsl(var(--primary) / 0.2)" }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "hsl(var(--primary) / 0.10)" }}>
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-primary">Your KSOM Plan</span>
              </div>
              <h2 className="text-[28px] font-black leading-tight tracking-tight">{plan.name}</h2>
              {desc?.subtitle && (
                <p className="text-[15px] text-muted-foreground leading-relaxed mt-3">
                  {desc.subtitle}
                </p>
              )}

              {/* Inline stats row */}
              <div className="flex items-end gap-4 mt-6 pt-4 border-t border-border/40">
                <div>
                  <p className="text-2xl font-black">{plan.fast_hours}h</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Fast</p>
                </div>
                <div>
                  <p className="text-2xl font-black">{desc?.length || "Flexible"}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Duration</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xl font-black capitalize">{getDifficultyLabel(plan.difficulty_group)}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Level</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Protocol Sections */}
        <div className="px-5 mt-6 space-y-4">
          {/* How it works */}
          {desc?.how_it_works && (
            <Section title="How This Protocol Works" icon={<Lightbulb className="h-5 w-5 text-blue-400" />}>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc.how_it_works}</p>
            </Section>
          )}

          {/* Focus */}
          {desc?.focus && (
            <Section title="Primary Focus" icon={<Target className="h-5 w-5 text-blue-400" />}>
              <p className="text-sm font-semibold leading-relaxed">{desc.focus}</p>
            </Section>
          )}

          {/* Benefits */}
          {desc?.benefits && desc.benefits.length > 0 && (
            <Section title="Benefits" icon={<Flame className="h-5 w-5 text-blue-400" />}>
              <ul className="space-y-2">
                {desc.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                    {b}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Daily Structure */}
          {desc?.daily_structure && (
            <Section title="Daily Structure" icon={<Clock className="h-5 w-5 text-blue-400" />}>
              <div className="space-y-2 text-sm">
                {desc.daily_structure.stop_eating && (
                  <div className="flex justify-between rounded-lg bg-muted/40 px-4 py-3">
                    <span className="text-muted-foreground">Stop Eating</span>
                    <span className="font-semibold">{desc.daily_structure.stop_eating}</span>
                  </div>
                )}
                {desc.daily_structure.break_fast && (
                  <div className="flex justify-between rounded-lg bg-muted/40 px-4 py-3">
                    <span className="text-muted-foreground">Break Fast</span>
                    <span className="font-semibold">{desc.daily_structure.break_fast}</span>
                  </div>
                )}
                {desc.daily_structure.meals && desc.daily_structure.meals.length > 0 && (
                  <div className="flex justify-between rounded-lg bg-muted/40 px-4 py-3">
                    <span className="text-muted-foreground">Meals</span>
                    <span className="font-semibold">{desc.daily_structure.meals.join(" • ")}</span>
                  </div>
                )}
              </div>
              {desc.daily_structure.note && (
                <p className="text-xs text-muted-foreground/80 italic pt-2">{desc.daily_structure.note}</p>
              )}
            </Section>
          )}

          {/* Who This Is For */}
          {desc?.who_for && desc.who_for.length > 0 && (
            <Section title="Who This Is For" icon={<Users className="h-5 w-5 text-blue-400" />}>
              <ul className="space-y-2">
                {desc.who_for.map((w, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                    {w}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Coach Guidance */}
          {desc?.coach_guidance && desc.coach_guidance.length > 0 && (
            <Section title="Coach Guidance" icon={<Shield className="h-5 w-5 text-blue-400" />}>
              <ul className="text-sm text-muted-foreground space-y-2">
                {desc.coach_guidance.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* PART 2 — YOUR KETO TYPE                    */}
        {/* ═══════════════════════════════════════════ */}
        {ketoType && (
          <>
            <div className="px-5 mt-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Part 2 — Your Keto Type
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>

            <div className="px-5 space-y-4">
              {/* Keto Hero */}
              <Card className="overflow-hidden" style={{ backgroundColor: `${themeColor}08`, borderColor: `${themeColor}25` }}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ backgroundColor: `${themeColor}15` }}>
                      <Zap className="h-3.5 w-3.5" style={{ color: themeColor }} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: themeColor }}>
                      Your Active Keto Type
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3 mb-1">
                    <h2 className="text-5xl font-black tracking-tight" style={{ color: themeColor }}>
                      {ketoType.abbreviation}
                    </h2>
                    <span className="text-lg text-muted-foreground">{ketoType.name}</span>
                  </div>
                  {ketoType.subtitle && <p className="font-bold text-base mt-1">{ketoType.subtitle}</p>}
                  {ketoType.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2">{ketoType.description}</p>
                  )}
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Level", value: ketoType.difficulty === "beginner" ? "Beginner" : ketoType.difficulty === "intermediate" ? "Intermediate" : "Advanced" },
                  { label: "System", value: "KSOM-360" },
                  { label: "Protein", value: `${ketoType.protein_pct}%` },
                ].map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="p-3 text-center overflow-hidden">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{stat.label}</p>
                      <p className="font-bold mt-0.5 text-sm capitalize truncate">{stat.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Macro Breakdown */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Macro Breakdown</h3>
                  {[
                    { label: "Fat", pct: ketoType.fat_pct, barColor: themeColor },
                    { label: "Protein", pct: ketoType.protein_pct, barColor: "#94a3b8" },
                    { label: "Carbs", pct: ketoType.carbs_pct, barColor: "#475569" },
                  ].map((m) => (
                    <div key={m.label} className="flex items-center gap-3 mb-3 last:mb-0">
                      <span className="text-sm w-14 text-muted-foreground">{m.label}</span>
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(m.pct / maxPct) * 100}%`, backgroundColor: m.barColor }}
                        />
                      </div>
                      <span className="text-sm font-bold w-10 text-right" style={{ color: themeColor }}>
                        {m.pct}%
                      </span>
                    </div>
                  ))}
                  {ketoType.carb_limit_grams && (
                    <div className="mt-3 pt-3 border-t flex items-start gap-2">
                      <Info className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Carb limit: <strong>≤{ketoType.carb_limit_grams}g net carbs</strong>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Comparisons & Safety */}
        <div className="px-5 mt-6 space-y-4">
          <FastingStructureComparison />
          <FastingSafetyNotice />
        </div>
      </div>

      <div className="pb-36" />

      {/* ── Fixed Bottom CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/50 p-4 safe-area-bottom space-y-2">
        <Button
          className="w-full h-12 text-base font-bold rounded-xl"
          onClick={() => selectPlanMutation.mutate({ startNow: true })}
          disabled={selectPlanMutation.isPending}
        >
          {selectPlanMutation.isPending ? "Starting..." : "Start Fast Now"}
        </Button>
        <Button
          variant="outline"
          className="w-full h-10 text-sm rounded-xl"
          onClick={() => selectPlanMutation.mutate({ startNow: false })}
          disabled={selectPlanMutation.isPending}
        >
          Save plan for later
        </Button>
      </div>
    </ClientLayout>
  );
}
