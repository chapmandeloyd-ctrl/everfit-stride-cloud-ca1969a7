import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { PlanLockedDialog } from "@/components/PlanLockedDialog";
import { useNavigate } from "react-router-dom";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import {
  CATEGORY_CONFIG,
  CATEGORY_ORDER,
  getDifficultyLabel,
  getDurationLabel,
} from "@/lib/fastingCategoryConfig";
import {
  LEVEL_TIERS,
  getTierForLevel,
} from "@/lib/quickPlanTierConfig";
import { PremiumPlanCard } from "@/components/plan/PremiumPlanCard";

interface FastingProtocol {
  id: string;
  name: string;
  category: string;
  description: string | null;
  duration_days: number;
  fast_target_hours: number;
  difficulty_level: string;
}

interface QuickPlan {
  id: string;
  name: string;
  fast_hours: number;
  eat_hours: number;
  description: any;
  min_level_required: number;
  intensity_tier: string | null;
  plan_type: string | null;
  is_extended_fast: boolean;
}

export default function ClientPrograms() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();
  const [showLocked, setShowLocked] = useState(false);

  // Fetch active assignment
  const { data: activeIds } = useQuery({
    queryKey: ["client-active-protocol-ids", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, selected_quick_plan_id")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return data as { selected_protocol_id: string | null; selected_quick_plan_id: string | null } | null;
    },
    enabled: !!clientId,
  });

  const { data: protocols, isLoading } = useQuery({
    queryKey: ["fasting-protocols"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("*")
        .order("duration_days");
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        difficulty_level: d.difficulty_level || "beginner",
      })) as FastingProtocol[];
    },
  });

  const { data: quickPlans } = useQuery({
    queryKey: ["quick-fasting-plans-client"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quick_fasting_plans")
        .select("*")
        .order("min_level_required")
        .order("fast_hours");
      if (error) throw error;
      return data as unknown as QuickPlan[];
    },
  });

  const activeProtocolId = activeIds?.selected_protocol_id;
  const activeQuickPlanId = activeIds?.selected_quick_plan_id;
  const activeProtocol = protocols?.find((p) => p.id === activeProtocolId);
  const activeQuickPlan = quickPlans?.find((p) => p.id === activeQuickPlanId);

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    config: CATEGORY_CONFIG[cat],
    items: protocols?.filter((p) => p.category === cat) || [],
  })).filter((g) => g.items.length > 0);

  const quickPlansByTier = LEVEL_TIERS.map((tier) => ({
    tier,
    items: (quickPlans || []).filter((p) => tier.levels.includes(p.min_level_required)),
  })).filter((g) => g.items.length > 0);

  // ── Render a protocol card ──
  function renderProtocolCard(protocol: FastingProtocol, isActive: boolean) {
    const config = CATEGORY_CONFIG[protocol.category];
    if (!config) return null;
    return (
      <PremiumPlanCard
        key={protocol.id}
        icon={config.icon}
        accentColorClass={config.color}
        iconGradient={config.iconGradient}
        surfaceTintGradient={config.surfaceTintGradient}
        eyebrow={config.label}
        subEyebrow="Adaptive Protocol"
        title={protocol.name}
        stats={[
          { value: `${protocol.fast_target_hours}h`, label: "Fast", accentClass: config.color },
          { value: getDurationLabel(protocol.duration_days), label: "Duration" },
          { value: getDifficultyLabel(protocol.difficulty_level), label: "Level" },
        ]}
        status={isActive ? "current" : "locked"}
        dimmed={!isActive}
        onClick={() => {
          if (isActive) navigate(`/client/protocol/${protocol.id}`);
          else setShowLocked(true);
        }}
      />
    );
  }

  // ── Render a quick plan card ──
  function renderQuickPlanCard(plan: QuickPlan, isActive: boolean) {
    const planTier = getTierForLevel(plan.min_level_required);
    const subtitle = typeof plan.description === "object" && plan.description?.subtitle
      ? plan.description.subtitle
      : null;
    const stats = [
      { value: `${plan.fast_hours}h`, label: "Fast", accentClass: planTier.accentColor },
      { value: `${plan.eat_hours}h`, label: "Eat" },
      ...(plan.is_extended_fast
        ? [{ value: "EXT", label: "Type", accentClass: "text-destructive" }]
        : [{ value: planTier.label, label: "Tier" }]),
    ];
    return (
      <PremiumPlanCard
        key={plan.id}
        icon={planTier.icon}
        accentColorClass={planTier.accentColor}
        iconGradient={planTier.iconGradient}
        surfaceTintGradient={planTier.surfaceTintGradient}
        eyebrow={`Level ${plan.min_level_required}`}
        subEyebrow={subtitle ?? planTier.subtitle}
        title={plan.name}
        stats={stats}
        status={isActive ? "current" : "locked"}
        dimmed={!isActive}
        onClick={() => {
          if (isActive) navigate(`/client/quick-plan/${plan.id}`);
          else setShowLocked(true);
        }}
      />
    );
  }

  return (
    <ClientLayout>
      <div className="px-3 pt-4 pb-8 space-y-6 w-full">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">All Programs</h1>
        </div>

        {/* ── Current Program ── */}
        {(activeProtocol || activeQuickPlan) && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary">Your Current Program</h2>
            {activeProtocol && renderProtocolCard(activeProtocol, true)}
            {activeQuickPlan && renderQuickPlanCard(activeQuickPlan, true)}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          grouped.map((group) => {
            const Icon = group.config.icon;
            return (
              <div key={group.category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${group.config.color}`} />
                  <h2 className={`text-xs font-bold uppercase tracking-wider ${group.config.color}`}>
                    {group.config.label}
                  </h2>
                </div>
                {group.items
                  .filter((p) => p.id !== activeProtocolId) // skip active, already shown above
                  .map((protocol) => renderProtocolCard(protocol, false))}
              </div>
            );
          })
        )}

        {/* ── Quick Fasting Plans by Level ── */}
        {quickPlansByTier.length > 0 && (
          <div className="space-y-6 pt-4">
            <div className="border-t border-border/50 pt-6">
              <h2 className="text-xl font-bold text-foreground">Quick Fasts</h2>
              <p className="text-sm text-muted-foreground mt-1">Unlock new fasts as you level up</p>
            </div>

            {quickPlansByTier.map(({ tier, items }) => {
              const TierIcon = tier.icon;
              const filteredItems = items.filter((p) => p.id !== activeQuickPlanId);
              if (filteredItems.length === 0) return null;
              return (
                <div key={tier.label} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TierIcon className={`h-5 w-5 ${tier.accentColor}`} />
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${tier.accentColor}`}>
                      {tier.label} — {tier.subtitle}
                    </h3>
                    <span className={`ml-auto text-[10px] font-semibold uppercase tracking-widest ${tier.accentColor} ${tier.badgeBg} px-2 py-0.5 rounded-full`}>
                      {tier.levels.length === 1 ? `Lvl ${tier.levels[0]}` : `Lvl ${tier.levels[0]}–${tier.levels[tier.levels.length - 1]}`}
                    </span>
                  </div>
                  {filteredItems.map((plan) => renderQuickPlanCard(plan, false))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PlanLockedDialog
        open={showLocked}
        onOpenChange={setShowLocked}
        lockMessage="Finish your current plan to unlock more protocols."
      />
    </ClientLayout>
  );
}