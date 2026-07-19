import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, Save, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Eye, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { computePlan } from "@/lib/protocolPlan";
import { ProtocolPreviewDialog } from "@/components/protocol/ProtocolPreviewDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Goal = "cut" | "maintain" | "bulk" | "custom";
type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
type PlanType = "recurring" | "extended";
type ExtendedPreset = "24" | "36" | "48" | "72" | "120" | "custom";

interface Props { clientId: string; trainerId: string }

const ACTIVITY_MULT: Record<Activity, number> = {
  sedentary: 13, light: 14.5, moderate: 16, active: 17.5, very_active: 19,
};
const GOAL_ADJUST: Record<Exclude<Goal, "custom">, number> = { cut: -0.20, maintain: 0, bulk: 0.10 };
const ACTIVITY_LABEL: Record<Activity, string> = {
  sedentary: "Sedentary (desk job)",
  light: "Light (1–3 days/wk)",
  moderate: "Moderate (3–5 days/wk)",
  active: "Active (6–7 days/wk)",
  very_active: "Very Active (2x/day)",
};
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function weekIndexFromDateOnly(value: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return 0;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return (date.getUTCDay() + 6) % 7; // convert Sun=0 to Mon=0 labels
}

function formatPlanDayWithDate(startDateValue: string, offset: number, fallback: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(startDateValue);
  if (!m) return fallback;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + offset));
  const weekday = date.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" });
  const monthDay = date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
  return `${weekday} · ${monthDay}`;
}

export function KetoProtocolCalculatorPanel({ clientId, trainerId }: Props) {
  const storageKey = `keto-protocol-${clientId}`;
  const queryClient = useQueryClient();

  const { data: assignment } = useQuery({
    queryKey: ["keto-assignment", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_keto_assignments")
        .select("id, keto_type_id, assigned_at, keto_types(abbreviation, name, subtitle, protein_pct, carbs_pct, fat_pct, carb_limit_grams, color)")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: allKetoTypes } = useQuery({
    queryKey: ["kpc-all-keto-types"],
    queryFn: async () => {
      const { data } = await supabase
        .from("keto_types")
        .select("id, abbreviation, name, subtitle, protein_pct, carbs_pct, fat_pct, color")
        .eq("is_active", true)
        .order("order_index");
      return data || [];
    },
  });

  const { data: allProtocols } = useQuery({
    queryKey: ["kpc-all-protocols"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fasting_protocols")
        .select("id, name, fast_target_hours")
        .order("name");
      return data || [];
    },
  });

  const { data: featureSettings } = useQuery({
    queryKey: ["kpc-feature-settings", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, assigned_protocol_duration_days, protocol_start_date, protocol_calc_inputs, day_start_hour, protocol_run_mode")
        .eq("client_id", clientId)
        .maybeSingle();
      return data;
    },
  });

  const assignKetoMutation = useMutation({
    mutationFn: async (ketoId: string) => {
      if (assignment?.id) {
        await supabase
          .from("client_keto_assignments")
          .update({ is_active: false })
          .eq("id", assignment.id);
      }
      const { error } = await supabase.from("client_keto_assignments").insert({
        client_id: clientId,
        keto_type_id: ketoId,
        assigned_by: trainerId,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keto-assignment", clientId] });
      queryClient.invalidateQueries({ queryKey: ["synergy-panel-keto", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-keto-assignment"] });
      toast.success("Keto type updated");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to update keto type"),
  });

  const assignProtocolMutation = useMutation({
    mutationFn: async (vars: string | null | { protocolId: string | null; source?: string }) => {
      const protocolId = typeof vars === "object" && vars !== null ? vars.protocolId : vars;
      const patch = {
        selected_protocol_id: protocolId as any,
        selected_quick_plan_id: null,
        quick_plan_duration_days: null,
        protocol_assigned_by: trainerId,
        active_fast_target_hours: null,
      };
      const { data: existing } = await supabase
        .from("client_feature_settings")
        .select("client_id")
        .eq("client_id", clientId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("client_feature_settings")
          .update(patch)
          .eq("client_id", clientId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_feature_settings")
          .insert([{ client_id: clientId, ...patch }] as any);
        if (error) throw error;
      }
      return { protocolId };
    },
    onSuccess: async (_data, vars, context: any) => {
      const newProtocolId = typeof vars === "object" && vars !== null ? vars.protocolId : vars;
      const source = typeof vars === "object" && vars !== null && vars.source ? vars.source : "assign";
      queryClient.invalidateQueries({ queryKey: ["kpc-feature-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["synergy-panel-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
      queryClient.invalidateQueries({ queryKey: ["protocol-history", clientId] });
      queryClient.invalidateQueries({ queryKey: ["active-protocol-summary", clientId] });
      const prev = context?.previousProtocolId ?? null;
      // Log history entry (best-effort)
      const newName = allProtocols?.find((p) => p.id === newProtocolId)?.name ?? null;
      const prevName = allProtocols?.find((p) => p.id === prev)?.name ?? null;
      try {
        await (supabase.from("protocol_assignment_history" as any) as any).insert({
          client_id: clientId,
          assigned_by: trainerId,
          protocol_id: newProtocolId,
          protocol_name: newName,
          previous_protocol_id: prev,
          previous_protocol_name: prevName,
          source,
        });
        queryClient.invalidateQueries({ queryKey: ["protocol-history", clientId] });
      } catch { /* ignore */ }
      if (prev !== newProtocolId) {
        toast.success("Protocol assigned", {
          action: {
            label: "Undo",
            onClick: () => assignProtocolMutation.mutate({ protocolId: prev, source: "undo" }),
          },
        });
      } else {
        toast.success("Protocol reverted");
      }
    },
    onMutate: async () => {
      return { previousProtocolId: featureSettings?.selected_protocol_id ?? null };
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to assign protocol"),
  });

  // Persist the coach-assigned protocol duration to the DB so the client's
  // Today card / lion header shows the accurate "Day X / N" reflecting what
  // was actually assigned (not the protocol's built-in default).
  const saveDurationMutation = useMutation({
    mutationFn: async (days: number) => {
      const savedStart = (featureSettings as any)?.protocol_start_date;
      const effectiveStartDate = startDate || (savedStart ? String(savedStart).slice(0, 10) : new Date().toISOString().slice(0, 10));
      const protocolInputsPatch = {
        startDate: effectiveStartDate,
        planLengthDays: days,
        savedAt: new Date().toISOString(),
      };
      const patch = {
        assigned_protocol_duration_days: days,
        protocol_start_date: effectiveStartDate,
        protocol_calc_inputs: {
          ...((featureSettings as any)?.protocol_calc_inputs || {}),
          ...protocolInputsPatch,
        },
      } as any;
      const { data: existing } = await supabase
        .from("client_feature_settings")
        .select("client_id")
        .eq("client_id", clientId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("client_feature_settings")
          .update(patch)
          .eq("client_id", clientId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_feature_settings")
          .insert([{ client_id: clientId, ...patch }] as any);
        if (error) throw error;
      }
      setStartDate(effectiveStartDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpc-feature-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["wse-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["ccp-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
      queryClient.invalidateQueries({ queryKey: ["active-protocol-summary", clientId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to save duration"),
  });

  const saveStartDateMutation = useMutation({
    mutationFn: async (date: string) => {
      if (!date) return;
      const existingInputs = ((featureSettings as any)?.protocol_calc_inputs || {}) as Record<string, unknown>;
      const patch = {
        protocol_start_date: date,
        protocol_calc_inputs: {
          ...existingInputs,
          startDate: date,
          planLengthDays,
          savedAt: new Date().toISOString(),
        },
      } as any;
      const { data: existing } = await supabase
        .from("client_feature_settings")
        .select("client_id")
        .eq("client_id", clientId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("client_feature_settings")
          .update(patch)
          .eq("client_id", clientId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_feature_settings")
          .insert([{ client_id: clientId, ...patch }] as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpc-feature-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
      queryClient.invalidateQueries({ queryKey: ["ccp-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["active-protocol-summary", clientId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to save start date"),
  });

  const { data: weightLbs } = useQuery({
    queryKey: ["latest-weight", clientId],
    queryFn: async () => {
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
  });

  const { data: paceGoal } = useQuery({
    queryKey: ["pace-goal", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("smart_pace_goals")
        .select("goal_direction")
        .eq("client_id", clientId)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
  });

  const [weight, setWeight] = useState<string>("");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [activity, setActivity] = useState<Activity>("moderate");
  const [startDate, setStartDate] = useState<string>("");
  const [customDeficit, setCustomDeficit] = useState<number>(20); // percent, 10..80
  const [planType, setPlanType] = useState<PlanType>("recurring");
  const [planLengthDays, setPlanLengthDays] = useState<number>(7);
  const [runMode, setRunMode] = useState<"one_time" | "recurring">("one_time");
  const [extendedPreset, setExtendedPreset] = useState<ExtendedPreset>("48");
  const [customFastHours, setCustomFastHours] = useState<number>(48);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setWeight(String(s.weight ?? ""));
        setGoal(s.goal ?? "maintain");
        setActivity(s.activity ?? "moderate");
        setStartDate(s.startDate ?? "");
        if (typeof s.customDeficit === "number") setCustomDeficit(s.customDeficit);
        if (s.planType === "recurring" || s.planType === "extended") setPlanType(s.planType);
        if (typeof s.planLengthDays === "number") setPlanLengthDays(s.planLengthDays);
        if (typeof s.extendedPreset === "string") setExtendedPreset(s.extendedPreset as ExtendedPreset);
        if (typeof s.customFastHours === "number") setCustomFastHours(s.customFastHours);
        return;
      } catch {}
    }
    if (weightLbs && !weight) setWeight(String(weightLbs));
    if (assignment?.assigned_at && !startDate) {
      setStartDate(new Date(assignment.assigned_at).toISOString().slice(0, 10));
    }
    if (paceGoal?.goal_direction) {
      const g = String(paceGoal.goal_direction).toLowerCase();
      if (g.includes("loss") || g.includes("cut") || g.includes("down")) setGoal("cut");
      else if (g.includes("gain") || g.includes("bulk") || g.includes("up")) setGoal("bulk");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment, weightLbs, paceGoal]);

  // Seed the Plan Length from the coach-saved assignment duration (DB is source of truth).
  useEffect(() => {
    const d = (featureSettings as any)?.assigned_protocol_duration_days;
    if (typeof d === "number" && d > 0 && d !== planLengthDays) {
      setPlanLengthDays(d);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureSettings?.assigned_protocol_duration_days]);

  // Seed run mode from DB
  useEffect(() => {
    const m = (featureSettings as any)?.protocol_run_mode;
    if (m === "one_time" || m === "recurring") setRunMode(m);
  }, [(featureSettings as any)?.protocol_run_mode]);

  useEffect(() => {
    const savedStart = (featureSettings as any)?.protocol_start_date;
    if (savedStart && !startDate) {
      setStartDate(String(savedStart).slice(0, 10));
    }
  }, [(featureSettings as any)?.protocol_start_date, startDate]);

  // Live-preview: reflect run-mode / plan-length changes in the client's Live
  // Schedule and lion card immediately (before Save).
  useEffect(() => {
    queryClient.setQueryData(["ccp-settings", clientId], (prev: any) => ({
      ...(prev ?? {}),
      protocol_run_mode: runMode,
      assigned_protocol_duration_days: planLengthDays,
    }));
    queryClient.setQueryData(["wse-settings", clientId], (prev: any) => ({
      ...(prev ?? {}),
      protocol_run_mode: runMode,
      assigned_protocol_duration_days: planLengthDays,
      protocol_start_date: prev?.protocol_start_date ?? (startDate || ((featureSettings as any)?.protocol_start_date ?? null)),
    }));
  }, [runMode, planLengthDays, startDate, clientId, queryClient, featureSettings]);

  const kt = assignment?.keto_types as any;

  const plan = useMemo(() => {
    const w = parseFloat(weight);
    if (!w || !kt) return null;
    const tdee = Math.round(w * ACTIVITY_MULT[activity]);
    const adjust = goal === "custom" ? -(customDeficit / 100) : GOAL_ADJUST[goal];
    const target = Math.round(tdee * (1 + adjust));
    const proteinFloor = Math.round(w * 0.7);

    // Derive fast/eat window from the assigned fasting protocol
    const selectedProtocol = allProtocols?.find(
      (p) => p.id === featureSettings?.selected_protocol_id
    );
    const rawFastHours = Math.max(0, selectedProtocol?.fast_target_hours ?? 16);
    const isAlternateDay = rawFastHours >= 24;
    const fastHours = isAlternateDay ? 24 : Math.min(23, rawFastHours);
    const eatHours = isAlternateDay ? 24 : Math.max(1, 24 - fastHours);
    // Prefer client's configured Start-of-day anchor; otherwise fall back to
    // the legacy behavior of ending the eating window at 8:00 PM.
    // Only treat day_start_hour as an eating-window anchor when the trainer
    // has explicitly set a non-zero value. The column defaults to 0 for every
    // client, and 0 would otherwise shift a 16:8 window to midnight → 8 AM.
    const rawDayStart = Number((featureSettings as any)?.day_start_hour);
    const hasDayStart = Number.isFinite(rawDayStart) && rawDayStart !== 0;
    const eatStartHour = hasDayStart
      ? ((Math.floor(rawDayStart) % 24) + 24) % 24
      : ((20 - eatHours) % 24 + 24) % 24;
    const eatEndHour = hasDayStart
      ? (eatStartHour + eatHours) % 24
      : 20;
    const fmt = (h: number) => {
      const period = h >= 12 ? "PM" : "AM";
      const hr = h % 12 === 0 ? 12 : h % 12;
      return `${hr}:00 ${period}`;
    };
    const defaultFastLabel = isAlternateDay ? "24h" : `${fastHours}:${eatHours}`;
    const defaultEatStart = fmt(eatStartHour);
    const defaultEatEnd = fmt(eatEndHour);
    const isTightWindow = !isAlternateDay && eatHours <= 4;
    const isOmad = !isAlternateDay && fastHours >= 20;

    const isCKD = kt.abbreviation === "CKD";

    // ---------- Extended fast branch ----------
    if (planType === "extended") {
      const totalHours = extendedPreset === "custom"
        ? Math.max(12, Math.min(240, customFastHours))
        : parseInt(extendedPreset, 10);
      const fastDayCount = Math.max(1, Math.ceil(totalHours / 24));
      const needsRefeed = totalHours >= 36;
      const refeedCal = Math.round(target * 0.7);
      const refeedProteinG = Math.round(w * 1.0);
      const refeedCarbG = 30;
      const refeedFatG = Math.max(0, Math.round((refeedCal - refeedProteinG * 4 - refeedCarbG * 4) / 9));

      const totalDays = fastDayCount + (needsRefeed ? 1 : 0);
      const days = Array.from({ length: totalDays }).map((_, i) => {
        const isRefeedDay = needsRefeed && i === totalDays - 1;
        if (isRefeedDay) {
          return {
            day: `Day ${i + 1}`,
            isRefeed: true,
            cal: refeedCal, proteinG: refeedProteinG, carbG: refeedCarbG, fatG: refeedFatG,
            fastWindow: "Refeed",
            eatStart: "12:00 PM", eatEnd: "6:00 PM",
            tight: false, omad: false, adFast: false,
          };
        }
        const hoursLeft = totalHours - i * 24;
        const hoursThisDay = Math.min(24, hoursLeft);
        return {
          day: `Day ${i + 1}`,
          isRefeed: false,
          cal: 0, proteinG: 0, carbG: 0, fatG: 0,
          fastWindow: `${hoursThisDay}h fast · water + electrolytes`,
          eatStart: "", eatEnd: "",
          tight: false, omad: false, adFast: true,
        };
      });
      return { tdee, target, proteinFloor, days, adjust, protocolName: `${totalHours}h extended fast`, extended: true, totalHours, needsRefeed };
    }

    // ---------- Recurring weekly branch ----------
    const length = Math.max(1, Math.min(30, planLengthDays));
    const startWeekIdx = startDate ? weekIndexFromDateOnly(startDate) : 0;
    const days = Array.from({ length }).map((_, i) => {
      const weekIdx = (startWeekIdx + i) % 7;
      const d = DAYS[weekIdx];
      const isRefeed = isCKD && (weekIdx === 5 || weekIdx === 6); // Sat/Sun
      const isAdFastDay = isAlternateDay && weekIdx % 2 === 0; // Mon/Wed/Fri/Sun full fast
      const cal = isRefeed ? Math.round(target * 1.15) : target;
      const proteinG = Math.max(proteinFloor, Math.round((cal * (kt.protein_pct / 100)) / 4));
      const carbG = isRefeed ? Math.round((cal * 0.45) / 4) : Math.round((cal * (kt.carbs_pct / 100)) / 4);
      const fatG = Math.round((cal - proteinG * 4 - carbG * 4) / 9);
      const fastWindow = isRefeed
        ? "14:10 (refeed)"
        : isAlternateDay
          ? (isAdFastDay ? "24h fast" : "Eat day")
          : defaultFastLabel;
      const eatStart = isRefeed ? "10:00 AM" : defaultEatStart;
      const eatEnd = defaultEatEnd;
      const tight = !isRefeed && !isAlternateDay && isTightWindow;
      const omad = !isRefeed && !isAlternateDay && isOmad;
      const adFast = isAlternateDay && isAdFastDay;
      return { day: length > 7 ? `${d} ${Math.floor(i / 7) + 1}` : d, isRefeed, cal: adFast ? 0 : cal, proteinG: adFast ? 0 : proteinG, carbG: adFast ? 0 : carbG, fatG: adFast ? 0 : fatG, fastWindow, eatStart, eatEnd, tight, omad, adFast };
    });
    return { tdee, target, proteinFloor, days, adjust, protocolName: selectedProtocol?.name, extended: false };
  }, [weight, goal, activity, kt, customDeficit, allProtocols, featureSettings?.selected_protocol_id, (featureSettings as any)?.day_start_hour, planType, planLengthDays, startDate, extendedPreset, customFastHours]);

  const handleSave = async () => {
    const savedStart = (featureSettings as any)?.protocol_start_date;
    const effectiveStartDate = startDate || (savedStart ? String(savedStart).slice(0, 10) : new Date().toISOString().slice(0, 10));
    const extendedHours = extendedPreset === "custom" ? customFastHours : parseInt(extendedPreset, 10);
    const assignmentDurationDays = planType === "extended"
      ? Math.max(1, Math.ceil(Math.max(12, Math.min(240, extendedHours)) / 24))
      : planLengthDays;
    const effectiveRunMode = planType === "extended" ? "one_time" : runMode;
    const payload = {
      weight: parseFloat(weight) || null,
      goal,
      activity,
      startDate: effectiveStartDate,
      customDeficit,
      planType,
      planLengthDays,
      extendedPreset,
      customFastHours,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
    try {
      const patch: any = {
        protocol_calc_inputs: payload,
        protocol_start_date: effectiveStartDate,
        protocol_run_mode: effectiveRunMode,
        assigned_protocol_duration_days: assignmentDurationDays,
      };
      const { data: existing } = await supabase
        .from("client_feature_settings")
        .select("client_id")
        .eq("client_id", clientId)
        .maybeSingle();
      if (existing) {
        await supabase.from("client_feature_settings").update(patch).eq("client_id", clientId);
      } else {
        await supabase.from("client_feature_settings").insert([{ client_id: clientId, ...patch }] as any);
      }
      queryClient.invalidateQueries({ queryKey: ["tw-settings"] });
      queryClient.invalidateQueries({ queryKey: ["kpc-feature-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["wse-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["ccp-settings", clientId] });
    } catch (e) {
      console.error("save protocol inputs failed", e);
    }
    setStartDate(effectiveStartDate);
    toast.success("Protocol saved for this client");
  };

  const handleResetInputs = () => {
    localStorage.removeItem(storageKey);
    setWeight(weightLbs ? String(weightLbs) : "");
    setGoal("maintain");
    setActivity("moderate");
    setStartDate((featureSettings as any)?.protocol_start_date ? String((featureSettings as any).protocol_start_date).slice(0, 10) : "");
    setCustomDeficit(20);
    setPlanType("recurring");
    setPlanLengthDays(Number((featureSettings as any)?.assigned_protocol_duration_days) || 7);
    setRunMode(((featureSettings as any)?.protocol_run_mode === "recurring" ? "recurring" : "one_time") as "one_time" | "recurring");
    setExtendedPreset("48");
    setCustomFastHours(48);
    toast.info("Calculator inputs reset. Assigned plan unchanged.");
  };

  const [resetting, setResetting] = useState(false);
  const handleFullPlanReset = async () => {
    setResetting(true);
    try {
      // 1. Deactivate keto assignment(s)
      await supabase
        .from("client_keto_assignments")
        .update({ is_active: false })
        .eq("client_id", clientId);

      // 2. Clear plan fields on client_feature_settings
      const clearedPlanPatch = {
        selected_protocol_id: null,
        protocol_start_date: null,
        protocol_calc_inputs: null,
        protocol_completed: false,
        assigned_protocol_duration_days: null,
        selected_quick_plan_id: null,
        quick_plan_duration_days: null,
        protocol_assigned_by: null,
        active_fast_start_at: null,
        active_fast_target_hours: null,
        eating_window_ends_at: null,
        fast_lock_pin: null,
        next_scheduled_fast_at: null,
        enforce_scheduled_start: false,
        maintenance_mode: false,
        maintenance_schedule_type: null,
        protocol_run_mode: "one_time",
      } as any;

      await supabase
        .from("client_feature_settings")
        .update(clearedPlanPatch)
        .eq("client_id", clientId);

      // 3. Delete scheduled calendar items for this client
      // protocol_schedule_items / _keto_overrides have no client_id column —
      // they hang off protocol_daily_schedules. Resolve the schedule ids for
      // this client first, then delete by schedule_id.
      const { data: dailySchedules } = await supabase
        .from("protocol_daily_schedules")
        .select("id")
        .eq("client_id", clientId);
      const scheduleIds = (dailySchedules ?? []).map((s: any) => s.id);
      if (scheduleIds.length > 0) {
        await (supabase.from("protocol_schedule_items" as any) as any)
          .delete()
          .in("schedule_id", scheduleIds);
        await (supabase.from("protocol_schedule_keto_overrides" as any) as any)
          .delete()
          .in("schedule_id", scheduleIds);
        await supabase
          .from("protocol_daily_schedules")
          .delete()
          .in("id", scheduleIds);
      }

      // 4. Delete saved completion snapshots
      await (supabase.from("plan_completions" as any) as any)
        .delete()
        .eq("client_id", clientId);

      // 5. Clear synergy selection
      await supabase
        .from("fasting_synergy_selection")
        .delete()
        .eq("client_id", clientId);

      // 5b. Clear custom weekly fasting schedule + date-range overrides so the
      // next assigned plan starts from a clean slate (prevents stale times
      // from carrying over into a new protocol).
      await (supabase.from("client_weekly_schedule" as any) as any)
        .delete()
        .eq("client_id", clientId);
      await (supabase.from("client_schedule_overrides" as any) as any)
        .delete()
        .eq("client_id", clientId);

      // 5c. End any active fasting log so the dashboard doesn't show a stale
      // timer after the plan is wiped.
      await supabase
        .from("fasting_log")
        .update({ status: "cancelled", end_time: new Date().toISOString() })
        .eq("client_id", clientId)
        .eq("status", "active");

      // 6. Clear local cache
      localStorage.removeItem(storageKey);

      // 6b. Reset calculator UI state (weight, activity, deficit, plan length, etc.)
      setWeight("");
      setGoal("maintain");
      setActivity("moderate");
      setStartDate("");
      setCustomDeficit(20);
      setPlanType("recurring");
      setPlanLengthDays(7);
      setRunMode("one_time");
      setExtendedPreset("48");
      setCustomFastHours(48);

      const applyClearedPlan = (prev: any) => (prev ? { ...prev, ...clearedPlanPatch } : prev);
      queryClient.setQueryData(["kpc-feature-settings", clientId], applyClearedPlan);
      queryClient.setQueryData(["ccp-settings", clientId], applyClearedPlan);
      queryClient.setQueriesData({ queryKey: ["my-feature-settings-fasting"] }, applyClearedPlan);
      queryClient.setQueriesData({ queryKey: ["my-feature-settings"] }, applyClearedPlan);
      queryClient.setQueryData(["keto-assignment", clientId], null);
      queryClient.setQueryData(["ccp-keto", clientId], null);
      queryClient.setQueryData(["fasting-card-keto-type", clientId], null);

      // 7. Refresh all related queries
      queryClient.invalidateQueries({ queryKey: ["keto-assignment", clientId] });
      queryClient.invalidateQueries({ queryKey: ["kpc-feature-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["tw-settings"] });
      queryClient.invalidateQueries({ queryKey: ["protocol-schedule", clientId] });
      queryClient.invalidateQueries({ queryKey: ["plan-completions", clientId] });
      queryClient.invalidateQueries({ queryKey: ["protocol-history", clientId] });
      // Banner + Stage Timeline + client-facing computed plan
      queryClient.invalidateQueries({ queryKey: ["ccp-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["ccp-protocol"] });
      queryClient.invalidateQueries({ queryKey: ["ccp-keto", clientId] });
      queryClient.invalidateQueries({ queryKey: ["ccp-keto-type"] });
      queryClient.invalidateQueries({ queryKey: ["fasting-card-keto-type", clientId] });
      queryClient.invalidateQueries({ queryKey: ["active-protocol-summary", clientId] });
      queryClient.invalidateQueries({ queryKey: ["stage-timeline-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["ccp-enforce"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-alignment", clientId] });
      queryClient.invalidateQueries({ queryKey: ["synergy-panel-keto", clientId] });
      queryClient.invalidateQueries({ queryKey: ["synergy-panel-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-keto-assignment"] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
      queryClient.invalidateQueries({ queryKey: ["client-weekly-schedule", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-schedule-overrides", clientId] });
      queryClient.invalidateQueries({ queryKey: ["active-fasting-log", clientId] });

      toast.success("Plan cleared. Client is ready for a fresh assignment.");
    } catch (e: any) {
      console.error("[reset plan] failed:", e);
      toast.error(e?.message || "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  const previewPlan = useMemo(() => {
    const w = parseFloat(weight);
    if (!w || !kt) return null;
    const selectedProtocol = allProtocols?.find(
      (p) => p.id === featureSettings?.selected_protocol_id
    );
    const adjust = goal === "custom" ? -(customDeficit / 100) : GOAL_ADJUST[goal];
    return computePlan({
      weightLbs: w,
      ketoType: kt as any,
      protocol: selectedProtocol ? { name: selectedProtocol.name, fast_target_hours: selectedProtocol.fast_target_hours } : null,
      activityMult: ACTIVITY_MULT[activity],
      goalAdjust: adjust,
      planType,
      planLengthDays,
      extendedTotalHours: extendedPreset === "custom" ? customFastHours : parseInt(extendedPreset, 10),
      eatStartHour: Number((featureSettings as any)?.day_start_hour ?? NaN),
    });
  }, [weight, kt, allProtocols, featureSettings?.selected_protocol_id, (featureSettings as any)?.day_start_hour, goal, customDeficit, activity, planType, planLengthDays, extendedPreset, customFastHours]);

  if (!assignment) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="text-center text-muted-foreground">
            Assign a Fuel Style to this client to generate a protocol.
          </p>
          <div className="max-w-xs mx-auto">
            <Label>Fuel Style</Label>
            <Select onValueChange={(v) => assignKetoMutation.mutate(v)}>
              <SelectTrigger><SelectValue placeholder="Choose Fuel Style…" /></SelectTrigger>
              <SelectContent>
                {allKetoTypes?.map(k => (
                  <SelectItem key={k.id} value={k.id}>{k.abbreviation} · {k.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <Calculator className="h-5 w-5 shrink-0" style={{ color: kt?.color }} />
              <CardTitle className="text-base sm:text-lg">Protocol Calculator</CardTitle>
              <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-normal text-left leading-tight" style={{ borderColor: kt?.color, color: kt?.color }}>
                {kt?.abbreviation} · {kt?.name}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
              <Button variant="outline" size="sm" onClick={handleResetInputs} className="w-full sm:w-auto">
                <RefreshCw className="h-4 w-4 mr-1" /> Reset Inputs
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} disabled={!previewPlan} className="w-full sm:w-auto">
                <Eye className="h-4 w-4 mr-1" /> <span className="truncate">Preview</span>
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!plan} className="w-full sm:w-auto">
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={resetting} className="w-full sm:w-auto">
                    <RotateCcw className="h-4 w-4 mr-1" /> Clear Program
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset entire plan?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Clears the assigned protocol, fuel style, scheduled calendar,
                      and saved completion for this client — leaving them as if no
                      plan was ever assigned. Weigh-ins, workouts, fasting history,
                      and badges are kept.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleFullPlanReset}>
                      Yes, clear program
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Fuel Style</Label>
              <Select
                value={assignment.keto_type_id ?? undefined}
                onValueChange={(v) => assignKetoMutation.mutate(v)}
              >
              <SelectTrigger>
                <SelectValue>
                  {kt ? (
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: kt.color }}
                      />
                      <span>{kt.abbreviation} · {kt.name}</span>
                    </span>
                  ) : null}
                </SelectValue>
              </SelectTrigger>
                <SelectContent>
                  {allKetoTypes?.map(k => (
                  <SelectItem key={k.id} value={k.id} className="focus:bg-muted focus:text-foreground data-[highlighted]:bg-muted data-[highlighted]:text-foreground">
                    <div className="flex items-start gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0 mt-1.5"
                        style={{ backgroundColor: k.color }}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium" style={{ color: k.color }}>
                          {k.abbreviation} · {k.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          P {k.protein_pct}% · C {k.carbs_pct}% · F {k.fat_pct}%
                          {k.subtitle ? ` — ${k.subtitle}` : ""}
                        </span>
                      </div>
                    </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fasting Protocol</Label>
              <Select
                value={featureSettings?.selected_protocol_id ?? undefined}
                onValueChange={(v) => assignProtocolMutation.mutate(v)}
              >
                <SelectTrigger><SelectValue placeholder="Choose protocol…" /></SelectTrigger>
                <SelectContent>
                  {allProtocols?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.fast_target_hours}h)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Weight (lbs)</Label>
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="180" />
            </div>
            <div>
              <Label>Goal</Label>
              <Select value={goal} onValueChange={(v) => setGoal(v as Goal)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cut">Cut (-20%)</SelectItem>
                  <SelectItem value="maintain">Maintain</SelectItem>
                  <SelectItem value="bulk">Bulk (+10%)</SelectItem>
                  <SelectItem value="custom">Custom deficit…</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Activity</Label>
              <Select value={activity} onValueChange={(v) => setActivity(v as Activity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACTIVITY_LABEL) as Activity[]).map(k => (
                    <SelectItem key={k} value={k}>{ACTIVITY_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setStartDate(next);
                  if (next) saveStartDateMutation.mutate(next);
                }}
              />
            </div>
          </div>

          {goal === "custom" && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Custom deficit</Label>
                <span className="text-sm font-semibold text-primary">-{customDeficit}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={80}
                step={5}
                value={customDeficit}
                onChange={(e) => setCustomDeficit(parseInt(e.target.value, 10))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>-10% (mild)</span>
                <span>-40% (aggressive)</span>
                <span>-80% (medical only)</span>
              </div>
              {customDeficit >= 50 && (
                <p className="text-xs text-destructive">
                  Warning: deficits above -40% are extreme and should only be used under medical supervision.
                </p>
              )}
            </div>
          )}

          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-1.5">
                <Label>Plan Type</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" aria-label="Plan type info" className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm space-y-3" side="right" align="start">
                    <div>
                      <div className="font-semibold text-primary">Recurring weekly</div>
                      <p className="text-muted-foreground text-xs mt-1">
                        Same fasting + eating window repeats every day (e.g. 16:8, 18:6, OMAD). Client eats daily.
                      </p>
                      <p className="text-xs mt-1"><span className="font-medium">Use when:</span> building a sustainable lifestyle, fat loss, insulin control, everyday keto.</p>
                    </div>
                    <Separator />
                    <div>
                      <div className="font-semibold text-primary">Extended fast</div>
                      <p className="text-muted-foreground text-xs mt-1">
                        One continuous fast of 24h–5+ days with no eating window. Auto-adds a refeed day for fasts ≥ 36h.
                      </p>
                      <p className="text-xs mt-1"><span className="font-medium">Use when:</span> therapeutic goals — autophagy, deep ketosis, breaking a stall, metabolic reset. Not daily.</p>
                    </div>
                    <div className="text-[11px] text-muted-foreground border-t pt-2">
                      Rule of thumb: <span className="font-medium">Recurring = habit.</span> <span className="font-medium">Extended = event.</span>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <Select value={planType} onValueChange={(v) => setPlanType(v as PlanType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recurring">Recurring weekly</SelectItem>
                  <SelectItem value="extended">Extended fast</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {planType === "recurring" ? (
              <>
              <div>
                <Label>Assignment Duration</Label>
                <Select
                  value={String(planLengthDays)}
                  onValueChange={(v) => {
                    const n = parseInt(v, 10);
                    setPlanLengthDays(n);
                    saveDurationMutation.mutate(n);
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days (week)</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  This is the "Day X / N" the client sees on the lion card.
                </p>
              </div>
              <div>
                <Label>Run Mode</Label>
                <Select
                  value={runMode}
                  onValueChange={(v) => setRunMode(v as "one_time" | "recurring")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-time run</SelectItem>
                    <SelectItem value="recurring">Recurring weekly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {runMode === "one_time"
                    ? "Plan runs for the assigned days, then ends. Days outside the window are greyed on the client's calendar."
                    : `First ${planLengthDays} day${planLengthDays > 1 ? "s" : ""} of each week are active. The remaining days each week are greyed as off-days.`}
                </p>
              </div>
              </>
            ) : (
              <>
                <div>
                  <Label>Fast Duration</Label>
                  <Select value={extendedPreset} onValueChange={(v) => setExtendedPreset(v as ExtendedPreset)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="36">36 hours</SelectItem>
                      <SelectItem value="48">48 hours (2 day)</SelectItem>
                      <SelectItem value="72">72 hours (3 day)</SelectItem>
                      <SelectItem value="120">120 hours (5 day)</SelectItem>
                      <SelectItem value="custom">Custom hours…</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {extendedPreset === "custom" && (
                  <div>
                    <Label>Custom hours (12–240)</Label>
                    <Input
                      type="number"
                      min={12}
                      max={240}
                      value={customFastHours}
                      onChange={(e) => setCustomFastHours(parseInt(e.target.value || "0", 10))}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {plan && (
            <>
              <Separator />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Stat label="TDEE" value={`${plan.tdee} kcal`} />
                <Stat label="Daily Target" value={`${plan.target} kcal`} />
                <Stat label="Protein Floor" value={`${plan.proteinFloor} g`} />
                <Stat label="Carb Ceiling" value={`${kt.carb_limit_grams} g`} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {plan && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {plan.extended ? `Extended Fast Plan · ${plan.totalHours}h` : `Plan · ${planLengthDays} day${planLengthDays > 1 ? "s" : ""}`}
            </CardTitle>
            {plan.extended && plan.needsRefeed && (
              <p className="text-xs text-muted-foreground">Includes an auto-generated refeed day for safe re-entry.</p>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="p-3">Day</th>
                    <th className="p-3">Fast</th>
                    <th className="p-3">Eating Window</th>
                    <th className="p-3 text-right">Cal</th>
                    <th className="p-3 text-right">P</th>
                    <th className="p-3 text-right">C</th>
                    <th className="p-3 text-right">F</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.days.map((d, i) => (
                    <tr key={d.day} className={`border-t border-border ${d.isRefeed ? "bg-primary/5" : ""}`}>
                      <td className="p-3 font-medium">
                        {formatPlanDayWithDate(startDate, i, d.day)}
                        {d.isRefeed && <Badge className="ml-2" variant="outline">Refeed</Badge>}
                      </td>
                      <td className="p-3">
                        {d.fastWindow}
                        {d.omad && <Badge className="ml-2" variant="secondary">OMAD</Badge>}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {d.adFast ? (
                          <span className="italic">No eating window</span>
                        ) : d.tight ? (
                          <span>
                            Break fast: <span className="text-foreground font-medium">{d.eatStart}</span>
                            <span className="mx-1">·</span>
                            Last meal by: <span className="text-foreground font-medium">{d.eatEnd}</span>
                          </span>
                        ) : (
                          <>{d.eatStart} – {d.eatEnd}</>
                        )}
                      </td>
                      <td className="p-3 text-right">{d.cal}</td>
                      <td className="p-3 text-right">{d.proteinG}g</td>
                      <td className="p-3 text-right">{d.carbG}g</td>
                      <td className="p-3 text-right">{d.fatG}g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <ProtocolPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        plan={previewPlan}
        title={previewPlan?.extended ? `Extended Fast · ${previewPlan.totalHours}h` : `Weekly Plan · ${planLengthDays} day${planLengthDays > 1 ? "s" : ""}`}
        subtitle={`${kt?.abbreviation ?? ""} · ${previewPlan?.protocolName ?? "No protocol"}`}
        onConfirm={handleSave}
        confirmLabel="Confirm & Assign"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}