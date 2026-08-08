import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useClientWeeklySchedule } from "@/hooks/useClientWeeklySchedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { ProtocolPreviewDialog } from "@/components/protocol/ProtocolPreviewDialog";
import { computePlan } from "@/lib/protocolPlan";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, RotateCcw, Save, CalendarDays } from "lucide-react";
import {
  ACTIVITY_LABEL,
  ACTIVITY_MULT,
  DURATION_OPTIONS,
  EXTENDED_PRESETS,
  GOAL_LABEL,
  assignmentDurationDays,
  computeMacroSummary,
  goalAdjustFor,
  todayDateKey,
  type CalcActivity,
  type CalcExtendedPreset,
  type CalcGoal,
  type CalcPlanType,
} from "@/lib/protocolCalcShared";
import {
  RATIO_LABEL,
  breakFastHourFor,
  formatHour,
  timeToHour,
  type FastRatio,
  type WeeklyScheduleDay,
} from "@/lib/resolveFastingWindow";
import { computeEnd, defaultWeek } from "@/components/client/calendar/calendarUtils";

const RATIOS: FastRatio[] = ["16:8", "18:6", "20:4", "omad", "eat_all_day"];
const RENDER_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DOW_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-base font-bold">{value}</div>
    </div>
  );
}

export default function ClientPlanBuilder() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const { weekly, saveWeekly } = useClientWeeklySchedule(clientId);

  const [ketoId, setKetoId] = useState<string | null>(null);
  const [protocolId, setProtocolId] = useState<string | null>(null);
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState<CalcGoal>("maintain");
  const [activity, setActivity] = useState<CalcActivity>("moderate");
  const [startDate, setStartDate] = useState("");
  const [customDeficit, setCustomDeficit] = useState(20);
  const [planType, setPlanType] = useState<CalcPlanType>("recurring");
  const [planLengthDays, setPlanLengthDays] = useState(7);
  const [runMode, setRunMode] = useState<"one_time" | "recurring">("one_time");
  const [extendedPreset, setExtendedPreset] = useState<CalcExtendedPreset>("48");
  const [customFastHours, setCustomFastHours] = useState(48);
  const [week, setWeek] = useState<WeeklyScheduleDay[]>(defaultWeek());
  const [weekTouched, setWeekTouched] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: ketoTypes } = useQuery({
    queryKey: ["cpb-keto-types"],
    queryFn: async () => {
      const { data } = await supabase
        .from("keto_types")
        .select("id, abbreviation, name, subtitle, protein_pct, carbs_pct, fat_pct, color, carb_limit_grams")
        .eq("is_active", true)
        .order("order_index");
      return data || [];
    },
  });

  const { data: protocols } = useQuery({
    queryKey: ["cpb-protocols"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fasting_protocols")
        .select("id, name, fast_target_hours")
        .order("name");
      return data || [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["cpb-settings", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, assigned_protocol_duration_days, protocol_start_date, protocol_calc_inputs, day_start_hour, protocol_run_mode")
        .eq("client_id", clientId)
        .maybeSingle();
      return data as any;
    },
    enabled: !!clientId,
  });

  const { data: assignment } = useQuery({
    queryKey: ["cpb-keto-assignment", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_keto_assignments")
        .select("id, keto_type_id")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
    enabled: !!clientId,
  });

  // Seed from what's already saved.
  useEffect(() => {
    if (assignment?.keto_type_id) setKetoId(assignment.keto_type_id);
  }, [assignment?.keto_type_id]);

  useEffect(() => {
    if (!settings) return;
    if (settings.selected_protocol_id) setProtocolId(settings.selected_protocol_id);
    const inputs = (settings.protocol_calc_inputs || {}) as any;
    if (inputs.weight != null) setWeight(String(inputs.weight));
    if (inputs.goal) setGoal(inputs.goal);
    if (inputs.activity) setActivity(inputs.activity);
    if (typeof inputs.customDeficit === "number") setCustomDeficit(inputs.customDeficit);
    if (inputs.planType) setPlanType(inputs.planType);
    if (typeof inputs.extendedPreset === "string") setExtendedPreset(inputs.extendedPreset);
    if (typeof inputs.customFastHours === "number") setCustomFastHours(inputs.customFastHours);
    if (settings.protocol_start_date) setStartDate(String(settings.protocol_start_date).slice(0, 10));
    if (settings.assigned_protocol_duration_days) setPlanLengthDays(settings.assigned_protocol_duration_days);
    if (settings.protocol_run_mode === "recurring" || settings.protocol_run_mode === "one_time") {
      setRunMode(settings.protocol_run_mode);
    }
  }, [settings]);

  useEffect(() => {
    if (weekTouched) return;
    const saved = weekly ?? [];
    if (!saved.length) return;
    setWeek(defaultWeek().map((d) => saved.find((s) => s.day_of_week === d.day_of_week) ?? d));
  }, [weekly, weekTouched]);

  const kt = useMemo(
    () => (ketoTypes || []).find((k: any) => k.id === ketoId) ?? null,
    [ketoTypes, ketoId],
  );
  const protocol = useMemo(
    () => (protocols || []).find((p: any) => p.id === protocolId) ?? null,
    [protocols, protocolId],
  );

  const summary = useMemo(() => {
    const w = parseFloat(weight);
    if (!w || !kt) return null;
    return computeMacroSummary({
      weightLbs: w,
      activity,
      goal,
      customDeficitPct: customDeficit,
      proteinPct: (kt as any).protein_pct,
      carbsPct: (kt as any).carbs_pct,
    });
  }, [weight, kt, activity, goal, customDeficit]);

  const previewPlan = useMemo(() => {
    const w = parseFloat(weight);
    if (!w || !kt) return null;
    return computePlan({
      weightLbs: w,
      ketoType: kt as any,
      protocol: protocol ? { name: (protocol as any).name, fast_target_hours: (protocol as any).fast_target_hours } : null,
      activityMult: ACTIVITY_MULT[activity],
      goalAdjust: goalAdjustFor(goal, customDeficit),
      planType,
      planLengthDays,
      extendedTotalHours: extendedPreset === "custom" ? customFastHours : parseInt(extendedPreset, 10),
      eatStartHour: Number(settings?.day_start_hour ?? NaN),
    });
  }, [weight, kt, protocol, activity, goal, customDeficit, planType, planLengthDays, extendedPreset, customFastHours, settings?.day_start_hour]);

  const updateDay = (dow: number, patch: Partial<WeeklyScheduleDay>) => {
    setWeekTouched(true);
    setWeek((prev) =>
      prev.map((d) => {
        if (d.day_of_week !== dow) return d;
        const next = { ...d, ...patch };
        next.window_end_time = computeEnd(next.ratio, next.window_start_time);
        return next;
      }),
    );
  };

  const handleSave = async () => {
    if (!clientId) return;
    if (!ketoId) {
      toast({ title: "Pick a Fuel Style first", variant: "destructive" });
      return;
    }
    setSaving(true);
    const effectiveStartDate = startDate || todayDateKey();
    const duration = assignmentDurationDays({ planType, planLengthDays, extendedPreset, customFastHours });
    const effectiveRunMode = planType === "extended" ? "one_time" : runMode;
    const inputs = {
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
      builtBy: "client",
    };
    try {
      if (ketoId !== (assignment?.keto_type_id ?? null)) {
        if (assignment?.id) {
          await supabase.from("client_keto_assignments").update({ is_active: false }).eq("id", assignment.id);
        }
        const { error } = await supabase.from("client_keto_assignments").insert({
          client_id: clientId,
          keto_type_id: ketoId,
          assigned_by: clientId,
          is_active: true,
        });
        if (error) throw error;
      }

      const patch: any = {
        protocol_calc_inputs: inputs,
        protocol_start_date: effectiveStartDate,
        protocol_run_mode: effectiveRunMode,
        assigned_protocol_duration_days: duration,
        selected_protocol_id: protocolId,
        selected_quick_plan_id: null,
        quick_plan_duration_days: null,
      };
      const { data: existing } = await supabase
        .from("client_feature_settings")
        .select("client_id")
        .eq("client_id", clientId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase.from("client_feature_settings").update(patch).eq("client_id", clientId);
        if (error) throw error;
      } else {
        // `trainer_id` is NOT NULL. Self-built plans belong to the client's
        // coach when there is one, otherwise the client owns their own row.
        const { data: link } = await supabase
          .from("trainer_clients")
          .select("trainer_id")
          .eq("client_id", clientId)
          .limit(1)
          .maybeSingle();
        const { error } = await supabase
          .from("client_feature_settings")
          .insert([{ client_id: clientId, trainer_id: (link as any)?.trainer_id ?? clientId, ...patch }] as any);
        if (error) throw error;
      }

      await saveWeekly.mutateAsync(week);

      [
        ["cpb-settings", clientId],
        ["cpb-keto-assignment", clientId],
        ["client-plan-window", clientId],
        ["client-weekly-schedule", clientId],
        ["ccp-settings", clientId],
        ["keto-assignment", clientId],
        ["active-protocol-summary", clientId],
      ].forEach((key) => queryClient.invalidateQueries({ queryKey: key as any }));
      ["my-feature-settings", "my-feature-settings-fasting", "tw-settings", "ccp-protocol", "client-keto-assignment"].forEach(
        (k) => queryClient.invalidateQueries({ queryKey: [k] }),
      );

      toast({ title: "Your plan is live", description: "Your timer will follow this schedule." });
      navigate("/client/dashboard");
    } catch (e: any) {
      toast({ title: "Couldn't save your plan", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!clientId) return;
    setSaving(true);
    try {
      await supabase.from("client_keto_assignments").update({ is_active: false }).eq("client_id", clientId);
      await supabase
        .from("client_feature_settings")
        .update({
          selected_protocol_id: null,
          protocol_start_date: null,
          protocol_calc_inputs: null,
          assigned_protocol_duration_days: null,
          selected_quick_plan_id: null,
          quick_plan_duration_days: null,
          protocol_run_mode: "one_time",
        } as any)
        .eq("client_id", clientId);
      await (supabase.from("client_weekly_schedule" as any) as any).delete().eq("client_id", clientId);
      await (supabase.from("client_schedule_overrides" as any) as any).delete().eq("client_id", clientId);

      setKetoId(null);
      setProtocolId(null);
      setWeight("");
      setGoal("maintain");
      setActivity("moderate");
      setStartDate("");
      setCustomDeficit(20);
      setPlanType("recurring");
      setPlanLengthDays(7);
      setRunMode("one_time");
      setWeek(defaultWeek());
      setWeekTouched(false);

      queryClient.invalidateQueries();
      toast({ title: "Program cleared" });
    } catch (e: any) {
      toast({ title: "Couldn't clear", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-[calc(env(safe-area-inset-bottom)+7rem)]">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold">Build My Plan</h1>
            <p className="truncate text-[11px] text-muted-foreground">
              Full program: fuel style, calories, macros, and weekly schedule.
            </p>
          </div>
          <button
            onClick={() => navigate("/client/calendar")}
            aria-label="Calendar"
            className="text-primary"
          >
            <CalendarDays className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="px-4 pt-4">
        <Accordion type="multiple" defaultValue={["fuel", "numbers", "window", "schedule"]} className="space-y-3">
          <AccordionItem value="fuel" className="rounded-2xl border border-border/60 bg-muted/10 px-4">
            <AccordionTrigger className="text-sm font-bold">1 · Fuel Style & Protocol</AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fuel Style</Label>
                <Select value={ketoId ?? undefined} onValueChange={setKetoId}>
                  <SelectTrigger className="mt-1 h-12 text-base">
                    <SelectValue placeholder="Choose Fuel Style…">
                      {kt ? (
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: (kt as any).color }} />
                          <span>{(kt as any).abbreviation} · {(kt as any).name}</span>
                        </span>
                      ) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(ketoTypes || []).map((k: any) => (
                      <SelectItem key={k.id} value={k.id} className="py-3">
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: k.color }} />
                          <div className="flex flex-col">
                            <span className="font-semibold" style={{ color: k.color }}>
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
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fasting Protocol</Label>
                <Select value={protocolId ?? undefined} onValueChange={setProtocolId}>
                  <SelectTrigger className="mt-1 h-12 text-base">
                    <SelectValue placeholder="Choose protocol…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(protocols || []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id} className="py-3">
                        {p.name} ({p.fast_target_hours}h)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="numbers" className="rounded-2xl border border-border/60 bg-muted/10 px-4">
            <AccordionTrigger className="text-sm font-bold">2 · Your Numbers</AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Weight (lbs)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="180"
                  className="mt-1 h-12 text-base"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Goal</Label>
                <Select value={goal} onValueChange={(v) => setGoal(v as CalcGoal)}>
                  <SelectTrigger className="mt-1 h-12 text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(GOAL_LABEL) as CalcGoal[]).map((g) => (
                      <SelectItem key={g} value={g} className="py-3">{GOAL_LABEL[g]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {goal === "custom" && (
                <div className="space-y-2 rounded-2xl border border-border/60 p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Custom deficit</Label>
                    <span className="text-sm font-bold text-primary">-{customDeficit}%</span>
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

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Activity</Label>
                <Select value={activity} onValueChange={(v) => setActivity(v as CalcActivity)}>
                  <SelectTrigger className="mt-1 h-12 text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ACTIVITY_LABEL) as CalcActivity[]).map((a) => (
                      <SelectItem key={a} value={a} className="py-3">{ACTIVITY_LABEL[a]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 h-12 text-base"
                />
              </div>

              {summary && (
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="TDEE" value={`${summary.tdee} kcal`} />
                  <Stat label="Daily Target" value={`${summary.target} kcal`} />
                  <Stat label="Protein" value={`${summary.proteinG} g`} />
                  <Stat label="Carbs" value={`${summary.carbG} g`} />
                  <Stat label="Fat" value={`${summary.fatG} g`} />
                  <Stat label="Protein Floor" value={`${summary.proteinFloor} g`} />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="window" className="rounded-2xl border border-border/60 bg-muted/10 px-4">
            <AccordionTrigger className="text-sm font-bold">3 · How Long It Runs</AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Plan Type</Label>
                <Select value={planType} onValueChange={(v) => setPlanType(v as CalcPlanType)}>
                  <SelectTrigger className="mt-1 h-12 text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurring" className="py-3">Recurring weekly</SelectItem>
                    <SelectItem value="extended" className="py-3">Extended fast</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Recurring = habit. Extended = event.
                </p>
              </div>

              {planType === "recurring" ? (
                <>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Plan Length</Label>
                    <Select value={String(planLengthDays)} onValueChange={(v) => setPlanLengthDays(parseInt(v, 10))}>
                      <SelectTrigger className="mt-1 h-12 text-base"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={String(o.value)} className="py-3">{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      This is the "Day X / N" you see on your lion card.
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Run Mode</Label>
                    <Select value={runMode} onValueChange={(v) => setRunMode(v as "one_time" | "recurring")}>
                      <SelectTrigger className="mt-1 h-12 text-base"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one_time" className="py-3">One-time run</SelectItem>
                        <SelectItem value="recurring" className="py-3">Recurring weekly</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {runMode === "one_time"
                        ? "Runs for the days you picked, then ends. Days outside the window show a dash on your calendar."
                        : `First ${planLengthDays} day${planLengthDays > 1 ? "s" : ""} of each week are active. The rest are off-days.`}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fast Duration</Label>
                    <Select value={extendedPreset} onValueChange={(v) => setExtendedPreset(v as CalcExtendedPreset)}>
                      <SelectTrigger className="mt-1 h-12 text-base"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EXTENDED_PRESETS.map((p) => (
                          <SelectItem key={p.value} value={p.value} className="py-3">{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {extendedPreset === "custom" && (
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Custom hours (12–240)</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={12}
                        max={240}
                        value={customFastHours}
                        onChange={(e) => setCustomFastHours(parseInt(e.target.value || "0", 10))}
                        className="mt-1 h-12 text-base"
                      />
                    </div>
                  )}
                </>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="schedule" className="rounded-2xl border border-border/60 bg-muted/10 px-4">
            <AccordionTrigger className="text-sm font-bold">4 · Weekly Fasting Schedule</AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <p className="text-[11px] text-muted-foreground">
                Set the ratio and exact fast start for each day. Break-fast time calculates itself.
              </p>
              {RENDER_ORDER.map((dow) => {
                const d = week.find((x) => x.day_of_week === dow)!;
                const isEatAll = d.ratio === "eat_all_day";
                const breaks = breakFastHourFor(d.ratio, timeToHour(d.window_start_time));
                return (
                  <div key={dow} className="rounded-2xl border border-border/50 bg-background/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {DOW_LABEL[dow]}
                      </span>
                      <button
                        onClick={() => updateDay(dow, { enabled: !(d.enabled !== false) })}
                        className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          d.enabled === false
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {d.enabled === false ? "Rest day" : "Active"}
                      </button>
                    </div>
                    {d.enabled !== false && (
                      <div className="mt-2 space-y-2">
                        <Select value={d.ratio} onValueChange={(v) => updateDay(dow, { ratio: v as FastRatio })}>
                          <SelectTrigger className="h-11 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RATIOS.map((r) => (
                              <SelectItem key={r} value={r} className="py-3">{RATIO_LABEL[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!isEatAll && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              step={60}
                              value={d.window_start_time.slice(0, 5)}
                              onChange={(e) => updateDay(dow, { window_start_time: `${e.target.value}:00` })}
                              className="h-11 flex-1 text-sm font-semibold"
                            />
                            <span className="whitespace-nowrap text-xs text-muted-foreground">
                              → Breaks {formatHour(breaks)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-12 rounded-2xl text-sm font-semibold"
            disabled={!previewPlan}
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="h-12 rounded-2xl text-sm font-semibold" disabled={saving}>
                <RotateCcw className="mr-2 h-4 w-4" /> Clear
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear your program?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes your fuel style, protocol and weekly schedule. Your weigh-ins,
                  fasting history and badges are kept.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear}>Yes, clear it</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <Button
          className="mt-2 h-14 w-full rounded-2xl text-base font-bold"
          disabled={saving || !ketoId}
          onClick={handleSave}
        >
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save My Plan"}
        </Button>
      </div>

      <ProtocolPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        plan={previewPlan}
        title="Your plan preview"
        onConfirm={handleSave}
        confirmLabel="Save My Plan"
      />
    </div>
  );
}
