import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_CONFIG,
  getDifficultyLabel,
  getDurationLabel,
} from "@/lib/fastingCategoryConfig";
import { LEVEL_TIERS, getTierForLevel } from "@/lib/quickPlanTierConfig";
import { InteractiveProtocolCard } from "@/components/plan/InteractiveProtocolCard";
import type { DemoProtocol } from "@/components/plan/InteractiveProtocolCardDemo";
import { getProtocolCardContent } from "@/lib/protocolCardContent";
import {
  InteractiveKetoTypeCard,
  type KetoTypeForCard,
} from "@/components/keto/InteractiveKetoTypeCard";
import {
  MEAL_PLANS,
  PROGRAM_BASELINE_OPENS,
  resolveMealPlanKey,
} from "@/lib/programMealPlans";
import {
  parseTime,
  toMinutes,
  shiftTimeString,
  pickWindowTimes,
} from "@/lib/timeWindow";

/* ──────────────────────────────────────────────────────────────────────
   /client/program — Dark unified Program page.
   Combines the assigned Protocol + assigned Keto Type + Daily Meal
   Timeline. Replaces the legacy gold /client/complete-plan view.
   ────────────────────────────────────────────────────────────────────── */

interface FastingProtocolRow {
  id: string;
  name: string;
  category: string;
  description: unknown;
  duration_days: number;
  fast_target_hours: number;
  difficulty_level: string;
}

interface QuickPlanRow {
  id: string;
  name: string;
  fast_hours: number;
  eat_hours: number;
  description: unknown;
  min_level_required: number;
  is_extended_fast: boolean;
}

interface KetoTypeRow {
  id: string;
  abbreviation: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  fat_pct: number;
  protein_pct: number;
  carbs_pct: number;
  carb_limit_grams: number | null;
  difficulty: string;
  how_it_works: string | null;
  built_for: string[] | null;
  color: string;
}

function ketoToCard(kt: KetoTypeRow): KetoTypeForCard {
  return {
    abbreviation: kt.abbreviation,
    name: kt.name,
    subtitle: kt.subtitle,
    description: kt.description,
    difficulty: kt.difficulty,
    fat_pct: kt.fat_pct,
    protein_pct: kt.protein_pct,
    carbs_pct: kt.carbs_pct,
    carb_limit_grams: kt.carb_limit_grams,
    how_it_works: kt.how_it_works,
    built_for: kt.built_for,
    color: kt.color,
  };
}

const MACRO_DOTS: Record<string, string> = {
  Cal: "bg-primary",
  Fat: "bg-amber-300",
  Carbs: "bg-sky-400",
  Protein: "bg-violet-400",
};

export default function ClientProgram() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();

  /* ── 1. Assignment IDs ── */
  const { data: assignments } = useQuery({
    queryKey: ["client-program-assignments", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, selected_quick_plan_id")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        selected_protocol_id: string | null;
        selected_quick_plan_id: string | null;
      } | null;
    },
    enabled: !!clientId,
  });

  const { data: ketoAssignment } = useQuery({
    queryKey: ["client-program-keto-assignment", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("client_keto_assignments")
        .select("keto_type_id")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  /* ── 2. Resolve Protocol / Quick Plan / Keto Type ── */
  const protocolId = assignments?.selected_protocol_id ?? null;
  const quickPlanId = assignments?.selected_quick_plan_id ?? null;
  const ketoTypeId = ketoAssignment?.keto_type_id ?? null;

  const { data: protocol } = useQuery({
    queryKey: ["program-protocol", protocolId],
    queryFn: async () => {
      if (!protocolId) return null;
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("*")
        .eq("id", protocolId)
        .maybeSingle();
      if (error) throw error;
      return data as FastingProtocolRow | null;
    },
    enabled: !!protocolId,
  });

  const { data: quickPlan } = useQuery({
    queryKey: ["program-quick-plan", quickPlanId],
    queryFn: async () => {
      if (!quickPlanId) return null;
      const { data, error } = await supabase
        .from("quick_fasting_plans")
        .select("*")
        .eq("id", quickPlanId)
        .maybeSingle();
      if (error) throw error;
      return data as QuickPlanRow | null;
    },
    enabled: !!quickPlanId,
  });

  const { data: ketoType } = useQuery({
    queryKey: ["program-keto-type", ketoTypeId],
    queryFn: async () => {
      if (!ketoTypeId) return null;
      const { data, error } = await supabase
        .from("keto_types")
        .select(
          "id, abbreviation, name, subtitle, description, fat_pct, protein_pct, carbs_pct, carb_limit_grams, difficulty, how_it_works, built_for, color",
        )
        .eq("id", ketoTypeId)
        .maybeSingle();
      if (error) throw error;
      return data as KetoTypeRow | null;
    },
    enabled: !!ketoTypeId,
  });

  /* ── 3. Build Protocol DemoCard payload ── */
  const protocolDemo: DemoProtocol | null = useMemo(() => {
    if (protocol) {
      const config = CATEGORY_CONFIG[protocol.category];
      if (!config) return null;
      return {
        id: protocol.id,
        icon: config.icon,
        accentColorClass: config.color,
        iconGradient: config.iconGradient,
        surfaceTintGradient: config.surfaceTintGradient,
        eyebrow: config.label,
        subEyebrow: "Adaptive Protocol",
        title: protocol.name,
        stats: [
          { value: `${protocol.fast_target_hours}h`, label: "Fast", accentClass: config.color },
          { value: getDurationLabel(protocol.duration_days), label: "Duration" },
          { value: getDifficultyLabel(protocol.difficulty_level), label: "Level" },
        ],
        status: "current",
        content: getProtocolCardContent(protocol.fast_target_hours, false),
      };
    }
    if (quickPlan) {
      const tier = getTierForLevel(quickPlan.min_level_required);
      const subtitle =
        typeof quickPlan.description === "object" && quickPlan.description !== null
          ? (quickPlan.description as Record<string, unknown>).subtitle
          : null;
      return {
        id: quickPlan.id,
        icon: tier.icon,
        accentColorClass: tier.accentColor,
        iconGradient: tier.iconGradient,
        surfaceTintGradient: tier.surfaceTintGradient,
        eyebrow: `Level ${quickPlan.min_level_required}`,
        subEyebrow: typeof subtitle === "string" ? subtitle : tier.subtitle,
        title: quickPlan.name,
        stats: [
          { value: `${quickPlan.fast_hours}h`, label: "Fast", accentClass: tier.accentColor },
          { value: `${quickPlan.eat_hours}h`, label: "Eat" },
          quickPlan.is_extended_fast
            ? { value: "EXT", label: "Type", accentClass: "text-destructive" }
            : { value: tier.label, label: "Tier" },
        ],
        status: "current",
        content: getProtocolCardContent(quickPlan.fast_hours, true),
      };
    }
    return null;
  }, [protocol, quickPlan]);

  /* ── 4. Daily Meal Timeline data ── */
  const windowOpensAt = useMemo(() => {
    if (protocol) return pickWindowTimes(protocol.description).opensAt;
    return PROGRAM_BASELINE_OPENS;
  }, [protocol]);

  const planKey = resolveMealPlanKey(ketoType?.abbreviation ?? null);
  const mealPlan = MEAL_PLANS[planKey];

  const shiftMinutes = useMemo(() => {
    try {
      return (
        toMinutes(parseTime(windowOpensAt)) -
        toMinutes(parseTime(PROGRAM_BASELINE_OPENS))
      );
    } catch {
      return 0;
    }
  }, [windowOpensAt]);

  /* ── 5. Uniform card heights ── */
  const [heights, setHeights] = useState<Record<string, number>>({});
  const tallest = useMemo(() => {
    const vals = Object.values(heights);
    return vals.length ? Math.max(...vals) : 0;
  }, [heights]);
  const makeOnMeasure = useCallback(
    (key: string) => (h: number) =>
      setHeights((prev) => (prev[key] === h ? prev : { ...prev, [key]: h })),
    [],
  );

  /* ── 6. Render ── */
  const hasProgram = !!protocolDemo && !!ketoType;

  return (
    <ClientLayout>
      <div className="max-w-md mx-auto px-4 pt-4 pb-32 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/client/dashboard")}
            className="p-2 -ml-2 text-foreground/80 hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-black tracking-tight">Your Program</h1>
        </div>

        {/* Why it works */}
        {hasProgram && protocolDemo && ketoType && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">
                Why it works
              </span>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              <span className="font-semibold text-foreground">{protocolDemo.title}</span>{" "}
              pairs with{" "}
              <span className="font-semibold text-foreground">{ketoType.name}</span> to
              keep glycogen low through the fast and refill cleanly with a fat-led,
              protein-anchored eating window — that's your daily metabolic shape.
            </p>
          </div>
        )}

        {/* Empty states */}
        {!protocolDemo && (
          <EmptySlot
            label="Protocol"
            cta="Choose a protocol"
            onClick={() => navigate("/client/programs")}
          />
        )}

        {/* Protocol */}
        {protocolDemo && (
          <section className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">
              Stage 1 · Protocol
            </p>
            <InteractiveProtocolCard
              protocol={protocolDemo}
              onOpen={() =>
                navigate(
                  protocol
                    ? `/client/protocol/${protocol.id}`
                    : `/client/quick-plan/${quickPlan!.id}`,
                )
              }
              onMeasureHeight={makeOnMeasure("protocol")}
              forcedHeight={tallest > 0 ? tallest : undefined}
            />
          </section>
        )}

        {!ketoType && (
          <EmptySlot
            label="Keto Type"
            cta="Choose a keto type"
            onClick={() => navigate("/client/keto-types")}
          />
        )}

        {/* Keto Type */}
        {ketoType && (
          <section className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">
              Stage 2 · Keto Type
            </p>
            <button
              type="button"
              onClick={() => navigate(`/client/keto-types/${ketoType.id}`)}
              className="block w-full text-left"
            >
              <InteractiveKetoTypeCard
                ketoType={ketoToCard(ketoType)}
                themeColor={ketoType.color || undefined}
                isCurrent
                onMeasureHeight={makeOnMeasure("keto")}
                forcedHeight={tallest > 0 ? tallest : undefined}
              />
            </button>
          </section>
        )}

        {/* Daily Meal Timeline */}
        {hasProgram && mealPlan && (
          <section className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">
              Daily Meal Timeline
            </p>

            {/* Daily totals */}
            <div className="grid grid-cols-4 gap-2 rounded-lg border border-border bg-card p-3 text-center">
              {[
                { label: "Cal", value: mealPlan.totals.cal },
                { label: "Fat", value: `${mealPlan.totals.fat}g` },
                { label: "Carbs", value: `${mealPlan.totals.carbs}g` },
                { label: "Protein", value: `${mealPlan.totals.protein}g` },
              ].map((t) => (
                <div key={t.label}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${MACRO_DOTS[t.label]}`} />
                    <span className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
                      {t.label}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-foreground">{t.value}</div>
                </div>
              ))}
            </div>

            {/* Timeline rail */}
            <div className="relative pl-1">
              <div
                aria-hidden
                className="absolute top-2 bottom-2 left-[6px] w-[2px]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, hsl(var(--primary) / 0.55) 1.4px, transparent 1.6px)",
                  backgroundSize: "4px 8px",
                  backgroundRepeat: "repeat-y",
                }}
              />
              <div className="space-y-3">
                {mealPlan.meals.map((m, i) => {
                  const isFast = m.tone === "fast";
                  const dotClass = isFast
                    ? "border-primary"
                    : m.label.toLowerCase().includes("snack") || m.label.toLowerCase().includes("workout")
                    ? "border-amber-300"
                    : "border-sky-400";
                  return (
                    <div key={i} className="relative pl-6">
                      <span
                        aria-hidden
                        className={`absolute top-3 left-0 h-3 w-3 rounded-full bg-background border-2 ${dotClass}`}
                        style={{ boxShadow: "0 0 0 3px hsl(var(--background))" }}
                      />
                      <div className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
                            {m.label}
                          </div>
                          <div className="text-[10px] tabular-nums text-foreground/70">
                            {shiftTimeString(m.window, shiftMinutes)}
                          </div>
                        </div>
                        <p className={`text-sm leading-relaxed ${isFast ? "text-foreground/70 italic" : "text-foreground/90"}`}>
                          {m.text}
                        </p>
                        {!isFast && (
                          <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                            {[
                              { label: "Cal", value: m.cal },
                              { label: "Fat", value: `${m.fat}g` },
                              { label: "Carbs", value: `${m.carbs}g` },
                              { label: "Protein", value: `${m.protein}g` },
                            ].map((c) => (
                              <div key={c.label}>
                                <div className="flex items-center justify-center gap-1">
                                  <span className={`inline-block h-1 w-1 rounded-full ${MACRO_DOTS[c.label]}`} />
                                  <span className="text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
                                    {c.label}
                                  </span>
                                </div>
                                <div className="text-xs font-semibold text-foreground tabular-nums">
                                  {c.value}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Browse CTAs */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            variant="outline"
            className="border-border"
            onClick={() => navigate("/client/programs")}
          >
            Browse Protocols
          </Button>
          <Button
            variant="outline"
            className="border-border"
            onClick={() => navigate("/client/keto-types")}
          >
            Browse Keto Types
          </Button>
        </div>
      </div>
    </ClientLayout>
  );
}

function EmptySlot({
  label,
  cta,
  onClick,
}: {
  label: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <section className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground">
        {label}
      </p>
      <button
        onClick={onClick}
        className="w-full rounded-lg border border-dashed border-border bg-card/50 p-6 text-center hover:border-primary/50 transition-colors"
      >
        <div className="text-sm text-muted-foreground">No {label.toLowerCase()} assigned yet</div>
        <div className="mt-1 text-sm font-semibold text-primary">{cta} →</div>
      </button>
    </section>
  );
}