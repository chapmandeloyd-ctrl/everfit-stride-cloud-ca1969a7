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

      const typed = goal as unknown as SmartPaceGoal;
      const target = calculateDailyTarget(typed);
      const today = new Date().toISOString().slice(0, 10);

      let status: SmartPaceSnapshot["status"] = "on_pace";
      if (target.debtLbs > 0.05) status = "behind";
      else if (target.creditLbs > 0.05) status = "ahead";
      if (typed.last_weigh_in_date && typed.last_weigh_in_date < today) {
        // Hasn't weighed in today yet
        if (target.debtLbs > 0.05) status = "behind";
      }

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
