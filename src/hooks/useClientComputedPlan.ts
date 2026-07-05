import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { computePlan, type ComputedPlan } from "@/lib/protocolPlan";

/**
 * Shared hook: resolves the currently-assigned protocol + keto type + saved
 * calculator inputs for the effective client, then runs computePlan() so any
 * client-facing card (TodaysWindowCard, WeekStrip, WeekScheduleCard, etc.)
 * renders the exact plan the trainer saved.
 */
export function useClientComputedPlan() {
  const clientId = useEffectiveClientId();

  const { data: settings } = useQuery({
    queryKey: ["ccp-settings", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, selected_quick_plan_id, protocol_start_date, protocol_calc_inputs, schedule_timezone, day_start_hour, assigned_protocol_duration_days, protocol_run_mode")
        .eq("client_id", clientId!)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const protocolId = settings?.selected_protocol_id ?? null;
  const quickId = settings?.selected_quick_plan_id ?? null;
  const activeId = protocolId || quickId;

  const { data: protocol } = useQuery({
    queryKey: ["ccp-protocol", activeId, !!protocolId],
    queryFn: async () => {
      if (protocolId) {
        const { data } = await supabase
          .from("fasting_protocols")
          .select("name, fast_target_hours")
          .eq("id", protocolId)
          .maybeSingle();
        return data;
      }
      const { data } = await supabase
        .from("quick_fasting_plans")
        .select("name, fast_hours")
        .eq("id", quickId!)
        .maybeSingle();
      return data ? { name: data.name, fast_target_hours: data.fast_hours } : null;
    },
    enabled: !!activeId,
  });

  const { data: ketoAssignment } = useQuery({
    queryKey: ["ccp-keto", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_keto_assignments")
        .select("keto_type_id")
        .eq("client_id", clientId!)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const { data: ketoType } = useQuery({
    queryKey: ["ccp-keto-type", ketoAssignment?.keto_type_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("keto_types")
        .select("abbreviation, name, protein_pct, carbs_pct, fat_pct, color")
        .eq("id", ketoAssignment!.keto_type_id!)
        .maybeSingle();
      return data;
    },
    enabled: !!ketoAssignment?.keto_type_id,
  });

  const { data: weightLbs } = useQuery({
    queryKey: ["ccp-weight", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data: defs } = await supabase
        .from("metric_definitions")
        .select("id")
        .eq("name", "Weight")
        .limit(1);
      const defId = defs?.[0]?.id;
      if (!defId) return null;
      const { data: cm } = await supabase
        .from("client_metrics")
        .select("id")
        .eq("client_id", clientId)
        .eq("metric_definition_id", defId)
        .limit(1);
      const cmId = cm?.[0]?.id;
      if (!cmId) return null;
      const { data: entry } = await supabase
        .from("metric_entries")
        .select("value")
        .eq("client_metric_id", cmId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (entry as any)?.value ?? null;
    },
    enabled: !!clientId,
  });

  const plan: ComputedPlan | null = useMemo(() => {
    if (!ketoType || !protocol) return null;
    const inputs: any = (settings as any)?.protocol_calc_inputs || {};
    const ACTIVITY_MULT: Record<string, number> = {
      sedentary: 13, light: 14.5, moderate: 16, active: 17.5, very_active: 19,
    };
    const GOAL_ADJUST: Record<string, number> = { cut: -0.20, maintain: 0, bulk: 0.10 };
    const w = Number(inputs.weight) || Number(weightLbs) || 180;
    const activityMult = ACTIVITY_MULT[inputs.activity] ?? 16;
    const goalAdjust = inputs.goal === "custom"
      ? -((Number(inputs.customDeficit) || 20) / 100)
      : (GOAL_ADJUST[inputs.goal] ?? 0);
    const planType = inputs.planType === "extended" ? "extended" : "recurring";
    const planLengthDays = Number(inputs.planLengthDays) || 7;
    const extendedTotalHours = inputs.extendedPreset === "custom"
      ? (Number(inputs.customFastHours) || 48)
      : (parseInt(inputs.extendedPreset, 10) || 48);
    return computePlan({
      weightLbs: w,
      ketoType: ketoType as any,
      protocol: { name: protocol.name, fast_target_hours: protocol.fast_target_hours },
      activityMult,
      goalAdjust,
      planType,
      planLengthDays,
      extendedTotalHours,
      eatStartHour: Number((settings as any)?.day_start_hour ?? NaN),
    });
  }, [ketoType, weightLbs, protocol, settings]);

  const dayIndex = useMemo(() => {
    if (!plan) return 0;
    const tz = (settings as any)?.schedule_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const dayStartHour = Number((settings as any)?.day_start_hour ?? 0);
    // Local YYYY-MM-DD in the client's tz, shifted by dayStartHour so pre-cutoff hours still count as "yesterday"
    const localDateKey = (ms: number) => {
      const shifted = new Date(ms - dayStartHour * 3_600_000);
      try {
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
        }).formatToParts(shifted);
        const y = parts.find(p => p.type === "year")?.value;
        const m = parts.find(p => p.type === "month")?.value;
        const d = parts.find(p => p.type === "day")?.value;
        return `${y}-${m}-${d}`;
      } catch {
        return shifted.toISOString().slice(0, 10);
      }
    };
    const startMs = settings?.protocol_start_date
      ? new Date(settings.protocol_start_date).getTime()
      : Date.now();
    const startKey = localDateKey(startMs);
    const todayKey = localDateKey(Date.now());
    const diffDays = Math.floor(
      (Date.parse(todayKey + "T00:00:00Z") - Date.parse(startKey + "T00:00:00Z")) / 86_400_000
    );
    return ((diffDays % plan.days.length) + plan.days.length) % plan.days.length;
  }, [plan, settings?.protocol_start_date, (settings as any)?.schedule_timezone, (settings as any)?.day_start_hour]);

  return {
    plan,
    dayIndex,
    protocolName: protocol?.name ?? null,
    ketoName: (ketoType as any)?.name ?? null,
    ketoAccent: (ketoType as any)?.color ?? null,
    stage: computeStage(settings?.protocol_start_date),
    protocolStartDate: (settings as any)?.protocol_start_date ?? null,
    assignedDurationDays: Number((settings as any)?.assigned_protocol_duration_days) || null,
    runMode: ((settings as any)?.protocol_run_mode === "recurring" ? "recurring" : "one_time") as "one_time" | "recurring",
  };
}

export type ProtocolStage = {
  number: 1 | 2 | 3;
  label: string;
  description: string;
  dayInProtocol: number;
  daysUntilNext: number | null; // null when at final stage
};

/**
 * Keto adaptation phases derived from the protocol start date:
 *  Stage 1 — Adaptation      (days 1–14)   fuel switch, keto flu window
 *  Stage 2 — Fat-Adapted     (days 15–42)  stable ketones, energy normalizes
 *  Stage 3 — Metabolic Flex  (day 43+)     fully adapted, flexible fasting
 */
export function computeStage(startDate: string | null | undefined): ProtocolStage {
  const startMs = startDate ? new Date(startDate).getTime() : Date.now();
  const dayInProtocol = Math.max(
    1,
    Math.floor((Date.now() - startMs) / 86_400_000) + 1
  );
  if (dayInProtocol <= 14) {
    return {
      number: 1,
      label: "Adaptation",
      description: "Your body is switching from sugar to fat for fuel. Keto-flu is normal — hydrate and lean on electrolytes.",
      dayInProtocol,
      daysUntilNext: 15 - dayInProtocol,
    };
  }
  if (dayInProtocol <= 42) {
    return {
      number: 2,
      label: "Fat-Adapted",
      description: "Ketones are stable and energy is coming back. Fasts feel easier and cravings drop.",
      dayInProtocol,
      daysUntilNext: 43 - dayInProtocol,
    };
  }
  return {
    number: 3,
    label: "Metabolic Flex",
    description: "Fully fat-adapted. You can flex between fasting, keto, and refeeds without losing momentum.",
    dayInProtocol,
    daysUntilNext: null,
  };
}