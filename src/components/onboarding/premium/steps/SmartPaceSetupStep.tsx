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