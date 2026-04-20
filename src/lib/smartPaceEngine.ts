/**
 * Smart Pace Engine
 * ----------------------------------------------------------------------------
 * Real-pace weight tracking with rolling debt/credit and catch-up logic.
 *
 * Core idea:
 *   - Each day the client has a `target_loss_lbs` (e.g. 2.5/day base pace).
 *   - When they weigh in (scale-only), we compute actual_loss vs target.
 *   - Shortfall → adds to `debt`. Surplus → adds to `credit`.
 *   - Tomorrow's target = base pace + debt − credit (clamped).
 *   - 2+ consecutive behind days triggers a catch-up Prescription.
 */

export type PaceStatus =
  | "pending"
  | "on_pace"
  | "ahead"
  | "behind"
  | "missed"
  | "forgiven";

export type PaceSeverity = "none" | "mild" | "moderate" | "severe";

export interface SmartPaceGoal {
  id: string;
  client_id: string;
  start_date: string;
  target_date: string | null;
  start_weight: number | null;
  goal_weight: number;
  daily_pace_lbs: number;
  goal_direction: "lose" | "gain" | "maintain";
  current_debt_lbs: number;
  current_credit_lbs: number;
  consecutive_missed_days: number;
  consecutive_behind_days: number;
  last_weigh_in_date: string | null;
  last_weigh_in_value: number | null;
}

export interface DailyTargetResult {
  baseLbs: number;
  debtLbs: number;
  creditLbs: number;
  todayTargetLbs: number;
  cappedAt: number | null; // if we capped a brutal target
  reason: string;
}

const MAX_DAILY_TARGET_MULTIPLIER = 3; // never demand >3x base in a single day

/**
 * Calculate today's required loss to be back on pace.
 * todayTarget = base + outstanding_debt − available_credit
 */
export function calculateDailyTarget(goal: SmartPaceGoal): DailyTargetResult {
  const base = Number(goal.daily_pace_lbs) || 0;
  const debt = Number(goal.current_debt_lbs) || 0;
  const credit = Number(goal.current_credit_lbs) || 0;

  const raw = base + debt - credit;
  const cap = base * MAX_DAILY_TARGET_MULTIPLIER;
  const capped = raw > cap ? cap : null;
  const today = capped ?? Math.max(0, raw);

  let reason = "On pace";
  if (debt > 0.01) reason = `Catch-up: ${debt.toFixed(1)} lb owed`;
  else if (credit > 0.01) reason = `Ahead by ${credit.toFixed(1)} lb`;

  return {
    baseLbs: base,
    debtLbs: debt,
    creditLbs: credit,
    todayTargetLbs: Math.round(today * 10) / 10,
    cappedAt: capped !== null ? Math.round(capped * 10) / 10 : null,
    reason,
  };
}

/**
 * Process a fresh scale weigh-in: returns the daily-log row + new debt/credit.
 */
export interface ProcessWeighInInput {
  goal: SmartPaceGoal;
  weighInLbs: number;
  weighInDate: string; // YYYY-MM-DD
  source: "healthkit" | "bluetooth" | "ai_photo" | "admin_override";
  previousWeightLbs?: number | null;
}

export interface ProcessWeighInResult {
  actualLossLbs: number;
  targetLossLbs: number;
  status: PaceStatus;
  debtDelta: number;
  creditDelta: number;
  newDebtLbs: number;
  newCreditLbs: number;
  consecutiveBehindDays: number;
  triggersPrescription: boolean;
  severity: PaceSeverity;
  message: string;
}

export function processWeighIn(input: ProcessWeighInInput): ProcessWeighInResult {
  const { goal, weighInLbs, source, previousWeightLbs } = input;

  const target = calculateDailyTarget(goal);
  const prev = previousWeightLbs ?? goal.last_weigh_in_value ?? goal.start_weight ?? weighInLbs;

  // For "lose" goal, actualLoss = prev - now (positive = lost weight)
  // For "gain" goal, flip the sign.
  const direction = goal.goal_direction === "gain" ? -1 : 1;
  const actualLoss = (prev - weighInLbs) * direction;

  const targetLoss = target.todayTargetLbs;
  const diff = actualLoss - targetLoss; // positive = surplus, negative = shortfall

  let status: PaceStatus = "on_pace";
  let debtDelta = 0;
  let creditDelta = 0;

  if (diff >= 0.05) {
    status = "ahead";
    creditDelta = diff;
  } else if (diff <= -0.05) {
    status = "behind";
    debtDelta = -diff; // shortfall added to debt
  }

  // Apply: spend credit first, then add to debt
  let newDebt = Number(goal.current_debt_lbs) || 0;
  let newCredit = Number(goal.current_credit_lbs) || 0;

  if (status === "ahead") {
    // First pay down debt with the credit
    const payDown = Math.min(newDebt, creditDelta);
    newDebt -= payDown;
    newCredit += creditDelta - payDown;
  } else if (status === "behind") {
    // Burn credit first
    const burn = Math.min(newCredit, debtDelta);
    newCredit -= burn;
    newDebt += debtDelta - burn;
  }

  // Round to 0.1 lb
  newDebt = Math.round(newDebt * 10) / 10;
  newCredit = Math.round(newCredit * 10) / 10;

  const consecutiveBehind =
    status === "behind" ? (goal.consecutive_behind_days || 0) + 1 : 0;

  // Trigger prescription if 2+ consecutive behind days OR debt >= 2x base pace
  const triggersPrescription =
    consecutiveBehind >= 2 || newDebt >= goal.daily_pace_lbs * 2;

  let severity: PaceSeverity = "none";
  if (newDebt >= goal.daily_pace_lbs * 3) severity = "severe";
  else if (newDebt >= goal.daily_pace_lbs * 2) severity = "moderate";
  else if (consecutiveBehind >= 2 || newDebt >= goal.daily_pace_lbs) severity = "mild";

  const sourceLabel = {
    healthkit: "Apple Health",
    bluetooth: "Bluetooth scale",
    ai_photo: "scale photo",
    admin_override: "admin entry",
  }[source];

  let message = "";
  if (status === "ahead") {
    message = `Great work — you're ${creditDelta.toFixed(1)} lb ahead today (${sourceLabel}).`;
  } else if (status === "behind") {
    message = `Off ${Math.abs(diff).toFixed(1)} lb today. Total to make up: ${newDebt.toFixed(1)} lb.`;
  } else {
    message = `Right on pace — ${actualLoss.toFixed(1)} lb (${sourceLabel}).`;
  }

  return {
    actualLossLbs: Math.round(actualLoss * 10) / 10,
    targetLossLbs: targetLoss,
    status,
    debtDelta: Math.round(debtDelta * 10) / 10,
    creditDelta: Math.round(creditDelta * 10) / 10,
    newDebtLbs: newDebt,
    newCreditLbs: newCredit,
    consecutiveBehindDays: consecutiveBehind,
    triggersPrescription,
    severity,
    message,
  };
}

/** Project the date the client will hit goal weight at the current pace. */
export function projectCompletionDate(goal: SmartPaceGoal): Date | null {
  if (!goal.daily_pace_lbs) return null;

  // Fall back to start weight when no weigh-in has been logged yet so the
  // projection still renders on day 1 instead of returning null.
  const currentWeight = goal.last_weigh_in_value ?? goal.start_weight;
  if (currentWeight == null) return null;

  const remaining =
    goal.goal_direction === "gain"
      ? goal.goal_weight - currentWeight
      : currentWeight - goal.goal_weight;
  if (remaining <= 0) return new Date();

  // Anchor the projection to the date of the weight we're projecting from
  // (last weigh-in, or start date if none yet). This avoids off-by-one drift
  // caused by rounding `daily_pace_lbs` and ensures that on day 1 the
  // projection lines up exactly with the trainer-set target date.
  const anchorStr = goal.last_weigh_in_date ?? goal.start_date;
  const anchor = anchorStr ? new Date(anchorStr + "T00:00:00") : new Date();
  const days = Math.round(remaining / goal.daily_pace_lbs);
  anchor.setDate(anchor.getDate() + days);
  return anchor;
}

/** Overall progress 0–100. */
export function paceProgressPct(goal: SmartPaceGoal): number {
  if (!goal.start_weight) return 0;
  const total = Math.abs(goal.start_weight - goal.goal_weight);
  if (total === 0) return 100;
  const current = goal.last_weigh_in_value ?? goal.start_weight;
  const done = Math.abs(goal.start_weight - current);
  return Math.min(100, Math.max(0, (done / total) * 100));
}
