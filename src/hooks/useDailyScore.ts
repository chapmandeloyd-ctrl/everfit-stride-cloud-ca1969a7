import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";

export type DailyScoreLabel = "Perfect Day" | "Strong Day" | "Off Track" | "Reset Needed";

export interface DailyScoreCategory {
  key: "fasting" | "meal_timing" | "macro_quality";
  label: string;
  score: number; // 0-100
  weight: number;
  weighted: number;
}

export interface DailyScoreResult {
  total: number; // 0-100
  label: DailyScoreLabel;
  color: string; // tailwind color class
  ringColor: string; // hex for SVG
  categories: DailyScoreCategory[];
  lowestCategory: DailyScoreCategory;
  coachMessage: string;
}

function getLabel(score: number): DailyScoreLabel {
  if (score >= 90) return "Perfect Day";
  if (score >= 70) return "Strong Day";
  if (score >= 50) return "Off Track";
  return "Reset Needed";
}

function getColors(score: number) {
  if (score >= 90) return { color: "text-emerald-400", ringColor: "#34d399" };
  if (score >= 70) return { color: "text-sky-400", ringColor: "#38bdf8" };
  if (score >= 50) return { color: "text-amber-400", ringColor: "#fbbf24" };
  return { color: "text-red-400", ringColor: "#f87171" };
}

const COACH_MESSAGES: Record<DailyScoreCategory["key"], { low: string; mid: string; high: string }> = {
  fasting: {
    low: "Your fast wasn't completed — consistency builds results.",
    mid: "Solid fasting effort — aim to finish the full window.",
    high: "Fasting on point — metabolic engine is firing.",
  },
  meal_timing: {
    low: "Meal timing was off — try to eat within your window.",
    mid: "Timing is close — tighten your eating window.",
    high: "Meals timed perfectly — great discipline.",
  },
  macro_quality: {
    low: "Macros need work — focus on protein and portions.",
    mid: "Macros are close — small adjustments will get you there.",
    high: "Macro targets hit — nutrition is dialed in.",
  },
};

function getCoachMessage(lowest: DailyScoreCategory): string {
  const msgs = COACH_MESSAGES[lowest.key];
  if (lowest.score >= 80) return msgs.high;
  if (lowest.score >= 50) return msgs.mid;
  return msgs.low;
}

export function useDailyScore() {
  const clientId = useEffectiveClientId();
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["daily-score", clientId, today],
    queryFn: async (): Promise<DailyScoreResult> => {
      if (!clientId) throw new Error("No client");

      // Fetch today's data in parallel
      const [fastingRes, mealsRes, macroRes, settingsRes] = await Promise.all([
        // Fasting log for today
        supabase
          .from("fasting_log")
          .select("actual_hours, target_hours, status, started_at, ended_at")
          .eq("client_id", clientId)
          .gte("started_at", `${today}T00:00:00`)
          .order("started_at", { ascending: false })
          .limit(1),
        // Meals logged today
        supabase
          .from("client_meal_selections")
          .select("id, meal_type, serving_multiplier, recipe_id, recipes(calories, protein, carbs, fats)")
          .eq("client_id", clientId)
          .eq("meal_date", today),
        // Macro targets
        supabase
          .from("client_macro_targets")
          .select("target_calories, target_protein, target_carbs, target_fats")
          .eq("client_id", clientId)
          .eq("is_active", true)
          .maybeSingle(),
        // Feature settings (eating window, fasting)
        supabase
          .from("client_feature_settings")
          .select("fasting_enabled, eating_window_hours, eating_window_ends_at, active_fast_start_at, active_fast_target_hours")
          .eq("client_id", clientId)
          .maybeSingle(),
      ]);

      // === CHECK FOR ZERO-ACTIVITY STATE ===
      // If user has no fasting logs, no meals, and no active fast, they have zero activity → score 0
      const fastLog = fastingRes.data?.[0];
      const meals = mealsRes.data || [];
      const mealsLogged = meals.length;
      const fastingEnabled = settingsRes.data?.fasting_enabled ?? false;
      const hasActiveFast = !!settingsRes.data?.active_fast_start_at;
      const hasAnyActivity = !!fastLog || mealsLogged > 0 || hasActiveFast;

      if (!hasAnyActivity) {
        // Brand new user or no activity today — return zeroed-out score
        const zeroCategories: DailyScoreCategory[] = [
          { key: "fasting", label: "Fasting", score: 0, weight: 0.4, weighted: 0 },
          { key: "meal_timing", label: "Meal Timing", score: 0, weight: 0.3, weighted: 0 },
          { key: "macro_quality", label: "Macro Quality", score: 0, weight: 0.3, weighted: 0 },
        ];
        return {
          total: 0,
          label: getLabel(0),
          color: getColors(0).color,
          ringColor: getColors(0).ringColor,
          categories: zeroCategories,
          lowestCategory: zeroCategories[0],
          coachMessage: "Log your first meal or start a fast to begin tracking.",
        };
      }

      // === 1. FASTING SCORE (40%) ===
      let fastingScore = 0;

      if (!fastingEnabled) {
        // If fasting is disabled, give full marks (don't penalize)
        fastingScore = 100;
      } else if (fastLog) {
        if (fastLog.status === "completed" && fastLog.target_hours > 0) {
          const ratio = Math.min(fastLog.actual_hours / fastLog.target_hours, 1);
          fastingScore = Math.round(ratio * 100);
        } else if (fastLog.status === "in_progress") {
          const started = new Date(fastLog.started_at).getTime();
          const elapsed = (Date.now() - started) / 3600000;
          const target = fastLog.target_hours || 16;
          fastingScore = Math.round(Math.min(elapsed / target, 1) * 80);
        } else {
          fastingScore = 20;
        }
      } else if (hasActiveFast) {
        const started = new Date(settingsRes.data!.active_fast_start_at!).getTime();
        const elapsed = (Date.now() - started) / 3600000;
        const target = settingsRes.data!.active_fast_target_hours || 16;
        fastingScore = Math.round(Math.min(elapsed / target, 1) * 80);
      }

      // === 2. MEAL TIMING SCORE (30%) ===
      let mealTimingScore = 0;

      if (mealsLogged >= 3) {
        mealTimingScore = 100;
      } else if (mealsLogged === 2) {
        mealTimingScore = 70;
      } else if (mealsLogged === 1) {
        mealTimingScore = 40;
      } else {
        // Check time — if it's still morning, don't penalize too hard
        const hour = new Date().getHours();
        mealTimingScore = hour < 12 ? 30 : 0;
      }

      // === 3. MACRO / MEAL QUALITY SCORE (30%) ===
      let macroScore = 0;
      const macroTargets = macroRes.data;

      if (mealsLogged > 0 && macroTargets) {
        let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFats = 0;
        meals.forEach((m: any) => {
          const mult = m.serving_multiplier || 1;
          totalCal += (m.recipes?.calories || 0) * mult;
          totalProtein += (m.recipes?.protein || 0) * mult;
          totalCarbs += (m.recipes?.carbs || 0) * mult;
          totalFats += (m.recipes?.fats || 0) * mult;
        });

        let subScores: number[] = [];

        // Protein adherence (most important)
        if (macroTargets.target_protein && macroTargets.target_protein > 0) {
          const proteinRatio = Math.min(totalProtein / macroTargets.target_protein, 1.2);
          subScores.push(proteinRatio >= 0.9 ? 100 : proteinRatio >= 0.7 ? 70 : proteinRatio * 100);
        }

        // Calorie adherence
        if (macroTargets.target_calories && macroTargets.target_calories > 0) {
          const calRatio = totalCal / macroTargets.target_calories;
          if (calRatio >= 0.85 && calRatio <= 1.1) subScores.push(100);
          else if (calRatio >= 0.7 && calRatio <= 1.25) subScores.push(70);
          else subScores.push(30);
        }

        // Fat adherence
        if (macroTargets.target_fats && macroTargets.target_fats > 0) {
          const fatRatio = totalFats / macroTargets.target_fats;
          if (fatRatio >= 0.8 && fatRatio <= 1.15) subScores.push(100);
          else if (fatRatio >= 0.6 && fatRatio <= 1.3) subScores.push(70);
          else subScores.push(30);
        }

        macroScore = subScores.length > 0
          ? Math.round(subScores.reduce((a, b) => a + b, 0) / subScores.length)
          : 50;
      } else if (mealsLogged > 0) {
        // No targets set — give partial credit for logging meals
        macroScore = 60;
      }

      // === BUILD RESULT ===
      const categories: DailyScoreCategory[] = [
        { key: "fasting", label: "Fasting", score: fastingScore, weight: 0.4, weighted: Math.round(fastingScore * 0.4) },
        { key: "meal_timing", label: "Meal Timing", score: mealTimingScore, weight: 0.3, weighted: Math.round(mealTimingScore * 0.3) },
        { key: "macro_quality", label: "Macro Quality", score: macroScore, weight: 0.3, weighted: Math.round(macroScore * 0.3) },
      ];

      const total = categories.reduce((s, c) => s + c.weighted, 0);
      const lowestCategory = [...categories].sort((a, b) => a.score - b.score)[0];
      const { color, ringColor } = getColors(total);

      return {
        total,
        label: getLabel(total),
        color,
        ringColor,
        categories,
        lowestCategory,
        coachMessage: getCoachMessage(lowestCategory),
      };
    },
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });
}
