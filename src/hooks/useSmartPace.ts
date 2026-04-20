import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "./useEffectiveClientId";
import {
  calculateDailyTarget,
  paceProgressPct,
  projectCompletionDate,
  type SmartPaceGoal,
} from "@/lib/smartPaceEngine";

export interface SmartPaceSnapshot {
  goal: SmartPaceGoal | null;
  enabled: boolean;
  todayTargetLbs: number;
  baseLbs: number;
  debtLbs: number;
  creditLbs: number;
  progressPct: number;
  reason: string;
  projectedDate: Date | null;
  status: "on_pace" | "ahead" | "behind" | "missed" | "no_goal";
  cappedAt: number | null;
}

/**
 * Single source of truth for the Smart Pace Tracker.
 * Returns null-ish snapshot when feature disabled or no active goal.
 */
export function useSmartPace() {
  const clientId = useEffectiveClientId();

  return useQuery({
    queryKey: ["smart-pace", clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<SmartPaceSnapshot> => {
      if (!clientId) {
        return emptySnapshot(false);
      }

      const [{ data: settings }, { data: goal }] = await Promise.all([
        supabase
          .from("client_feature_settings")
          .select("smart_pace_enabled")
          .eq("client_id", clientId)
          .maybeSingle(),
        supabase
          .from("smart_pace_goals")
          .select("*")
          .eq("client_id", clientId)
          .eq("status", "active")
          .maybeSingle(),
      ]);

      const enabled = !!settings?.smart_pace_enabled;
      if (!enabled || !goal) return emptySnapshot(enabled);

      const rawGoal = goal as unknown as SmartPaceGoal;
      const { data: latestActivity } = await supabase
        .from("smart_pace_daily_log")
        .select("log_date")
        .eq("goal_id", rawGoal.id)
        .or("weight_recorded.not.is.null,status.eq.forgiven")
        .order("log_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      // ----- Live recalc (idempotent w/ nightly rollup) -----
      // Use the latest real weigh-in OR an admin-forgiven baseline day so a
      // reset/forgive action becomes the new starting point for missed-day debt.
      const today = new Date().toISOString().slice(0, 10);
      const lastActivityDate = [
        rawGoal.start_date,
        rawGoal.last_weigh_in_date,
        latestActivity?.log_date,
      ]
        .filter((value): value is string => !!value)
        .reduce((latest, value) => (value > latest ? value : latest), rawGoal.start_date);
      const msPerDay = 86_400_000;
      const daysSinceWeighIn = Math.max(
        0,
        Math.round(
          (new Date(today + "T00:00:00Z").getTime() -
            new Date(lastActivityDate + "T00:00:00Z").getTime()) /
            msPerDay
        )
      );
      // We owe target for every full day that passed without a weigh-in
      // (excluding today — they still have time to weigh in).
      const missedDays = Math.max(0, daysSinceWeighIn - 1);

      const base = Number(rawGoal.daily_pace_lbs) || 0;
      const storedDebt = Number(rawGoal.current_debt_lbs) || 0;
      const storedCredit = Number(rawGoal.current_credit_lbs) || 0;

      // Expected debt from missed days. Take the MAX of stored vs expected so
      // we never under-report (cron may not have caught up yet) and never
      // double-count (cron may already have included these missed days).
      const expectedMissedDebt = Math.max(0, missedDays * base - storedCredit);
      const liveDebt = Math.max(storedDebt, Math.round(expectedMissedDebt * 10) / 10);
      const liveCredit =
        liveDebt > storedDebt ? 0 : storedCredit; // if we bumped debt, credit was burned

      const typed: SmartPaceGoal = {
        ...rawGoal,
        current_debt_lbs: liveDebt,
        current_credit_lbs: liveCredit,
        consecutive_missed_days: Math.max(
          rawGoal.consecutive_missed_days || 0,
          missedDays
        ),
        consecutive_behind_days: Math.max(
          rawGoal.consecutive_behind_days || 0,
          missedDays
        ),
      };

      const target = calculateDailyTarget(typed);

      let status: SmartPaceSnapshot["status"] = "on_pace";
      if (missedDays >= 2 || target.debtLbs >= base * 2) status = "missed";
      else if (target.debtLbs > 0.05) status = "behind";
      else if (target.creditLbs > 0.05) status = "ahead";

      return {
        goal: typed,
        enabled: true,
        todayTargetLbs: target.todayTargetLbs,
        baseLbs: target.baseLbs,
        debtLbs: target.debtLbs,
        creditLbs: target.creditLbs,
        progressPct: paceProgressPct(typed),
        reason: target.reason,
        projectedDate: projectCompletionDate(typed),
        status,
        cappedAt: target.cappedAt,
      };
    },
    staleTime: 30_000,
  });
}

function emptySnapshot(enabled: boolean): SmartPaceSnapshot {
  return {
    goal: null,
    enabled,
    todayTargetLbs: 0,
    baseLbs: 0,
    debtLbs: 0,
    creditLbs: 0,
    progressPct: 0,
    reason: "",
    projectedDate: null,
    status: "no_goal",
    cappedAt: null,
  };
}
