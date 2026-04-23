import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LockedPlanPopover } from "@/components/LockedPlanPopover";
import { ArrowLeft, Clock, Hourglass, UtensilsCrossed, Lock, ShieldCheck, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FastingSafetyNotice } from "@/components/FastingSafetyNotice";
import { FastingStructureComparison } from "@/components/FastingStructureComparison";
import { PlanLockedDialog } from "@/components/PlanLockedDialog";
import { usePlanGating } from "@/hooks/usePlanGating";
import type { PlanGatingMetadata } from "@/lib/planGating";

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

const DIFFICULTY_GROUPS = [
  { key: "beginner", label: "Beginner plans" },
  { key: "intermediate", label: "Intermediate plans" },
  { key: "advanced", label: "Advanced plans" },
  { key: "long_fasts", label: "Long fasts" },
];

export default function ClientQuickPlans() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const { evaluatePlan, isReady } = usePlanGating();

  const { data: plans, isLoading } = useQuery({
    queryKey: ["quick-fasting-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quick_fasting_plans")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data as QuickPlan[];
    },
  });

  function handlePlanClick(plan: QuickPlan) {
    if (!isReady) {
      navigate(`/client/quick-plan/${plan.id}`);
      return;
    }

    const gatingMeta: PlanGatingMetadata = {
      id: plan.id,
      name: plan.name,
      engine_allowed: plan.engine_allowed || ["metabolic", "performance"],
      min_level_required: plan.min_level_required || 1,
      max_level_allowed: plan.max_level_allowed,
      plan_type: (plan.plan_type as any) || "fasting",
      intensity_tier: (plan.intensity_tier as any) || "low",
      is_extended_fast: plan.is_extended_fast || false,
      is_youth_safe: plan.is_youth_safe || false,
    };

    const result = evaluatePlan(gatingMeta);

    if (!result.isAccessible) {
      setLockedMessage(result.lockMessage || "This plan is currently locked.");
      return;
    }

    navigate(`/client/quick-plan/${plan.id}`);
  }

  function getPlanGatingResult(plan: QuickPlan) {
    if (!isReady) return null;
    const meta: PlanGatingMetadata = {
      id: plan.id,
      name: plan.name,
      engine_allowed: plan.engine_allowed || ["metabolic", "performance"],
      min_level_required: plan.min_level_required || 1,
      max_level_allowed: plan.max_level_allowed,
      plan_type: (plan.plan_type as any) || "fasting",
      intensity_tier: (plan.intensity_tier as any) || "low",
      is_extended_fast: plan.is_extended_fast || false,
      is_youth_safe: plan.is_youth_safe || false,
    };
    return evaluatePlan(meta);
  }

  const visiblePlans = plans?.filter((plan) => {
    const result = getPlanGatingResult(plan);
    return result === null || result.isVisible;
  });

  const grouped = DIFFICULTY_GROUPS.map((group) => ({
    ...group,
    items: visiblePlans?.filter((p) => p.difficulty_group === group.key) || [],
  })).filter((g) => g.items.length > 0);

  return (
    <ClientLayout>
      <div className="px-3 pt-4 pb-8 space-y-6 w-full">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/choose-protocol")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Quick Plans</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.key} className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{group.label}</h2>
              {group.items.map((plan) => {
                const gating = getPlanGatingResult(plan);
                const isLocked = gating && !gating.isAccessible;
                const isCoachApproved = gating?.isCoachApproved;
                const isOptional = gating?.isOptionalTool;
                const desc = plan.description as PlanDescription | null;

                return (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer overflow-hidden transition-all ${
                      isLocked
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:shadow-md active:scale-[0.99]"
                    }`}
                    onClick={() => handlePlanClick(plan)}
                  >
                    <CardContent className="p-0">
                      <div className="px-5 pt-4 pb-2">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <Clock className="h-5 w-5 text-primary" />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                              Quick Plan
                            </span>
                          </div>
                          {isLocked && (
                            <LockedPlanPopover
                              message={gating?.lockMessage || "Message your trainer to unlock this plan."}
                            >
                              <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Locked — tap for unlock options"
                              >
                                <Lock className="h-4 w-4" />
                              </button>
                            </LockedPlanPopover>
                          )}
                          {isCoachApproved && (
                            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                              <ShieldCheck className="h-3 w-3 mr-1" /> Coach Approved
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-2xl font-black tracking-tight leading-none mb-1">{plan.name}</h3>
                        {desc?.subtitle && (
                          <p className="text-sm text-muted-foreground mt-1">{desc.subtitle}</p>
                        )}
                        {isLocked && gating?.lockMessage && (
                          <p className="text-[10px] text-muted-foreground/70 mt-1">{gating.lockMessage}</p>
                        )}
                        {isOptional && (
                          <Badge variant="outline" className="text-[10px] mt-1">Optional Tool</Badge>
                        )}
                      </div>
                      <div className="mx-5 border-t" />
                      <div className="px-5 py-3 flex items-center gap-5">
                        <div>
                          <div className="flex items-center gap-1">
                            <Hourglass className="h-3.5 w-3.5 text-primary" />
                            <span className="text-lg font-bold text-primary">{plan.fast_hours}h</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Fast</span>
                        </div>
                        {plan.eat_hours > 0 && (
                          <div>
                            <div className="flex items-center gap-1">
                              <UtensilsCrossed className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-lg font-bold">{plan.eat_hours}h</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Eat</span>
                          </div>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))
        )}
      </div>

      <PlanLockedDialog
        open={!!lockedMessage}
        onOpenChange={(open) => !open && setLockedMessage(null)}
        lockMessage={lockedMessage || ""}
        onViewRecommended={() => {
          setLockedMessage(null);
          navigate("/client/choose-protocol");
        }}
      />
    </ClientLayout>
  );
}
