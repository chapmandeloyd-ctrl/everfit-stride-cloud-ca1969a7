/**
 * Smart Pace weigh-in pipeline (shared between admin panel, AI snapshot,
 * HealthKit sync, and Bluetooth scale flows).
 *
 * Call this from any **scale-sourced** weigh-in. Manual entries should NOT
 * call this function — they are intentionally excluded from Smart Pace.
 */
import { supabase } from "@/integrations/supabase/client";
import { processWeighIn, type SmartPaceGoal } from "./smartPaceEngine";

export type SmartPaceSource = "healthkit" | "bluetooth" | "ai_photo" | "admin_override";

export interface ApplySmartPaceWeighInArgs {
  clientId: string;
  weightLbs: number;
  source: SmartPaceSource;
  weighInDate?: string; // YYYY-MM-DD; defaults to today
  notes?: string;
}

export interface ApplySmartPaceWeighInResult {
  applied: boolean;
  reason?: string;
  message?: string;
  triggersPrescription?: boolean;
  newDebtLbs?: number;
  newCreditLbs?: number;
  consecutiveBehindDays?: number;
}

/**
 * Atomic-ish: looks up active goal, runs the engine, upserts the daily log,
 * and updates the goal totals. Safe to call from client code (RLS protects
 * who can write).
 */
export async function applySmartPaceWeighIn(
  args: ApplySmartPaceWeighInArgs
): Promise<ApplySmartPaceWeighInResult> {
  const { clientId, weightLbs, source, notes } = args;
  const weighInDate = args.weighInDate ?? new Date().toISOString().slice(0, 10);

  // 1. Confirm Smart Pace is enabled for this client
  const { data: settings } = await supabase
    .from("client_feature_settings")
    .select("smart_pace_enabled")
    .eq("client_id", clientId)
    .maybeSingle();

  if (!settings?.smart_pace_enabled) {
    return { applied: false, reason: "smart_pace_disabled" };
  }

  // 2. Load active goal
  const { data: goalRow, error: goalErr } = await supabase
    .from("smart_pace_goals")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "active")
    .maybeSingle();

  if (goalErr || !goalRow) return { applied: false, reason: "no_active_goal" };

  const goal = goalRow as unknown as SmartPaceGoal;

  // 3. Run engine
  const result = processWeighIn({
    goal,
    weighInLbs: weightLbs,
    weighInDate,
    source,
    previousWeightLbs: goal.last_weigh_in_value,
  });

  // 4. Upsert daily log
  const { error: logErr } = await supabase.from("smart_pace_daily_log").upsert(
    {
      goal_id: goal.id,
      client_id: clientId,
      log_date: weighInDate,
      target_loss_lbs: result.targetLossLbs,
      actual_loss_lbs: result.actualLossLbs,
      weight_recorded: weightLbs,
      weight_source: source,
      status: result.status,
      debt_delta: result.debtDelta,
      credit_delta: result.creditDelta,
      notes: notes ?? null,
    },
    { onConflict: "goal_id,log_date" }
  );

  if (logErr) {
    console.error("[smartPace] daily_log upsert failed:", logErr);
    return { applied: false, reason: logErr.message };
  }

  // 5. Update goal totals
  const { error: updErr } = await supabase
    .from("smart_pace_goals")
    .update({
      current_debt_lbs: result.newDebtLbs,
      current_credit_lbs: result.newCreditLbs,
      last_weigh_in_date: weighInDate,
      last_weigh_in_value: weightLbs,
      consecutive_behind_days: result.consecutiveBehindDays,
      consecutive_missed_days: 0,
    })
    .eq("id", goal.id);

  if (updErr) {
    console.error("[smartPace] goal update failed:", updErr);
    return { applied: false, reason: updErr.message };
  }

  return {
    applied: true,
    message: result.message,
    triggersPrescription: result.triggersPrescription,
    newDebtLbs: result.newDebtLbs,
    newCreditLbs: result.newCreditLbs,
    consecutiveBehindDays: result.consecutiveBehindDays,
  };
}
