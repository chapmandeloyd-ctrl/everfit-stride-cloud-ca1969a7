import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, Clock, CalendarDays, BarChart3, Utensils, Droplets, Users,
  TrendingUp, Lightbulb, Zap, Sparkles, Loader2, Check, Info
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
import { usePlanSynergy } from "@/hooks/usePlanSynergy";
import { useMemo, useEffect } from "react";

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

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-bold">{title}</h2>
      </div>
      <div>{children}</div>
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
        return { ...data, fast_target_hours: (data as any).fast_hours, duration_days: 0, category: "general", difficulty_level: (data as any).difficulty_level || "beginner" };
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
  const customCopy = activeProtocolId ? PROTOCOL_DETAIL_COPY[activeProtocolId] : undefined;
  const autoProgression = !isQuickPlan && protocol.duration_days
    ? generateWeeklyProgression(protocol.duration_days, protocol.fast_target_hours)
    : null;
  const autoSchedule = getDailySchedule(protocol.fast_target_hours);
  const maxPct = Math.max(ketoType.fat_pct, ketoType.protein_pct, ketoType.carbs_pct);

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

        {/* Protocol Hero — large dynamic card */}
        <div className="px-5">
          <Card className="overflow-hidden" style={{ backgroundColor: "hsl(var(--primary) / 0.06)", borderColor: "hsl(var(--primary) / 0.2)" }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "hsl(var(--primary) / 0.10)" }}>
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-primary">Your KSOM Plan</span>
              </div>
              <h2 className="text-[28px] font-black leading-tight tracking-tight">{protocol.name}</h2>

              {/* How This Protocol Works */}
              <div className="mt-4 pt-4 border-t border-border/40">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-bold">How This Protocol Works</h3>
                </div>
                {customCopy ? (
                  <div className="space-y-3">
                    {customCopy.howItWorks.map((p, i) => (
                      <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {protocol.name} is a {protocol.duration_days === 0 ? "flexible ongoing" : `${protocol.duration_days}-day`} fasting
                    program designed to help your body transition from sugar-burning to fat-burning safely and sustainably.
                  </p>
                )}
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-border/40">
                <div className="text-center">
                  <p className="text-base font-black">{protocol.fast_target_hours}h</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Fast</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-black">
                    {protocol.duration_days === 0 ? "∞" : `${Math.ceil(protocol.duration_days / 7)} wk${Math.ceil(protocol.duration_days / 7) !== 1 ? "s" : ""}`}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Duration</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-black capitalize">{getDifficultyLabel(protocol.difficulty_level)}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Level</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Protocol Sections */}
        <div className="px-5 mt-6 space-y-6">

          {(customCopy?.progression || autoProgression) && (
            <Section title="Weekly Progression" icon={<TrendingUp className="h-5 w-5 text-blue-400" />}>
              <div className="space-y-2">
                {customCopy?.progression ? (
                  customCopy.progression.map((w, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                      <span className="font-semibold text-sm">{w.label}</span>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Fasting: <strong className="text-foreground">{w.fastHours}</strong></span>
                        <span>Eating: <strong className="text-foreground">{w.eatHours}</strong></span>
                      </div>
                    </div>
                  ))
                ) : (
                  autoProgression!.map((w) => (
                    <div key={w.week} className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                      <span className="font-semibold text-sm">Week {w.week}</span>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Fasting: <strong className="text-foreground">{w.fastHours}h</strong></span>
                        <span>Eating: <strong className="text-foreground">{w.eatHours}h</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Section>
          )}

          <Section title="Daily Schedule Example" icon={<Clock className="h-5 w-5 text-blue-400" />}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between rounded-lg bg-muted/40 px-4 py-3">
                <span className="text-muted-foreground">Stop eating</span>
                <span className="font-semibold">{customCopy?.schedule.stopEating || autoSchedule.stopEating}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-muted/40 px-4 py-3">
                <span className="text-muted-foreground">Break fast</span>
                <span className="font-semibold">{customCopy?.schedule.breakFast || autoSchedule.breakFast}</span>
              </div>
            </div>
          </Section>

          <Section title="Meal Strategy" icon={<Utensils className="h-5 w-5 text-blue-400" />}>
            {customCopy ? (
              <div className="text-sm text-muted-foreground space-y-2">
                {customCopy.mealStrategy.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Start meals with protein to stabilize appetite and energy. Focus on protein-rich meals, vegetables, healthy fats, and moderate carbohydrates.
              </p>
            )}
          </Section>

          <Section title="Coach Guidance" icon={<Droplets className="h-5 w-5 text-blue-400" />}>
            <ul className="text-sm text-muted-foreground space-y-2">
              {(customCopy?.coachGuidance || [
                "Stay hydrated during fasting hours.",
                "Keep meals simple and protein-focused.",
                "Stop eating when comfortably satisfied.",
                "Daily movement supports metabolic health.",
              ]).map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Who This Is For" icon={<Users className="h-5 w-5 text-blue-400" />}>
            {customCopy ? (
              <div className="space-y-2">
                {customCopy.whoThisIsFor.map((p, i) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Clients who want structured support without aggressive fasting. Ideal for {getDifficultyLabel(protocol.difficulty_level).toLowerCase()}-level clients.
              </p>
            )}
          </Section>
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
