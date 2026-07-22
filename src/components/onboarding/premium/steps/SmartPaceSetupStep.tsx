import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Target } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ChevronDown, AlertTriangle, TrendingUp, Bell, ShieldCheck, Sparkles } from "lucide-react";

interface Props {
  clientId: string | null;
  isPreview: boolean;
  /** Body-metrics weight in kg — used to prefill Start weight. */
  currentWeightKg: number;
  /** Body-metrics goal weight in kg (optional) — used to prefill Goal weight. */
  goalWeightKg: number | null;
  onNext: () => void;
}

type Direction = "lose" | "gain" | "maintain";

const kgToLbs = (kg: number) => +(kg * 2.20462).toFixed(1);

export default function SmartPaceSetupStep({
  clientId,
  isPreview,
  currentWeightKg,
  goalWeightKg,
  onNext,
}: Props) {
  const defaultStart = currentWeightKg ? kgToLbs(currentWeightKg) : 0;
  const defaultGoal = goalWeightKg ? kgToLbs(goalWeightKg) : 0;

  const [startWeight, setStartWeight] = useState<number>(defaultStart);
  const [goalWeight, setGoalWeight] = useState<number>(defaultGoal);
  const [direction, setDirection] = useState<Direction>(
    defaultGoal && defaultStart
      ? defaultGoal < defaultStart
        ? "lose"
        : defaultGoal > defaultStart
          ? "gain"
          : "maintain"
      : "lose"
  );
  const startDate = useMemo(() => new Date(), []);
  const [targetDate, setTargetDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 84); // sensible 12-week default
    return d;
  });
  // Once the user picks their own date we stop auto-adjusting it.
  const [dateTouched, setDateTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  // Open by default so users see the explanation before filling in their goal.
  const [howOpen, setHowOpen] = useState(false);

  // Auto-correct direction as weights change
  useEffect(() => {
    if (!startWeight || !goalWeight) return;
    setDirection(
      goalWeight < startWeight ? "lose" : goalWeight > startWeight ? "gain" : "maintain"
    );
  }, [startWeight, goalWeight]);

  // Auto-set target date to the safe/green pace (0.75% BW/week) whenever the
  // user changes weights — until they manually pick their own date.
  useEffect(() => {
    if (dateTouched) return;
    if (!startWeight || !goalWeight) return;
    const delta = Math.abs(startWeight - goalWeight);
    if (delta <= 0) return;
    const safeDaily = (startWeight * 0.0075) / 7; // 0.75% BW/week
    if (safeDaily <= 0) return;
    const days = Math.max(7, Math.ceil(delta / safeDaily));
    const d = new Date();
    d.setDate(d.getDate() + days);
    setTargetDate(d);
  }, [startWeight, goalWeight, dateTouched]);

  const derived = useMemo(() => {
    if (!startWeight || !goalWeight || !targetDate) return null;
    const days = differenceInCalendarDays(targetDate, startDate);
    if (days <= 0) return null;
    const delta = Math.abs(startWeight - goalWeight);
    const pace = delta / days;
    return { days, delta, pace, weekly: pace * 7 };
  }, [startWeight, goalWeight, targetDate, startDate]);

  // Realistic-pace assessment based on % body weight / week.
  // Standard clinical guidance: 0.5–1% BW/week is safe & sustainable.
  const assessment = useMemo(() => {
    if (!derived || !startWeight) return null;
    const weeklyPct = (derived.weekly / startWeight) * 100;
    const safeDaily = (startWeight * 0.0075) / 7; // 0.75% BW/week midpoint
    const safeWeekly = startWeight * 0.0075;
    const maxDaily = (startWeight * 0.01) / 7;    // 1% BW/week ceiling
    const maxWeekly = startWeight * 0.01;
    let zone: "safe" | "aggressive" | "extreme" = "safe";
    if (weeklyPct > 1.5) zone = "extreme";
    else if (weeklyPct > 1) zone = "aggressive";
    return { weeklyPct, safeDaily, safeWeekly, maxDaily, maxWeekly, zone };
  }, [derived, startWeight]);

  // Three pace presets so users can pick their comfort level instead of
  // feeling judged for choosing an ambitious date. Values are anchored to
  // clinical BW-% guidance and translated back into a target date.
  const paceOptions = useMemo(() => {
    if (!startWeight || !goalWeight) return null;
    const delta = Math.abs(startWeight - goalWeight);
    if (delta <= 0) return null;
    const build = (pctPerWeek: number) => {
      const weekly = startWeight * (pctPerWeek / 100);
      const daily = weekly / 7;
      const days = Math.max(7, Math.ceil(delta / daily));
      const date = new Date();
      date.setDate(date.getDate() + days);
      return { pctPerWeek, weekly, daily, days, date };
    };
    return {
      gentle: build(0.5),   // easiest — long game
      balanced: build(0.75),// sweet spot (recommended)
      ambitious: build(1),  // upper safe ceiling
    };
  }, [startWeight, goalWeight]);

  const chosenPreset: "gentle" | "balanced" | "ambitious" | "custom" = useMemo(() => {
    if (!derived || !paceOptions) return "custom";
    const near = (a: number, b: number) => Math.abs(a - b) / Math.max(a, b) < 0.05;
    if (near(derived.pace, paceOptions.gentle.daily)) return "gentle";
    if (near(derived.pace, paceOptions.balanced.daily)) return "balanced";
    if (near(derived.pace, paceOptions.ambitious.daily)) return "ambitious";
    return "custom";
  }, [derived, paceOptions]);

  const applyPreset = (key: "gentle" | "balanced" | "ambitious") => {
    if (!paceOptions) return;
    setTargetDate(paceOptions[key].date);
    setDateTouched(true);
  };

  const zoneStyles = {
    safe: {
      chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      text: "text-emerald-300",
      label: "Safe pace",
    },
    aggressive: {
      chip: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      text: "text-amber-300",
      label: "Aggressive",
    },
    extreme: {
      chip: "bg-destructive/15 text-destructive border-destructive/30",
      text: "text-destructive",
      label: "Too aggressive",
    },
  } as const;

  const valid = !!(startWeight && goalWeight && targetDate && derived && derived.pace > 0);

  const handleContinue = async () => {
    if (!valid) return;
    // Preview mode: don't write anything, just move on.
    if (isPreview || !clientId) {
      onNext();
      return;
    }
    setSaving(true);
    try {
      // Need a trainer_id to satisfy FK — pull from client_feature_settings.
      const { data: cfs } = await supabase
        .from("client_feature_settings")
        .select("trainer_id")
        .eq("client_id", clientId)
        .maybeSingle();

      const trainerId = (cfs as any)?.trainer_id;
      if (!trainerId) throw new Error("Trainer link missing — contact support");

      const startStr = format(startDate, "yyyy-MM-dd");
      const targetStr = format(targetDate!, "yyyy-MM-dd");

      // Deactivate any existing active goal so we don't collide.
      await supabase
        .from("smart_pace_goals")
        .update({ status: "archived", ended_at: new Date().toISOString(), ended_reason: "onboarding_reset" })
        .eq("client_id", clientId)
        .eq("status", "active");

      const { error: insErr } = await supabase.from("smart_pace_goals").insert({
        client_id: clientId,
        trainer_id: trainerId,
        start_weight: startWeight,
        goal_weight: goalWeight,
        daily_pace_lbs: derived!.pace,
        goal_direction: direction,
        start_date: startStr,
        target_date: targetStr,
        last_weigh_in_value: startWeight,
        last_weigh_in_date: startStr,
      });
      if (insErr) throw insErr;

      // Enable the tracker so it appears on the dashboard immediately.
      await supabase
        .from("client_feature_settings")
        .update({ smart_pace_enabled: true })
        .eq("client_id", clientId);

      onNext();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save your pace goal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary/80">
          <Target className="h-3.5 w-3.5" /> Smart Weight Tracker
        </div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Set your pace</h2>
        <p className="mt-1 text-sm text-white/60">
          We'll calculate a realistic daily target and track it with debt/credit — no crash diets, no guesswork.
        </p>
      </div>

      <HowItWorks
        open={howOpen}
        onToggle={() => setHowOpen((v) => !v)}
        base={derived?.pace ?? 0}
        startWeight={startWeight}
        goalWeight={goalWeight}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-white/60">Start weight (lb)</Label>
          <Input
            type="number"
            step="0.1"
            value={startWeight || ""}
            onChange={(e) => setStartWeight(parseFloat(e.target.value) || 0)}
            className="mt-1 border-white/10 bg-white/[0.03]"
            placeholder="180"
          />
        </div>
        <div>
          <Label className="text-white/60">Goal weight (lb)</Label>
          <Input
            type="number"
            step="0.1"
            value={goalWeight || ""}
            onChange={(e) => setGoalWeight(parseFloat(e.target.value) || 0)}
            className="mt-1 border-white/10 bg-white/[0.03]"
            placeholder="165"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-white/60">Target date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "mt-1 w-full h-11 justify-start text-left font-normal border-white/10 bg-white/[0.03]",
                  !targetDate && "text-white/40"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {targetDate ? format(targetDate, "PP") : "Pick target date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={targetDate}
                onSelect={(d) => {
                  setTargetDate(d);
                  setDateTouched(true);
                }}
                disabled={(d) => d <= startDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
        <div className="grid grid-cols-4 grid-rows-2 gap-x-2 gap-y-1 text-center">
          <div className="self-end text-[10px] uppercase tracking-[0.15em] text-white/50">Total days</div>
          <div className="self-end text-[10px] uppercase tracking-[0.15em] text-white/50">Total</div>
          <div className="self-end text-[10px] uppercase tracking-[0.15em] text-white/50">Avg / day</div>
          <div className="self-end text-[10px] uppercase tracking-[0.15em] text-white/50">Avg / week</div>

          <div className="text-lg font-semibold">{derived?.days ?? "—"}</div>
          <div className="text-lg font-semibold">{derived ? `${derived.delta.toFixed(1)} lb` : "—"}</div>
          <div
            className={cn(
              "text-lg font-semibold",
              assessment ? zoneStyles[assessment.zone].text : "text-primary"
            )}
          >
            {derived ? `${derived.pace.toFixed(2)} lb` : "—"}
          </div>
          <div
            className={cn(
              "text-lg font-semibold",
              assessment ? zoneStyles[assessment.zone].text : "text-primary"
            )}
          >
            {derived ? `${derived.weekly.toFixed(1)} lb` : "—"}
          </div>
        </div>
        <p className="mt-3 text-[11px] text-white/50">
          Direction: <span className="text-white/80 capitalize">{direction}</span> — this feeds the same
          calculator your coach sees. You can update it anytime on your dashboard.
        </p>
      </div>

      {/* Pick-your-pace: 3 supportive options */}
      {paceOptions && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/80">
              Pick a pace that fits your life
            </span>
          </div>
          <p className="text-[12px] text-white/60">
            All three are healthy — pick what feels right. You can always adjust it later.
          </p>
          <div className="grid gap-2">
            <PaceOptionCard
              label="Gentle"
              subtitle="Easiest to sustain"
              option={paceOptions.gentle}
              selected={chosenPreset === "gentle"}
              tone="emerald"
              onSelect={() => applyPreset("gentle")}
            />
            <PaceOptionCard
              label="Balanced"
              subtitle="Recommended sweet spot"
              option={paceOptions.balanced}
              selected={chosenPreset === "balanced"}
              tone="primary"
              badge="Recommended"
              onSelect={() => applyPreset("balanced")}
            />
            <PaceOptionCard
              label="Ambitious"
              subtitle="Faster — still inside the safe ceiling"
              option={paceOptions.ambitious}
              selected={chosenPreset === "ambitious"}
              tone="amber"
              onSelect={() => applyPreset("ambitious")}
            />
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border p-3 text-left transition",
                    chosenPreset === "custom"
                      ? "border-primary/50 bg-primary/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">Choose your own date</span>
                      {chosenPreset === "custom" && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/60">
                      {chosenPreset === "custom" && targetDate
                        ? `Target: ${format(targetDate, "MMM d, yyyy")}`
                        : "Pick any target date — we'll coach the rest"}
                    </div>
                  </div>
                  <CalendarIcon className="h-4 w-4 text-white/60" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={targetDate}
                  onSelect={(d) => {
                    setTargetDate(d);
                    setDateTouched(true);
                  }}
                  disabled={(d) => d <= startDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {chosenPreset === "custom" && assessment && (
            <div
              className={cn(
                "rounded-xl border p-3 text-[12px] text-white/85 space-y-2",
                assessment.zone === "extreme"
                  ? "border-destructive/40 bg-destructive/10"
                  : assessment.zone === "aggressive"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-emerald-500/30 bg-emerald-500/5"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide",
                  assessment.zone === "extreme"
                    ? "text-destructive"
                    : assessment.zone === "aggressive"
                      ? "text-amber-300"
                      : "text-emerald-300"
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {assessment.zone === "extreme"
                  ? `Very aggressive · ${assessment.weeklyPct.toFixed(1)}% body weight / week`
                  : assessment.zone === "aggressive"
                    ? `Aggressive · ${assessment.weeklyPct.toFixed(1)}% body weight / week`
                    : `You're in the safe zone · ${assessment.weeklyPct.toFixed(1)}% body weight / week`}
              </div>
              {assessment.zone === "extreme" ? (
                <>
                  <p>
                    Heads up — this pace is above the 1.5% / week safety ceiling. That can bring on fatigue,
                    muscle loss, and a rebound if we push too long.
                  </p>
                  <p className="text-white/75">
                    <span className="font-semibold text-white">We've still got you.</span> If you want to
                    stick with this date, APEX360 AI will coach you day-by-day, protect your protein, and
                    tap the brakes the moment your body signals it's time. You can switch to
                    <span className="font-semibold text-white"> Balanced</span> anytime.
                  </p>
                </>
              ) : assessment.zone === "aggressive" ? (
                <p>
                  A bit faster than the sweet spot, but still doable. We'll keep a close eye on your energy
                  and adjust the plan if you need a break — <span className="font-semibold text-white">you got this.</span>
                </p>
              ) : (
                <p>
                  Nice — this pace lines up with what your body can handle sustainably. Stay consistent and
                  we'll do the heavy lifting on the math.
                </p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 space-y-1.5 text-[12px] text-white/75">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> How we've got your back
            </div>
            <p>• <span className="text-white">Every day</span> we'll show exactly what it takes to stay on pace.</p>
            <p>• <span className="text-white">If you slip</span>, we'll show a small daily catch-up — never a crash.</p>
            <p>• <span className="text-white">2 days off track?</span> We'll offer to adjust your target date so it stays realistic.</p>
          </div>
        </div>
      )}

      <div className="mt-auto pb-2">
        <Button
          disabled={!valid || saving}
          onClick={handleContinue}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continue
        </Button>
      </div>
    </div>
  );
}

function HowItWorks({
  open,
  onToggle,
  base,
  startWeight,
  goalWeight,
}: {
  open: boolean;
  onToggle: () => void;
  base: number;
  startWeight: number;
  goalWeight: number;
}) {
  const b = base > 0 ? base : 0.6;
  const fmt = (n: number) => n.toFixed(1);

  const days = [
    { day: "Mon", actual: b, target: b, debt: 0, credit: 0, note: "Start — on pace" },
    { day: "Tue", actual: b * 0.5, target: b, debt: b * 0.5, credit: 0, note: `Small miss → +${fmt(b * 0.5)} lb Debt` },
    { day: "Wed", actual: 0, target: b * 1.5, debt: b * 2.5, credit: 0, note: "Missed weigh-in → full pace charged" },
    { day: "Thu", actual: b * 3, target: b * 3, debt: 0, credit: 0, note: "Big weigh-in wipes Debt" },
    { day: "Fri", actual: b * 1.7, target: b, debt: 0, credit: b * 0.7, note: `Over-performed → +${fmt(b * 0.7)} lb Credit` },
    { day: "Sat", actual: b * 0.3, target: b * 0.3, debt: 0, credit: b * 0.7, note: "Easy day (Credit lowered target)" },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-primary/80">How Smart Pace works</div>
          <div className="text-xs text-white/60">Tap for the debt/credit example</div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-white/60 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/10 px-4 py-4 text-sm">
          {/* Math */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">The core math</div>
            <div className="mt-2 rounded-lg bg-white/[0.04] px-3 py-2 font-mono text-[11px] text-white/90">
              Daily Pace = (Start − Goal) ÷ Days
            </div>
            {startWeight && goalWeight && base > 0 ? (
              <p className="mt-2 text-[11px] text-white/60">
                Yours: <span className="font-semibold text-white">{fmt(startWeight)} → {fmt(goalWeight)} lb</span> at{" "}
                <span className="font-semibold text-primary">{fmt(b)} lb/day</span>.
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-white/60">Fill in the fields above to see your pace.</p>
            )}
          </div>

          {/* Rules */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Debt vs. Credit</div>
            <Rule
              icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
              title="Under target → Debt"
              body="Shortfall adds to Debt. Tomorrow's target goes up."
            />
            <Rule
              icon={<TrendingUp className="h-3.5 w-3.5 text-sky-400" />}
              title="Over target → Credit"
              body="Surplus banks as Credit. Pays down Debt first, then lowers tomorrow's target."
            />
            <Rule
              icon={<Target className="h-3.5 w-3.5 text-emerald-400" />}
              title="No weigh-in"
              body={`We charge the full ${fmt(b)} lb to Debt overnight.`}
            />
            <div className="rounded-lg bg-white/[0.04] px-3 py-2 font-mono text-[11px] text-white/90">
              Tomorrow = {fmt(b)} + Debt − Credit
            </div>
            <p className="text-[10px] text-white/50">
              Capped at 3× base ({fmt(b * 3)} lb/day) — never unsafe.
            </p>
          </div>

          {/* Worked example */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">
              6-day example at your pace
            </div>
            <div className="mt-2 overflow-hidden rounded-lg border border-white/10">
              <table className="w-full text-[11px]">
                <thead className="bg-white/[0.04] text-white/50">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold">Day</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Lost</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Target</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Debt</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {days.map((d) => (
                    <tr key={d.day}>
                      <td className="px-2 py-1.5 font-semibold text-white">{d.day}</td>
                      <td className="px-2 py-1.5 text-right text-white/80">{fmt(d.actual)}</td>
                      <td className="px-2 py-1.5 text-right text-white/80">{fmt(d.target)}</td>
                      <td className={cn("px-2 py-1.5 text-right", d.debt > 0 ? "font-semibold text-destructive" : "text-white/40")}>
                        {fmt(d.debt)}
                      </td>
                      <td className={cn("px-2 py-1.5 text-right", d.credit > 0 ? "font-semibold text-sky-400" : "text-white/40")}>
                        {fmt(d.credit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-white/60">
              {days.map((d) => (
                <li key={d.day}>
                  <span className="text-white/80">{d.day}:</span> {d.note}
                </li>
              ))}
            </ul>
          </div>

          {/* Alerts */}
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
              <Bell className="h-3 w-3" /> When we alert you
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-white/70">
              <li>• <span className="text-white">2 behind days in a row</span> → catch-up plan + push.</li>
              <li>• <span className="text-white">Debt ≥ {fmt(b * 2)} lb</span> → your coach is notified.</li>
              <li>• <span className="text-white">Debt ≥ {fmt(b * 3)} lb</span> → red flag on coach's dashboard.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Rule({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-white">{title}</p>
        <p className="text-[11px] text-white/60">{body}</p>
      </div>
    </div>
  );
}

type PaceOption = { pctPerWeek: number; weekly: number; daily: number; days: number; date: Date };

function PaceOptionCard({
  label,
  subtitle,
  option,
  selected,
  tone,
  badge,
  onSelect,
}: {
  label: string;
  subtitle: string;
  option: PaceOption;
  selected: boolean;
  tone: "emerald" | "primary" | "amber";
  badge?: string;
  onSelect: () => void;
}) {
  const toneRing = {
    emerald: "ring-emerald-500/60 bg-emerald-500/10",
    primary: "ring-primary/70 bg-primary/10",
    amber: "ring-amber-500/60 bg-amber-500/10",
  }[tone];
  const toneText = {
    emerald: "text-emerald-300",
    primary: "text-primary",
    amber: "text-amber-300",
  }[tone];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left transition",
        selected && `ring-2 ${toneRing} border-transparent`
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-[13px] font-semibold text-white")}>{label}</span>
          {badge && (
            <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
              {badge}
            </span>
          )}
        </div>
        <div className="text-[11px] text-white/55">{subtitle}</div>
      </div>
      <div className="text-right">
        <div className={cn("text-[13px] font-semibold", toneText)}>
          {option.weekly.toFixed(1)} lb/wk
        </div>
        <div className="text-[10px] text-white/50">
          by {format(option.date, "MMM d, yyyy")}
        </div>
      </div>
    </button>
  );
}