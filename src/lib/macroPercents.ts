/**
 * KSOM360 Macro Percentage Utility
 *
 * Computes the % of total calories coming from protein, fat, and carbs,
 * and checks whether that breakdown matches the meal's keto profile.
 *
 * Reference targets (calorie %):
 *   SKD  — Fat 70-80% / Protein 20-25% / Carbs <=10%
 *   HPKD — Fat 60-65% / Protein 30-35% / Carbs <=10%
 *   TKD  — Fat 65-70% / Protein 20-25% / Carbs ~10-15% (training-window)
 *   CKD  — Fat 65-70% / Protein 20-25% / Carbs <=10% (off days)
 */

export interface MacroInput {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fats?: number | null;
}

export interface MacroBreakdown {
  proteinPct: number;
  fatPct: number;
  carbsPct: number;
  totalCal: number;
  hasData: boolean;
}

/**
 * Compute calorie-% breakdown from grams. Uses the macro formula
 * (P*4 + C*4 + F*9) so the totals always sum to 100%.
 */
export function computeMacroPercents(input: MacroInput): MacroBreakdown {
  const p = Math.max(0, Number(input.protein ?? 0));
  const c = Math.max(0, Number(input.carbs ?? 0));
  const f = Math.max(0, Number(input.fats ?? 0));

  const calFromMacros = (p * 4) + (c * 4) + (f * 9);
  const total = calFromMacros > 0 ? calFromMacros : Number(input.calories ?? 0);

  if (total <= 0) {
    return { proteinPct: 0, fatPct: 0, carbsPct: 0, totalCal: 0, hasData: false };
  }

  const proteinPct = Math.round((p * 4 / total) * 100);
  const fatPct = Math.round((f * 9 / total) * 100);
  // Force sum to 100 by computing carbs as the remainder (avoids rounding drift)
  const carbsPct = Math.max(0, 100 - proteinPct - fatPct);

  return { proteinPct, fatPct, carbsPct, totalCal: Math.round(total), hasData: true };
}

export type KetoType = "SKD" | "HPKD" | "TKD" | "CKD";

interface KetoTarget {
  fat: [number, number];     // min, max %
  protein: [number, number];
  carbs: [number, number];
}

const KETO_TARGETS: Record<KetoType, KetoTarget> = {
  SKD:  { fat: [65, 85], protein: [15, 30], carbs: [0, 10] },
  HPKD: { fat: [55, 70], protein: [25, 40], carbs: [0, 10] },
  TKD:  { fat: [60, 75], protein: [15, 30], carbs: [0, 15] },
  CKD:  { fat: [60, 75], protein: [15, 30], carbs: [0, 10] },
};

export type ProfileMatch = "match" | "warning" | "violation" | "unknown";

/**
 * Check whether a breakdown matches its declared keto type(s).
 * Returns the worst result across all declared types (any violation wins).
 */
export function checkKetoMatch(
  breakdown: MacroBreakdown,
  ketoTypes?: string[] | null
): { status: ProfileMatch; reason?: string } {
  if (!breakdown.hasData) return { status: "unknown" };
  const types = (ketoTypes ?? [])
    .map((t) => t?.toUpperCase().replace(/^-\s*/, "").trim())
    .filter((t): t is KetoType => t in KETO_TARGETS);

  if (types.length === 0) return { status: "unknown" };

  let worst: ProfileMatch = "match";
  let reason: string | undefined;

  for (const type of types) {
    const t = KETO_TARGETS[type];
    const within = (val: number, [min, max]: [number, number]) => val >= min && val <= max;
    const close = (val: number, [min, max]: [number, number], pad = 5) =>
      val >= min - pad && val <= max + pad;

    const fatOk = within(breakdown.fatPct, t.fat);
    const proOk = within(breakdown.proteinPct, t.protein);
    const carbOk = within(breakdown.carbsPct, t.carbs);

    if (fatOk && proOk && carbOk) continue;

    // Carbs over keto limit = hard violation
    if (breakdown.carbsPct > t.carbs[1] + 5) {
      worst = "violation";
      reason = `Carbs ${breakdown.carbsPct}% exceeds ${type} limit (${t.carbs[1]}%)`;
      continue;
    }

    // Otherwise, soft warning
    if (
      close(breakdown.fatPct, t.fat) &&
      close(breakdown.proteinPct, t.protein) &&
      close(breakdown.carbsPct, t.carbs)
    ) {
      if (worst !== "violation") {
        worst = "warning";
        reason = `Slightly off ${type} target`;
      }
    } else {
      if (worst !== "violation") {
        worst = "warning";
        reason = `Doesn't match ${type} profile`;
      }
    }
  }

  return { status: worst, reason };
}