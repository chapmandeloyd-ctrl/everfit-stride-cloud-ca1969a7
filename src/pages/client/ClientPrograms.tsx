import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronRight, Lock, ShieldCheck } from "lucide-react";
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
  getIntensityLabel,
} from "@/lib/quickPlanTierConfig";

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
    const CatIcon = config.icon;
    const locked = !isActive;

    return (
      <div
        key={protocol.id}
        className={`group relative cursor-pointer overflow-hidden rounded-[28px] transition-all duration-300 hover:-translate-y-1 active:scale-[0.985] ${locked ? "opacity-50 grayscale-[30%]" : ""}`}
        onClick={() => {
          if (isActive) {
            navigate(`/client/protocol/${protocol.id}`);
          } else {
            setShowLocked(true);
          }
        }}
      >
        <div className={`absolute inset-0 rounded-[28px] ${config.cardShadowClass}`} />
        <div className={`absolute -inset-[1px] rounded-[28px] bg-gradient-to-br ${config.glowGradient} opacity-90`} />
        <div className={`absolute inset-[1px] rounded-[27px] ${config.cardSurfaceClass}`} />
        <div className={`absolute -right-6 top-4 h-24 w-24 rounded-full ${config.bgColor} blur-3xl opacity-90`} />
        <div className="absolute inset-x-6 top-0 h-px bg-white/90" />

        <div className={`relative rounded-[27px] border ${config.cardBorderClass} backdrop-blur-xl overflow-hidden`}>
          <div className="px-6 pt-6 pb-3">
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${config.bgColor} ring-1 ring-white/70 shadow-lg`}>
                <CatIcon className={`h-7 w-7 ${config.color}`} />
              </div>
              <span className={`text-sm font-black uppercase tracking-[0.18em] ${config.color}`}>
                {config.label}
              </span>
              <div className="ml-auto">
                {isActive ? (
                  <Badge className="text-[10px] px-2.5 py-0.5 bg-primary text-primary-foreground border-0">
                    <ShieldCheck className="h-3 w-3 mr-1" /> CURRENT
                  </Badge>
                ) : (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Locked</span>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-[2.15rem] font-black tracking-[-0.04em] leading-[0.95] text-foreground drop-shadow-sm">
              {protocol.name}
            </h3>

            {protocol.description && (
              <p className="mt-3 max-w-[28ch] text-base leading-relaxed text-muted-foreground line-clamp-2">
                {protocol.description}
              </p>
            )}
          </div>

          <div className="mx-6 border-t border-border/70" />

          <div className="flex items-end gap-5 px-6 py-4">
            <div className="shrink-0">
              <span className={`block text-lg font-black leading-none ${config.color}`}>
                {protocol.fast_target_hours}h
              </span>
              <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Fast</span>
            </div>
            <div className="shrink-0">
              <span className="block text-lg font-black leading-none text-foreground">
                {getDurationLabel(protocol.duration_days)}
              </span>
              <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Duration</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="text-right">
                <span className="block text-lg font-black leading-none text-foreground">
                  {getDifficultyLabel(protocol.difficulty_level)}
                </span>
                <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Level</span>
              </div>
              <ChevronRight className={`h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1 ${config.color}`} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render a quick plan card ──
  function renderQuickPlanCard(plan: QuickPlan, isActive: boolean) {
    const planTier = getTierForLevel(plan.min_level_required);
    const PlanIcon = planTier.icon;
    const subtitle = typeof plan.description === "object" && plan.description?.subtitle
      ? plan.description.subtitle
      : null;
    const locked = !isActive;

    return (
      <div
        key={plan.id}
        className={`group relative cursor-pointer overflow-hidden rounded-[28px] transition-all duration-300 hover:-translate-y-1 active:scale-[0.985] ${locked ? "opacity-50 grayscale-[30%]" : ""}`}
        onClick={() => {
          if (isActive) {
            navigate(`/client/quick-plan/${plan.id}`);
          } else {
            setShowLocked(true);
          }
        }}
      >
        <div className={`absolute inset-0 rounded-[28px] ${planTier.glowShadow}`} />
        <div className={`absolute -inset-[1px] rounded-[28px] bg-gradient-to-br ${planTier.cardGradient} opacity-80`} />
        <div className="absolute inset-[1px] rounded-[27px] bg-gradient-to-br from-background/95 via-background/90 to-background/85 backdrop-blur-xl" />
        <div className={`absolute -right-8 -top-4 h-28 w-28 rounded-full bg-gradient-to-br ${planTier.cardGradient} blur-3xl opacity-60`} />
        <div className="absolute inset-x-8 top-0 h-px bg-white/60" />

        <div className={`relative rounded-[27px] border ${planTier.borderClass} backdrop-blur-xl overflow-hidden`}>
          <div className="px-6 pt-6 pb-3">
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${planTier.badgeBg} ring-1 ring-white/40 shadow-lg`}>
                <PlanIcon className={`h-6 w-6 ${planTier.accentColor}`} />
              </div>
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${planTier.accentColor}`}>
                  Level {plan.min_level_required}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {isActive ? (
                  <Badge className="text-[10px] px-2.5 py-0.5 bg-primary text-primary-foreground border-0">
                    <ShieldCheck className="h-3 w-3 mr-1" /> CURRENT
                  </Badge>
                ) : (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Locked</span>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-[2rem] font-black tracking-[-0.04em] leading-[0.95] text-foreground drop-shadow-sm">
              {plan.name}
            </h3>

            {subtitle && (
              <p className="mt-2 max-w-[28ch] text-sm leading-relaxed text-muted-foreground line-clamp-2">
                {subtitle}
              </p>
            )}
          </div>

          <div className="mx-6 border-t border-border/60" />

          <div className="flex items-end gap-5 px-6 py-4">
            <div className="shrink-0">
              <span className={`block text-lg font-black leading-none ${planTier.accentColor}`}>
                {plan.fast_hours}h
              </span>
              <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Fast</span>
            </div>
            <div className="shrink-0">
              <span className="block text-lg font-black leading-none text-foreground">
                {plan.eat_hours}h
              </span>
              <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Eat</span>
            </div>
            {plan.is_extended_fast && (
              <div className="shrink-0">
                <span className="block text-lg font-black leading-none text-destructive">
                  EXT
                </span>
                <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Type</span>
              </div>
            )}
            <div className="ml-auto flex items-center gap-1">
              <ChevronRight className={`h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1 ${planTier.accentColor}`} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClientLayout>
      <div className="px-3 pt-4 pb-8 space-y-6 w-full">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/choose-protocol")}>
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