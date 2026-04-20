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

      // ----- Live recalc: age debt for missed days since last weigh-in -----
      // Cron runs nightly, but we want the dashboard to feel real-time.
      const rawGoal = goal as unknown as SmartPaceGoal;
      const today = new Date().toISOString().slice(0, 10);
      const last = rawGoal.last_weigh_in_date ?? rawGoal.start_date;
      const msPerDay = 86_400_000;
      const missedDays = Math.max(
        0,
        Math.round(
          (new Date(today + "T00:00:00Z").getTime() -
            new Date(last + "T00:00:00Z").getTime()) /
            msPerDay
        ) - 1 // exclude today (still has time to weigh in)
      );

      let liveDebt = Number(rawGoal.current_debt_lbs) || 0;
      let liveCredit = Number(rawGoal.current_credit_lbs) || 0;
      const base = Number(rawGoal.daily_pace_lbs) || 0;
      if (missedDays > 0 && base > 0) {
        let owed = base * missedDays;
        const burn = Math.min(liveCredit, owed);
        liveCredit -= burn;
        owed -= burn;
        liveDebt += owed;
        liveDebt = Math.round(liveDebt * 10) / 10;
        liveCredit = Math.round(liveCredit * 10) / 10;
      }

      const typed: SmartPaceGoal = {
        ...rawGoal,
        current_debt_lbs: liveDebt,
        current_credit_lbs: liveCredit,
        consecutive_behind_days:
          (rawGoal.consecutive_behind_days || 0) + missedDays,
        consecutive_missed_days:
          (rawGoal.consecutive_missed_days || 0) + missedDays,
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
