import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Flame, Beaker, TrendingUp, Repeat, Timer, Utensils, ShieldCheck, Target, Droplets, Battery, CheckCircle2, CalendarDays, Home } from "lucide-react";
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
import type { DemoProtocol } from "@/components/plan/InteractiveProtocolCardDemo";
import { getProtocolCardContent } from "@/lib/protocolCardContent";
import { useClientComputedPlan } from "@/hooks/useClientComputedPlan";
import { InteractiveProtocolCard } from "@/components/plan/InteractiveProtocolCard";
import { InteractiveKetoTypeCard, type KetoTypeForCard } from "@/components/keto/InteractiveKetoTypeCard";
import { openLiveSchedule } from "@/lib/liveScheduleBus";


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

export default function ClientProgram() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();
  const { stage } = useClientComputedPlan();

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

  /* ── 4. Render ── */
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
          <h1 className="text-2xl font-black tracking-tight">Why Your Plan Works</h1>
        </div>

        <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-[10px] uppercase tracking-[0.3em] font-black text-primary">
              Coaching Breakdown
            </span>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black leading-tight">
              This is the “why” behind today’s schedule.
            </h2>
            <p className="text-sm text-foreground/75 leading-relaxed">
              The lion timer tells you what to do. The live schedule tells you when to do it.
              This page explains why the fasting window, keto type, stage, and refeed logic work together.
            </p>
          </div>
          {hasProgram && protocolDemo && ketoType && (
            <div className="grid grid-cols-2 gap-2">
              <MiniSummary label="Protocol" value={protocolDemo.title} icon={<Timer className="h-3.5 w-3.5" />} />
              <MiniSummary label="Keto Type" value={ketoType.abbreviation} icon={<Beaker className="h-3.5 w-3.5" />} />
            </div>
          )}
        </div>

        {/* Your current stage */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">
              Your Current Stage
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-lg font-black tracking-tight">
                Stage {stage.number} · {stage.label}
              </h3>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Day {stage.dayInProtocol}
              </span>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{stage.description}</p>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[1, 2, 3].map((n) => {
                const active = n === stage.number;
                const past = n < stage.number;
                const labels = ["Adaptation", "Fat-Adapted", "Metabolic Flex"];
                return (
                  <div
                    key={n}
                    className={`rounded-lg border p-2 text-center ${
                      active
                        ? "border-primary bg-primary/10"
                        : past
                        ? "border-primary/30 bg-primary/5 opacity-70"
                        : "border-border/60 bg-muted/20 opacity-50"
                    }`}
                  >
                    <p className={`text-[10px] font-bold ${active ? "text-primary" : "text-muted-foreground"}`}>
                      STAGE {n}
                    </p>
                    <p className="text-[10px] mt-0.5 truncate">{labels[n - 1]}</p>
                  </div>
                );
              })}
            </div>
            {stage.daysUntilNext != null && (
              <p className="text-[11px] text-muted-foreground">
                {stage.daysUntilNext} days until next stage
              </p>
            )}
          </div>
        </section>

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
            <div className="flex items-center gap-2">
              <Flame className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">
                What The Fast Is Doing
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
              <div className="relative space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Assigned protocol</p>
                    <h3 className="text-xl font-black mt-1">{protocolDemo.title}</h3>
                  </div>
                  <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-black text-primary shrink-0">
                    {protocolDemo.stats[0]?.value ?? "Fast"}
                  </div>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {protocolDemo.content.overview[0]}
                </p>
                <div className="space-y-2">
                  {protocolDemo.content.phases.slice(0, 3).map((phase, index) => (
                    <TimelineStep
                      key={`${phase.range}-${phase.title}`}
                      index={index + 1}
                      title={phase.title}
                      subtitle={phase.range}
                      detail={phase.detail}
                    />
                  ))}
                </div>
              </div>
            </div>
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
            <div className="flex items-center gap-2">
              <Beaker className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">
                Why This Keto Type Fits
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{ketoType.abbreviation}</p>
                  <h3 className="text-xl font-black mt-1">{ketoType.name}</h3>
                  {ketoType.subtitle && <p className="text-xs text-muted-foreground mt-1">{ketoType.subtitle}</p>}
                </div>
                <div
                  className="h-11 w-11 rounded-full border flex items-center justify-center font-black text-sm shrink-0"
                  style={{ borderColor: ketoType.color || undefined, color: ketoType.color || undefined, background: `${ketoType.color || "hsl(var(--primary))"}18` }}
                >
                  {ketoType.abbreviation}
                </div>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {ketoType.how_it_works || ketoType.description || "Your keto type controls how calories and macros are distributed so the fasting window has the right fuel support."}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <MacroPill label="Fat" value={`${ketoType.fat_pct}%`} />
                <MacroPill label="Protein" value={`${ketoType.protein_pct}%`} />
                <MacroPill label="Carbs" value={`${ketoType.carbs_pct}%`} />
              </div>
            </div>
          </section>
        )}

        {hasProgram && protocolDemo && ketoType && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">
                How To Execute It
              </p>
            </div>
            <div className="grid gap-2">
              <ExecutionCard
                icon={<Flame className="h-4 w-4" />}
                title="Fast window"
                detail="Use the live schedule to start the correct day. The lion timer takes over once the fast begins."
              />
              <ExecutionCard
                icon={<Utensils className="h-4 w-4" />}
                title="Eating window"
                detail="Break the fast on time, hit protein first, then keep carbs inside the keto type target."
              />
              <ExecutionCard
                icon={<Droplets className="h-4 w-4" />}
                title="Hydration + electrolytes"
                detail="Longer or tighter fasting days need water, sodium, potassium, and magnesium consistency."
              />
              <ExecutionCard
                icon={<Battery className="h-4 w-4" />}
                title="Energy feedback"
                detail="If energy crashes repeatedly, that is data for the coach to adjust protocol, calories, or refeed timing."
              />
            </div>
          </section>
        )}

        {/* Refeed education (CKD/refeed cycles) */}
        {ketoType?.abbreviation === "CKD" && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Repeat className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">
                Refeed Days
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
              <p className="text-sm text-foreground/85 leading-relaxed">
                Refeed days strategically reload muscle glycogen without kicking you out of adaptation
                long-term. Prioritize clean carbs (rice, potatoes, fruit) with lean protein — avoid
                sugar and seed oils.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Your schedule places refeeds automatically based on your protocol.
              </p>
            </div>
          </section>
        )}

        {hasProgram && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black">Simple rule</p>
              <p className="text-xs text-foreground/75 leading-relaxed mt-1">
                Today page = status. Live Schedule = start the fast. Lion timer = track and finish it. This page = understand why.
              </p>
            </div>
          </div>
        )}

        {/* Browse CTAs — only when the client is missing part of the program */}
        {!hasProgram && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            {!protocolDemo && (
              <Button
                variant="outline"
                className="border-border"
                onClick={() => navigate("/client/programs")}
              >
                Browse Protocols
              </Button>
            )}
            {!ketoType && (
              <Button
                variant="outline"
                className="border-border"
                onClick={() => navigate("/client/keto-types")}
              >
                Browse Keto Types
              </Button>
            )}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}

function MiniSummary({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/60 p-3 min-w-0">
      <div className="flex items-center gap-1.5 text-primary mb-1">
        {icon}
        <p className="text-[9px] uppercase tracking-widest font-black text-muted-foreground">{label}</p>
      </div>
      <p className="text-sm font-black truncate">{value}</p>
    </div>
  );
}

function TimelineStep({ index, title, subtitle, detail }: { index: number; title: string; subtitle: string; detail: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
      <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center text-xs font-black shrink-0">
        {index}
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-sm font-black">{title}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{subtitle}</p>
        </div>
        <p className="text-xs text-foreground/70 leading-relaxed mt-1">{detail}</p>
      </div>
    </div>
  );
}

function MacroPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-2 text-center">
      <p className="text-base font-black tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
    </div>
  );
}

function ExecutionCard({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3 flex gap-3">
      <div className="h-9 w-9 rounded-lg border border-primary/25 bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <p className="text-sm font-black">{title}</p>
        </div>
        <p className="text-xs text-foreground/70 leading-relaxed mt-1">{detail}</p>
      </div>
    </div>
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