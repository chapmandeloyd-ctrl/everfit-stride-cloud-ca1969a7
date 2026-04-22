import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, Clock, Utensils, Droplets, Users,
  TrendingUp, Lightbulb, Zap, Sparkles, Loader2, Check, Info,
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
  const maxPct = Math.max(ketoType.fat_pct, ketoType.protein_pct, ketoType.carbs_pct);

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

          {/* BLOCK 2 — HOW THIS PROTOCOL WORKS */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader title="How This Protocol Works" icon={<Brain className="h-4 w-4 text-primary" />} />
              <div className="space-y-2.5">
                {protocolContent.overview.map((p, i) => (
                  <p key={i} className="text-[13px] text-muted-foreground leading-relaxed">{p}</p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* BLOCK 3 — WHAT YOUR BODY IS DOING */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader title="What Your Body Is Doing" icon={<Flame className="h-4 w-4 text-destructive" />} />
              <div className="space-y-3">
                {protocolContent.phases.map((phase, i) => (
                  <div key={i} className="rounded-lg bg-muted/50 p-3">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[11px] font-bold text-primary">{phase.range}</span>
                      <span className="text-xs font-bold">— {phase.title}</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{phase.detail}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* BLOCK 4 — WHAT THIS DOES FOR YOU */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader title="What This Does For You" icon={<Zap className="h-4 w-4 text-primary" />} />
              <ul className="space-y-2">
                {protocolContent.benefits.map((b, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-[13px] text-muted-foreground">{b}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* BLOCK 5 — EXECUTION RULES */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader title="Execution Rules" icon={<Shield className="h-4 w-4 text-primary" />} />
              <ul className="space-y-2">
                {protocolContent.rules.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span className="text-[13px] text-muted-foreground">{r}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* BLOCK 6 — MENTAL REALITY */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader title="Mental Reality" icon={<Brain className="h-4 w-4 text-primary" />} />
              <div className="space-y-2">
                {protocolContent.mentalReality.map((m, i) => (
                  <p key={i} className="text-[13px] text-muted-foreground leading-relaxed font-medium">{m}</p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* BLOCK 7 — DAILY SCHEDULE */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader title="Daily Schedule" icon={<CalendarDays className="h-4 w-4 text-primary" />} />
              <div className="space-y-2">
                {protocolContent.schedule.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-muted/40 px-3.5 py-2.5">
                    <span className="text-[13px] text-muted-foreground">{s.label}</span>
                    <span className="text-[13px] font-semibold">{s.detail}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* BLOCK 8 — COACH WARNING */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader title="Coach Warning" icon={<AlertTriangle className="h-4 w-4 text-destructive" />} />
              <div className="rounded-lg bg-destructive/5 border border-destructive/15 p-3.5 space-y-2">
                {protocolContent.coachWarning.map((w, i) => (
                  <p key={i} className="text-[13px] text-muted-foreground leading-relaxed font-medium">{w}</p>
                ))}
              </div>
            </CardContent>
          </Card>
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

          {/* How It Works */}
          {ketoType.how_it_works && (
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-3">How It Works</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{ketoType.how_it_works}</p>
              </CardContent>
            </Card>
          )}

          {/* Built For */}
          {ketoType.built_for && ketoType.built_for.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Built For</h3>
                <ul className="space-y-2.5">
                  {ketoType.built_for.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="h-5 w-5 rounded-full bg-green-500/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Coach Notes */}
          {ketoType.coach_notes && ketoType.coach_notes.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Coach Notes</h3>
                <ul className="space-y-3">
                  {ketoType.coach_notes.map((note: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm text-muted-foreground leading-relaxed">{note}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Macro Comparison */}
          {allKetoTypes && allKetoTypes.length > 1 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Macro Comparison — All Types</h3>
                <div className="space-y-3">
                  {allKetoTypes.map((t) => {
                    const total = t.fat_pct + t.protein_pct + t.carbs_pct;
                    const fatW = (t.fat_pct / total) * 100;
                    const protW = (t.protein_pct / total) * 100;
                    const carbW = (t.carbs_pct / total) * 100;
                    const isCurrent = t.id === ketoType.id;
                    return (
                      <div key={t.id} className={`flex items-center gap-3 px-2 py-1.5 rounded-lg ${isCurrent ? "bg-muted/50" : ""}`}>
                        <span className="text-xs font-bold w-12" style={{ color: t.color }}>{t.abbreviation}</span>
                        <div className="flex-1 h-3 rounded-full overflow-hidden flex">
                          <div className="h-full" style={{ width: `${fatW}%`, backgroundColor: t.color, opacity: 0.8 }} />
                          <div className="h-full bg-muted-foreground/30" style={{ width: `${protW}%` }} />
                          <div className="h-full bg-muted-foreground/60" style={{ width: `${carbW}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-28 text-right">
                          <span style={{ color: t.color }}>{t.fat_pct}%F</span>{" "}
                          {t.protein_pct}%P {t.carbs_pct}%C
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* PROTOCOL + KETO SYNERGY (AI Summary)       */}
        {/* ═══════════════════════════════════════════ */}
        <div className="px-5 mt-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Protocol + Keto Synergy
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        <div className="px-5">
          {synergyLoading ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-5 flex items-center justify-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Building your metabolic blueprint...</span>
              </CardContent>
            </Card>
          ) : synergy?.synergy_text ? (
            <Card
              className="overflow-hidden relative"
              style={{ borderColor: `${themeColor}40` }}
            >
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${themeColor}, hsl(var(--primary)), ${themeColor})` }} />
              <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: themeColor }} />
              <CardContent className="p-5 pl-6 pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${themeColor}15` }}>
                    <Sparkles className="h-4 w-4" style={{ color: themeColor }} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: themeColor }}>
                      Protocol + Keto Synergy
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      {protocol.name} × {ketoType.abbreviation}
                    </p>
                  </div>
                </div>

                {structured ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {structured.keto_synergy}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {synergy.synergy_text}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}
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
