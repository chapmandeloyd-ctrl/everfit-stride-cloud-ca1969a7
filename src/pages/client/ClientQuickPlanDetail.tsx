import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Clock,
  CalendarDays,
  BarChart3,
  Zap,
  Target,
  Users,
  Flame,
  Shield,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { FastingSafetyNotice } from "@/components/FastingSafetyNotice";
import { FastingStructureComparison } from "@/components/FastingStructureComparison";
import { getTierForLevel, getIntensityLabel } from "@/lib/quickPlanTierConfig";
import { PlanSynergySection } from "@/components/PlanSynergySection";

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
    case "long_fasts": return "Extended";
    default: return group;
  }
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

  const selectPlanMutation = useMutation({
    mutationFn: async ({ startNow }: { startNow: boolean }) => {
      if (!plan) throw new Error("No plan");
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
      const { error } = await supabase
        .from("client_feature_settings")
        .update(updates)
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: (_, { startNow }) => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
      queryClient.invalidateQueries({ queryKey: ["fasting-gate-state"] });
      queryClient.invalidateQueries({ queryKey: ["fasting-profile-data"] });
      toast.success(startNow ? "Fast started!" : "Plan saved!");
      navigate("/client/dashboard");
    },
    onError: () => toast.error("Failed to select plan"),
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
  const tier = getTierForLevel(plan.min_level_required);
  const TierIcon = tier.icon;

  return (
    <ClientLayout>
      <div className="pb-32 w-full">
        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden">
          {/* Aurora background */}
          <div className={`absolute inset-0 bg-gradient-to-br ${tier.cardGradient} opacity-60`} />
          <div className={`absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${tier.cardGradient} blur-3xl opacity-40`} />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />

          <div className="relative px-5 pt-4 pb-8">
            <button
              onClick={() => navigate("/client/programs")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Programs
            </button>

            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tier.badgeBg} ring-1 ring-white/40`}>
                    <TierIcon className={`h-5 w-5 ${tier.accentColor}`} />
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${tier.accentColor}`}>
                      Level {plan.min_level_required} • {tier.label}
                    </span>
                  </div>
                </div>
                <h1 className="text-4xl font-black tracking-[-0.03em] leading-none text-foreground">
                  {plan.name}
                </h1>
                {desc?.subtitle && (
                  <p className="text-base text-muted-foreground leading-relaxed max-w-[30ch]">
                    {desc.subtitle}
                  </p>
                )}
              </div>

              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${tier.badgeBg} ${tier.accentColor} ring-1 ${tier.borderClass}`}>
                {getIntensityLabel(plan.intensity_tier)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-3 gap-2.5 px-5 -mt-2">
          {[
            {
              icon: Clock,
              label: "Fasting Window",
              value: `${plan.fast_hours}:${plan.eat_hours}`,
            },
            {
              icon: CalendarDays,
              label: "Duration",
              value: desc?.length || "Flexible",
            },
            {
              icon: BarChart3,
              label: "Difficulty",
              value: getDifficultyLabel(plan.difficulty_group),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`relative overflow-hidden rounded-2xl border ${tier.borderClass} bg-card/80 backdrop-blur-sm p-4 text-center`}
            >
              <div className={`absolute -right-3 -top-3 h-10 w-10 rounded-full bg-gradient-to-br ${tier.cardGradient} blur-xl opacity-30`} />
              <stat.icon className={`h-5 w-5 mx-auto ${tier.accentColor} mb-2`} />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight mb-1">{stat.label}</p>
              <p className="text-base font-black text-foreground leading-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="px-5 mt-6 space-y-4">
          {/* ── Protocol Overview ── */}
          {desc?.how_it_works && (
            <section className={`rounded-2xl border ${tier.borderClass} bg-card/80 backdrop-blur-sm p-5 space-y-3`}>
              <h3 className={`text-xs font-bold uppercase tracking-widest ${tier.accentColor} flex items-center gap-1.5`}>
                <Target className="h-3.5 w-3.5" />
                Protocol Overview
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {desc.how_it_works}
              </p>
            </section>
          )}

          {/* ── Focus ── */}
          {desc?.focus && (
            <section className={`rounded-2xl border ${tier.borderClass} bg-gradient-to-r ${tier.cardGradient} p-5 space-y-2`}>
              <h3 className={`text-[10px] font-bold uppercase tracking-widest ${tier.accentColor}`}>
                Primary Focus
              </h3>
              <p className="text-sm font-semibold text-foreground leading-relaxed">{desc.focus}</p>
            </section>
          )}

          {/* ── Benefits ── */}
          {desc?.benefits && desc.benefits.length > 0 && (
            <section className={`rounded-2xl border ${tier.borderClass} bg-card/80 backdrop-blur-sm p-5 space-y-3`}>
              <h3 className={`text-xs font-bold uppercase tracking-widest ${tier.accentColor} flex items-center gap-1.5`}>
                <Flame className="h-3.5 w-3.5" />
                Benefits
              </h3>
              <ul className="space-y-2.5">
                {desc.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${tier.accentColor}`} />
                    {b}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Daily Structure ── */}
          {desc?.daily_structure && (
            <section className={`rounded-2xl border ${tier.borderClass} bg-card/80 backdrop-blur-sm p-5 space-y-3`}>
              <h3 className={`text-xs font-bold uppercase tracking-widest ${tier.accentColor} flex items-center gap-1.5`}>
                <Clock className="h-3.5 w-3.5" />
                Daily Structure
              </h3>
              <div className="space-y-2">
                {desc.daily_structure.stop_eating && (
                  <div className={`flex justify-between items-center rounded-xl bg-muted/30 border ${tier.borderClass} px-4 py-3`}>
                    <span className="text-sm text-muted-foreground">Stop Eating</span>
                    <span className="text-sm font-bold text-foreground">{desc.daily_structure.stop_eating}</span>
                  </div>
                )}
                {desc.daily_structure.break_fast && (
                  <div className={`flex justify-between items-center rounded-xl bg-muted/30 border ${tier.borderClass} px-4 py-3`}>
                    <span className="text-sm text-muted-foreground">Break Fast</span>
                    <span className="text-sm font-bold text-foreground">{desc.daily_structure.break_fast}</span>
                  </div>
                )}
                {desc.daily_structure.meals && desc.daily_structure.meals.length > 0 && (
                  <div className={`flex justify-between items-center rounded-xl bg-muted/30 border ${tier.borderClass} px-4 py-3`}>
                    <span className="text-sm text-muted-foreground">Meals</span>
                    <span className="text-sm font-bold text-foreground">{desc.daily_structure.meals.join(" • ")}</span>
                  </div>
                )}
              </div>
              {desc.daily_structure.note && (
                <p className="text-xs text-muted-foreground/80 italic pt-1">
                  {desc.daily_structure.note}
                </p>
              )}
            </section>
          )}

          {/* ── Who This Is For ── */}
          {desc?.who_for && desc.who_for.length > 0 && (
            <section className={`rounded-2xl border ${tier.borderClass} bg-card/80 backdrop-blur-sm p-5 space-y-3`}>
              <h3 className={`text-xs font-bold uppercase tracking-widest ${tier.accentColor} flex items-center gap-1.5`}>
                <Users className="h-3.5 w-3.5" />
                Who This Is For
              </h3>
              <ul className="space-y-2.5">
                {desc.who_for.map((w, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <ChevronRight className={`h-4 w-4 shrink-0 mt-0.5 ${tier.accentColor}`} />
                    {w}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Coach Guidance ── */}
          {desc?.coach_guidance && desc.coach_guidance.length > 0 && (
            <section className={`rounded-2xl border ${tier.borderClass} bg-card/80 backdrop-blur-sm p-5 space-y-3`}>
              <h3 className={`text-xs font-bold uppercase tracking-widest ${tier.accentColor} flex items-center gap-1.5`}>
                <Zap className="h-3.5 w-3.5" />
                Coach Guidance
              </h3>
              <ul className="space-y-2.5">
                {desc.coach_guidance.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Shield className={`h-4 w-4 shrink-0 mt-0.5 ${tier.accentColor}`} />
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <FastingStructureComparison />
          <FastingSafetyNotice />
        </div>
      </div>

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
