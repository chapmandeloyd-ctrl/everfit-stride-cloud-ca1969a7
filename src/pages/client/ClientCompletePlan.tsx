import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, Clock, Utensils, Droplets, Users,
  TrendingUp, Lightbulb, Zap, Sparkles, Loader2, Check,
  Flame, Brain, AlertTriangle, CalendarDays, Shield
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  CATEGORY_CONFIG,
  getDifficultyLabel,
} from "@/lib/fastingCategoryConfig";
import { PROTOCOL_DETAIL_COPY } from "@/lib/protocolDetailContent";
import { getProtocolCardContent } from "@/lib/protocolCardContent";
import { getTierForLevel } from "@/lib/quickPlanTierConfig";
import { usePlanSynergy } from "@/hooks/usePlanSynergy";
import { useMemo, useEffect } from "react";
import { InteractiveProtocolCard } from "@/components/plan/InteractiveProtocolCard";
import type { DemoProtocol } from "@/components/plan/InteractiveProtocolCardDemo";
import { InteractiveKetoTypeCard } from "@/components/keto/InteractiveKetoTypeCard";
import { MacroComparisonFlipCard } from "@/components/keto/MacroComparisonFlipCard";
import { buildSynergyProtocol } from "@/lib/synergyDemoContent";
import { DeviceTelemetryButton } from "@/components/debug/DeviceTelemetryButton";

function generateWeeklyProgression(durationDays: number, fastTargetHours: number) {
  const weeks = Math.ceil(durationDays / 7);
  if (weeks <= 1 || durationDays === 0) return null;
  const startHours = Math.max(12, fastTargetHours - (weeks - 1));
  const progression = [];
  for (let w = 1; w <= weeks; w++) {
    const fh = Math.min(startHours + (w - 1), fastTargetHours);
    progression.push({ week: w, fastHours: fh, eatHours: 24 - fh });
  }
  return progression;
}

function getDailySchedule(fastHours: number) {
  const stopHour = 20;
  const breakHour = (stopHour + fastHours) % 24;
  const fmt = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display}:00 ${period}`;
  };
  return { stopEating: fmt(stopHour), breakFast: fmt(breakHour) };
}

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      {icon}
      <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
    </div>
  );
}

interface StructuredSynergy {
  keto_synergy: string;
  how_it_works?: string;
  the_science?: string;
  adaptation_timeline?: { phase: number; title: string; period: string; detail: string }[];
  built_for?: string[];
  coach_notes?: string[];
  eat_this?: string[];
  avoid_this?: string[];
  coach_warning?: string;
}

export default function ClientCompletePlan() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get feature settings
  const { data: featureSettings } = useQuery({
    queryKey: ["complete-plan-settings", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, selected_quick_plan_id")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Get active keto assignment
  const { data: ketoAssignment } = useQuery({
    queryKey: ["complete-plan-keto", clientId],
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
    enabled: !!clientId,
  });

  const protocolId = featureSettings?.selected_protocol_id;
  const quickPlanId = featureSettings?.selected_quick_plan_id;
  const isQuickPlan = !protocolId && !!quickPlanId;
  const activeProtocolId = protocolId || quickPlanId;
  const ketoTypeId = ketoAssignment?.keto_type_id;

  // Fetch protocol data
  const { data: protocol } = useQuery({
    queryKey: ["complete-plan-protocol", activeProtocolId, isQuickPlan],
    queryFn: async (): Promise<any> => {
      if (isQuickPlan) {
        const { data, error } = await supabase
          .from("quick_fasting_plans")
          .select("*")
          .eq("id", quickPlanId!)
          .single();
        if (error) throw error;
        return { ...data, fast_target_hours: (data as any).fast_hours, duration_days: 0, category: "general", difficulty_level: (data as any).difficulty_group || "beginner" };
      } else {
        const { data, error } = await supabase
          .from("fasting_protocols")
          .select("*")
          .eq("id", protocolId!)
          .single();
        if (error) throw error;
        return { ...data, difficulty_level: (data as any).difficulty_level || "beginner" };
      }
    },
    enabled: !!activeProtocolId,
  });

  // Fetch keto type data
  const { data: ketoType } = useQuery({
    queryKey: ["complete-plan-keto-type", ketoTypeId],
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

  // Fetch all keto types for comparison chart
  const { data: allKetoTypes } = useQuery({
    queryKey: ["complete-plan-all-keto"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keto_types")
        .select("id, abbreviation, name, fat_pct, protein_pct, carbs_pct, color")
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  // Synergy
  const protocolType = protocolId ? "program" : quickPlanId ? "quick_plan" : null;
  const { data: synergy, isLoading: synergyLoading } = usePlanSynergy(
    protocolType,
    activeProtocolId || null,
    ketoTypeId || null,
  );

  // Realtime: auto-refresh when trainer updates keto_types macros
  useEffect(() => {
    const channel = supabase
      .channel("keto-types-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "keto_types" }, () => {
        queryClient.invalidateQueries({ queryKey: ["complete-plan-keto-type"] });
        queryClient.invalidateQueries({ queryKey: ["complete-plan-all-keto"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const structured = useMemo<StructuredSynergy | null>(() => {
    if (!synergy?.synergy_text) return null;
    try {
      const parsed = JSON.parse(synergy.synergy_text);
      if (parsed.keto_synergy) return parsed;
      return null;
    } catch {
      return null;
    }
  }, [synergy?.synergy_text]);

  const startFastMutation = useMutation({
    mutationFn: async () => {
      const targetHours = protocol?.fast_target_hours || 16;
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          active_fast_start_at: new Date().toISOString(),
          active_fast_target_hours: targetHours,
          last_fast_ended_at: null,
        })
        .eq("client_id", clientId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
      toast({ title: "Fast Started! 🔥", description: "Your fasting timer is now running." });
      navigate("/client/dashboard");
    },
    onError: () => {
      toast({ title: "Error", description: "Could not start fast.", variant: "destructive" });
    },
  });

  if (!activeProtocolId || !ketoTypeId) {
    return (
      <ClientLayout>
        <div className="px-4 pt-6 text-center">
          <p className="text-muted-foreground">No plan assigned yet.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/client/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </ClientLayout>
    );
  }

  if (!protocol || !ketoType) {
    return (
      <ClientLayout>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </ClientLayout>
    );
  }

  const themeColor = ketoType.color || "#ef4444";
  const config = protocol.category ? CATEGORY_CONFIG[protocol.category] : undefined;
  const Icon = config?.icon;
  const protocolContent = getProtocolCardContent(protocol.fast_target_hours, isQuickPlan);

  // Resolve hero card visuals — protocols use category, quick plans use tier
  const quickTier = isQuickPlan ? getTierForLevel(protocol.min_level_required ?? 1) : null;
  const heroIcon = isQuickPlan ? quickTier!.icon : (config?.icon ?? Zap);
  const heroAccentClass = isQuickPlan ? quickTier!.accentColor : (config?.color ?? "text-primary");
  const heroIconGradient = isQuickPlan
    ? quickTier!.iconGradient
    : (config?.iconGradient ?? "from-primary via-primary to-primary");
  const heroSurfaceTint = isQuickPlan
    ? quickTier!.surfaceTintGradient
    : (config?.surfaceTintGradient ?? "from-primary/15 via-transparent to-primary/10");
  const heroEyebrow = isQuickPlan
    ? `Level ${protocol.min_level_required ?? 1}`
    : (config?.label ?? "Your KSOM Plan");
  const heroSubEyebrow = isQuickPlan ? (quickTier!.subtitle) : "Adaptive Protocol";

  // Title suffix — show day count for extended quick plans
  const exactDays = protocol.fast_target_hours / 24;
  const titleSuffix =
    isQuickPlan && protocol.fast_target_hours >= 24
      ? ` — ${Number.isInteger(exactDays) ? exactDays : Math.round(exactDays * 10) / 10} Day${exactDays === 1 ? "" : "s"}`
      : "";

  const durationLabel =
    protocol.duration_days === 0
      ? "∞"
      : (() => {
          const wks = Math.ceil(protocol.duration_days / 7);
          return `${wks} wk${wks !== 1 ? "s" : ""}`;
        })();

  return (
    <ClientLayout>
      <div className="pb-8 w-full">
        {/* Back + Title */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your Complete Plan</p>
            <h1 className="text-lg font-bold leading-tight">{protocol.name}</h1>
          </div>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* PART 1 — YOUR FASTING PROTOCOL             */}
        {/* ═══════════════════════════════════════════ */}
        <div className="px-5 mt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Part 1 — Your Fasting Protocol
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        {/* PROTOCOL DETAIL CARD — Single structured premium card */}
        <div className="px-5 space-y-4">
          {/* HERO — Interactive flip card (tap for details, tilt on hover/touch) */}
          <InteractiveProtocolCard
            protocol={{
              id: protocol.id ?? "active-plan",
              icon: heroIcon,
              accentColorClass: heroAccentClass,
              iconGradient: heroIconGradient,
              surfaceTintGradient: heroSurfaceTint,
              eyebrow: heroEyebrow,
              subEyebrow: heroSubEyebrow,
              title: protocol.name,
              titleSuffix: titleSuffix,
              stats: [
                { value: `${protocol.fast_target_hours}h`, label: "Fast", accentClass: heroAccentClass },
                { value: durationLabel, label: "Duration" },
                { value: getDifficultyLabel(protocol.difficulty_level), label: "Level" },
              ],
              status: "current",
              content: protocolContent,
            } as DemoProtocol}
          />

        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* PART 2 — YOUR KETO TYPE                    */}
        {/* ═══════════════════════════════════════════ */}
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
          {/* HERO — Interactive 3D flip card (matches protocol card) */}
          <InteractiveKetoTypeCard
            ketoType={{
              abbreviation: ketoType.abbreviation,
              name: ketoType.name,
              subtitle: ketoType.subtitle,
              description: ketoType.description,
              difficulty: ketoType.difficulty,
              fat_pct: ketoType.fat_pct,
              protein_pct: ketoType.protein_pct,
              carbs_pct: ketoType.carbs_pct,
              carb_limit_grams: ketoType.carb_limit_grams,
              how_it_works: ketoType.how_it_works,
              built_for: ketoType.built_for,
              color: ketoType.color,
            }}
            themeColor={themeColor}
            isCurrent
          />

          {/* Macro Comparison */}
          {allKetoTypes && allKetoTypes.length > 1 && (
            <MacroComparisonFlipCard
              items={allKetoTypes}
              activeId={ketoType.id}
              themeColor={themeColor}
            />
          )}

          {/* Protocol + Keto Synergy — rich interactive card */}
          <InteractiveProtocolCard
            protocol={buildSynergyProtocol({
              protocolName: protocol.name,
              ketoAbbr: ketoType.abbreviation,
              fastHours: Math.round(protocol.fast_target_hours ?? 72),
              proteinPct: Math.round(ketoType.protein_pct ?? 30),
              themeColor,
            })}
            frontExtra="timelineAndChips"
          />
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* BOTTOM ACTION BUTTONS                       */}
        {/* ═══════════════════════════════════════════ */}
        <div className="px-5 mt-10 mb-6 space-y-3">
          <Button
            className="w-full h-12 text-base font-bold gap-2"
            onClick={() => startFastMutation.mutate()}
            disabled={startFastMutation.isPending}
          >
            <Zap className="h-5 w-5" />
            {startFastMutation.isPending ? "Starting..." : "Start Fast"}
          </Button>
          <Button
            variant="secondary"
            className="w-full h-11 gap-2"
            onClick={() => navigate("/client/fast-complete")}
          >
            <Check className="h-4 w-4" />
            Preview Fast Complete Screen
          </Button>
          <Button
            variant="outline"
            className="w-full h-11"
            onClick={() => navigate("/client/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </ClientLayout>
  );
}
