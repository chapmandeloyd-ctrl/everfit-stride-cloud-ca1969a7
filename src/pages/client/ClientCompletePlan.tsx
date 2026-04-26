import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Clock, Zap, Loader2, Check, Shield, Sparkles, Flame, Target, Crown
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getDifficultyLabel } from "@/lib/fastingCategoryConfig";
import { usePlanSynergy } from "@/hooks/usePlanSynergy";
import { useEffect, useMemo } from "react";
import fastingCardBgGoldImg from "@/assets/fasting-timer-bg-gold.png";

interface StructuredSynergy {
  keto_synergy: string;
  how_it_works?: string;
  the_science?: string;
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
        return {
          ...data,
          fast_target_hours: (data as any).fast_hours,
          duration_days: 0,
          difficulty_level: (data as any).intensity_tier || (data as any).difficulty_group || "beginner",
        };
      }
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("*")
        .eq("id", protocolId!)
        .single();
      if (error) throw error;
      return { ...data, difficulty_level: (data as any).difficulty_level || "beginner" };
    },
    enabled: !!activeProtocolId,
  });

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

  const protocolType = protocolId ? "program" : quickPlanId ? "quick_plan" : null;
  const { data: synergy } = usePlanSynergy(
    protocolType,
    activeProtocolId || null,
    ketoTypeId || null,
  );

  useEffect(() => {
    const channel = supabase
      .channel("keto-types-realtime-cp")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "keto_types" }, () => {
        queryClient.invalidateQueries({ queryKey: ["complete-plan-keto-type"] });
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
      if (!clientId) throw new Error("No client selected");
      const targetHours = protocol?.fast_target_hours || 16;
      const startedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from("client_feature_settings")
        .update({
          active_fast_start_at: startedAt,
          active_fast_target_hours: targetHours,
          last_fast_ended_at: null,
          eating_window_ends_at: null,
        })
        .eq("client_id", clientId)
        .select("client_id, active_fast_start_at")
        .maybeSingle();
      if (error) throw error;
      if (!data?.active_fast_start_at) throw new Error("Fast timer could not be started.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting", clientId] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings", clientId] });
      toast({ title: "Fast Started! 🔥", description: "Your fasting timer is now running." });
      navigate("/client/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Timer didn't start",
        description: error instanceof Error ? error.message : "Could not start fast.",
        variant: "destructive"
      });
    },
  });

  if (!activeProtocolId) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-black text-white px-4 pt-10 text-center">
          <p className="text-white/60">No plan assigned yet.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/client/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </ClientLayout>
    );
  }

  if (!protocol) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-black flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      </ClientLayout>
    );
  }

  const durationLabel =
    protocol.duration_days === 0
      ? "∞"
      : (() => {
          const wks = Math.ceil(protocol.duration_days / 7);
          return `${wks} wk${wks !== 1 ? "s" : ""}`;
        })();

  return (
    <ClientLayout>
      <div className="min-h-screen bg-black text-white pb-10">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => navigate("/client/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/80">Your Complete Plan</p>
            <h1 className="text-lg font-bold leading-tight text-white">{protocol.name}</h1>
          </div>
        </div>

        {/* ═══ HERO — GOLD LION FASTING CARD ═══ */}
        <div className="px-4 mt-4">
          <div
            className="relative rounded-3xl overflow-hidden border border-amber-300/20 shadow-[0_10px_40px_-10px_rgba(251,191,36,0.25)]"
            style={{
              backgroundImage: `url(${fastingCardBgGoldImg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Dark overlay for legibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/85" />

            <div className="relative p-5 space-y-4">
              {/* Eyebrow */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
                  Fasting Protocol
                </p>
                <h2 className="text-3xl font-black text-white leading-none">
                  {protocol.fast_target_hours}h Fast
                </h2>
                {ketoType && (
                  <p className="text-sm text-white/80 mt-1">
                    <span className="font-black text-amber-300">{ketoType.abbreviation}</span>
                    <span className="mx-1.5 text-white/40">·</span>
                    <span>{ketoType.name}</span>
                  </p>
                )}
              </div>

              {/* COACH ASSIGNED pill */}
              <div className="inline-flex items-center gap-1.5 h-7 rounded-full px-3 border border-amber-300/40 bg-amber-300/10">
                <Crown className="h-3 w-3 text-amber-300" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Coach Assigned
                </span>
              </div>

              {/* Stat tiles — gold premium */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <StatTile
                  icon={<Clock className="h-4 w-4 text-amber-300" />}
                  value={`${protocol.fast_target_hours}h`}
                  label="Fast"
                  accent
                />
                <StatTile
                  icon={<Target className="h-4 w-4 text-white/60" />}
                  value={durationLabel}
                  label="Duration"
                />
                <StatTile
                  icon={<Sparkles className="h-4 w-4 text-white/60" />}
                  value={getDifficultyLabel(protocol.difficulty_level)}
                  label="Level"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ═══ KETO TYPE CARD ═══ */}
        {ketoType && (
          <div className="px-4 mt-6">
            <SectionDivider label="Your Keto Type" />
            <div className="rounded-2xl border border-amber-300/15 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/70">
                    Keto Strategy
                  </p>
                  <h3 className="text-2xl font-black text-white mt-1">
                    {ketoType.abbreviation}
                  </h3>
                  <p className="text-sm text-white/70">{ketoType.name}</p>
                </div>
                {ketoType.subtitle && (
                  <p className="text-xs text-white/50 italic text-right max-w-[55%]">
                    {ketoType.subtitle}
                  </p>
                )}
              </div>

              {/* Macro split */}
              <div className="grid grid-cols-3 gap-2">
                <MacroTile label="Fat" value={ketoType.fat_pct} suffix="%" />
                <MacroTile label="Protein" value={ketoType.protein_pct} suffix="%" />
                <MacroTile label="Carbs" value={ketoType.carbs_pct} suffix="%" />
              </div>

              {ketoType.description && (
                <p className="text-sm text-white/75 leading-relaxed">
                  {ketoType.description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ═══ SYNERGY ═══ */}
        {structured && (
          <div className="px-4 mt-6">
            <SectionDivider label="Why This Works Together" />
            <div className="rounded-2xl border border-amber-300/15 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 space-y-4">
              <p className="text-sm text-white/85 leading-relaxed">
                {structured.keto_synergy}
              </p>
              {structured.how_it_works && (
                <BlockNote title="How it works" body={structured.how_it_works} />
              )}
              {structured.the_science && (
                <BlockNote title="The science" body={structured.the_science} />
              )}
              {structured.built_for && structured.built_for.length > 0 && (
                <ChipBlock title="Built for" items={structured.built_for} tone="gold" />
              )}
              {structured.eat_this && structured.eat_this.length > 0 && (
                <ChipBlock title="Eat this" items={structured.eat_this} tone="green" />
              )}
              {structured.avoid_this && structured.avoid_this.length > 0 && (
                <ChipBlock title="Avoid" items={structured.avoid_this} tone="red" />
              )}
              {structured.coach_warning && (
                <div className="rounded-xl border border-amber-300/30 bg-amber-300/5 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                    Coach Note
                  </p>
                  <p className="text-sm text-white/85 leading-relaxed">
                    {structured.coach_warning}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ ACTIONS ═══ */}
        <div className="px-4 mt-8 space-y-3">
          <Button
            className="w-full h-12 text-base font-black gap-2 bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-600 text-black hover:brightness-110 shadow-[0_4px_20px_-4px_rgba(251,191,36,0.5)] ring-1 ring-amber-300/70"
            onClick={() => startFastMutation.mutate()}
            disabled={startFastMutation.isPending}
          >
            {startFastMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Flame className="h-5 w-5" />
            )}
            {startFastMutation.isPending ? "Starting..." : "Start Fast"}
          </Button>
          <Button
            variant="outline"
            className="w-full h-11 border-white/15 bg-white/5 text-white hover:bg-white/10"
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

/* ───── Helpers ───── */

function StatTile({ icon, value, label, accent }: { icon: React.ReactNode; value: string; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-2.5 text-center border min-w-0 ${
      accent
        ? "bg-amber-300/10 border-amber-300/30"
        : "bg-white/8 border-white/15"
    }`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <p className={`text-sm font-black leading-tight truncate ${accent ? "text-amber-300" : "text-white"}`}>
        {value}
      </p>
      <p className="text-[9px] text-white/60 uppercase tracking-wider font-bold mt-0.5">{label}</p>
    </div>
  );
}

function MacroTile({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="rounded-xl p-3 text-center bg-white/5 border border-white/10">
      <p className="text-xl font-black text-white leading-none">
        {value}<span className="text-sm text-white/50">{suffix}</span>
      </p>
      <p className="text-[10px] text-white/60 uppercase tracking-wider font-bold mt-1.5">{label}</p>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="h-px flex-1 bg-amber-300/20" />
      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300/80">
        {label}
      </span>
      <div className="h-px flex-1 bg-amber-300/20" />
    </div>
  );
}

function BlockNote({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">{title}</p>
      <p className="text-sm text-white/80 leading-relaxed">{body}</p>
    </div>
  );
}

function ChipBlock({ title, items, tone }: { title: string; items: string[]; tone: "gold" | "green" | "red" }) {
  const toneClasses = {
    gold: "border-amber-300/30 bg-amber-300/5 text-amber-200",
    green: "border-emerald-400/30 bg-emerald-400/5 text-emerald-200",
    red: "border-red-400/30 bg-red-400/5 text-red-200",
  }[tone];
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-2">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span key={i} className={`text-xs px-2.5 py-1 rounded-full border ${toneClasses}`}>
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}
