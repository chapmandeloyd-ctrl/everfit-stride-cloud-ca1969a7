import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, CalendarDays, BarChart3, Zap, Target, Users, Utensils, Star } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { FastingSafetyNotice } from "@/components/FastingSafetyNotice";
import { FastingStructureComparison } from "@/components/FastingStructureComparison";

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

function getDifficultyColor(group: string) {
  switch (group) {
    case "beginner": return { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" };
    case "intermediate": return { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" };
    case "advanced": return { text: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" };
    case "long_fasts": return { text: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" };
    default: return { text: "text-muted-foreground", bg: "bg-muted", border: "border-muted" };
  }
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

  const diffColors = getDifficultyColor(plan.difficulty_group);
  const desc = plan.description;

  return (
    <ClientLayout>
      <div className="pb-28 w-full">
        {/* Back & Moon icon */}
        <div className="px-3 pt-4 pb-1 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/quick-plans")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Header section */}
        <div className="px-5 space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Plans</p>
          <h1 className="text-3xl font-black tracking-tight">{plan.name}</h1>
          <button
            onClick={() => navigate("/client/quick-plans")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Protocols
          </button>
        </div>

        {/* Plan Card */}
        <div className="px-5 mt-5">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-start justify-between">
              <Badge variant="outline" className={`text-xs uppercase tracking-wider font-bold ${diffColors.text} ${diffColors.bg} ${diffColors.border}`}>
                <BarChart3 className="h-3 w-3 mr-1" />
                {getDifficultyLabel(plan.difficulty_group)}
              </Badge>
              <Star className="h-5 w-5 text-amber-400/40" />
            </div>

            <h2 className="text-2xl font-black">{plan.name}</h2>

            {desc?.subtitle && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {desc.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 px-5 mt-5">
          <div className="rounded-xl border border-border bg-card p-3 text-center space-y-1">
            <Clock className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Fasting Window</p>
            <p className="text-lg font-black">{plan.fast_hours}–{plan.eat_hours > 0 ? `${plan.eat_hours}h` : "0h"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center space-y-1">
            <CalendarDays className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Program Length</p>
            <p className="text-lg font-black">{desc?.length || "Ongoing"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center space-y-1">
            <BarChart3 className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Difficulty</p>
            <p className="text-lg font-black">{getDifficultyLabel(plan.difficulty_group)}</p>
          </div>
        </div>

        <div className="px-5 mt-6 space-y-6">
          {/* Protocol Overview */}
          {desc?.how_it_works && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Protocol Overview
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {desc.how_it_works}
              </p>
            </div>
          )}

          {/* Benefits */}
          {desc?.benefits && desc.benefits.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Benefits
              </h3>
              <ul className="space-y-2">
                {desc.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Daily Structure */}
          {desc?.daily_structure && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Daily Structure
              </h3>
              <div className="space-y-2 text-sm">
                {desc.daily_structure.stop_eating && (
                  <div className="flex justify-between rounded-lg bg-muted/40 px-4 py-3">
                    <span className="text-muted-foreground">Stop Eating</span>
                    <span className="font-bold">{desc.daily_structure.stop_eating}</span>
                  </div>
                )}
                {desc.daily_structure.break_fast && (
                  <div className="flex justify-between rounded-lg bg-muted/40 px-4 py-3">
                    <span className="text-muted-foreground">Break Fast</span>
                    <span className="font-bold">{desc.daily_structure.break_fast}</span>
                  </div>
                )}
                {desc.daily_structure.meals && desc.daily_structure.meals.length > 0 && (
                  <div className="flex justify-between rounded-lg bg-muted/40 px-4 py-3">
                    <span className="text-muted-foreground">Meals</span>
                    <span className="font-bold">{desc.daily_structure.meals.join(", ")}</span>
                  </div>
                )}
              </div>
              {desc.daily_structure.note && (
                <p className="text-xs text-muted-foreground italic mt-2">{desc.daily_structure.note}</p>
              )}
            </div>
          )}

          {/* Focus */}
          {desc?.focus && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Target className="h-4 w-4" /> Focus
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc.focus}</p>
            </div>
          )}

          {/* Who This Is For */}
          {desc?.who_for && desc.who_for.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4" /> Who This Is For
              </h3>
              <ul className="space-y-2">
                {desc.who_for.map((w, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Coach Guidance */}
          {desc?.coach_guidance && desc.coach_guidance.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Zap className="h-4 w-4" /> Coach Guidance
              </h3>
              <ul className="space-y-2">
                {desc.coach_guidance.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <FastingStructureComparison />
          <FastingSafetyNotice />
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t p-4 safe-area-bottom space-y-2">
        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={() => selectPlanMutation.mutate({ startNow: true })}
          disabled={selectPlanMutation.isPending}
        >
          {selectPlanMutation.isPending ? "Starting..." : "Start Fast Now"}
        </Button>
        <Button
          variant="outline"
          className="w-full h-10 text-sm"
          onClick={() => selectPlanMutation.mutate({ startNow: false })}
          disabled={selectPlanMutation.isPending}
        >
          Save plan for later
        </Button>
      </div>
    </ClientLayout>
  );
}
