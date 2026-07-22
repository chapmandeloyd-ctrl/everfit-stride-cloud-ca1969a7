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
import { ChevronDown, AlertTriangle, TrendingUp, Bell } from "lucide-react";

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
  const [saving, setSaving] = useState(false);
  const [howOpen, setHowOpen] = useState(false);

  // Auto-correct direction as weights change
  useEffect(() => {
    if (!startWeight || !goalWeight) return;
    setDirection(
      goalWeight < startWeight ? "lose" : goalWeight > startWeight ? "gain" : "maintain"
    );
  }, [startWeight, goalWeight]);

  const derived = useMemo(() => {
    if (!startWeight || !goalWeight || !targetDate) return null;
    const days = differenceInCalendarDays(targetDate, startDate);
    if (days <= 0) return null;
    const delta = Math.abs(startWeight - goalWeight);
    return { days, delta, pace: delta / days };
  }, [startWeight, goalWeight, targetDate, startDate]);

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
                onSelect={setTargetDate}
                disabled={(d) => d <= startDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-white/50">Total days</div>
            <div className="mt-1 text-lg font-semibold">{derived?.days ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-white/50">Total change</div>
            <div className="mt-1 text-lg font-semibold">
              {derived ? `${derived.delta.toFixed(1)} lb` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-white/50">Avg / day</div>
            <div className="mt-1 text-lg font-semibold text-primary">
              {derived ? `${derived.pace.toFixed(2)} lb` : "—"}
            </div>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-white/50">
          Direction: <span className="text-white/80 capitalize">{direction}</span> — this feeds the same
          calculator your coach sees. You can update it anytime on your dashboard.
        </p>
      </div>

      <HowItWorks
        open={howOpen}
        onToggle={() => setHowOpen((v) => !v)}
        base={derived?.pace ?? 0}
        startWeight={startWeight}
        goalWeight={goalWeight}
      />

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