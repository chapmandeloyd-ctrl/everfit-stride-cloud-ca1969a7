import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MacroTargets {
  protein: number;
  fat: number;
  carbs: number;
  calories: number;
}

interface AdaptationResult {
  adjusted: MacroTargets;
  rule: string;
  reason: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { client_id } = await req.json();
    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 1. Get base macro targets ──
    const { data: macroTarget } = await supabase
      .from("client_macro_targets")
      .select("*")
      .eq("client_id", client_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!macroTarget) {
      return new Response(
        JSON.stringify({ error: "No active macro targets found", skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const base: MacroTargets = {
      protein: macroTarget.target_protein || 0,
      fat: macroTarget.target_fats || 0,
      carbs: macroTarget.target_carbs || 0,
      calories: macroTarget.target_calories || 0,
    };

    // ── 2. Get last 7 days of behavior data ──
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: behaviors } = await supabase
      .from("client_meal_behavior")
      .select("*")
      .eq("client_id", client_id)
      .gte("tracked_date", sevenDaysAgo.toISOString().split("T")[0])
      .order("tracked_date", { ascending: false });

    // ── 3. Get daily scores ──
    const { data: summaries } = await supabase
      .from("client_weekly_summaries")
      .select("avg_score_7d, completion_7d, bodyweight_delta")
      .eq("client_id", client_id)
      .order("week_start", { ascending: false })
      .limit(2);

    // ── 4. Get keto type ──
    const { data: ketoAssignment } = await supabase
      .from("client_keto_assignments")
      .select("keto_type_id, keto_types(name)")
      .eq("client_id", client_id)
      .eq("is_active", true)
      .maybeSingle();

    const ketoType = (ketoAssignment as any)?.keto_types?.name || "SKD";

    // ── 5. Get feature settings for training state ──
    const { data: features } = await supabase
      .from("client_feature_settings")
      .select("engine_mode")
      .eq("client_id", client_id)
      .maybeSingle();

    // ── 6. Check for recent active adjustment (cooldown: 2 days) ──
    const { data: lastAdjustment } = await supabase
      .from("adaptive_macro_adjustments")
      .select("applied_at")
      .eq("client_id", client_id)
      .eq("is_active", true)
      .order("applied_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastAdjustment) {
      const lastApplied = new Date(lastAdjustment.applied_at);
      const hoursSince = (Date.now() - lastApplied.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 48) {
        return new Response(
          JSON.stringify({ skipped: true, reason: "Cooldown active", hours_remaining: Math.round(48 - hoursSince) }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── Calculate adherence metrics ──
    const recentDays = behaviors || [];
    const avgScore = summaries?.[0]?.avg_score_7d || 50;
    const weightDelta = summaries?.[0]?.bodyweight_delta;

    let proteinHits = 0;
    let fastCompletions = 0;
    let carbExceeded = 0;

    for (const day of recentDays) {
      if (day.protein_target_hit) proteinHits++;
      if (day.fast_completed) fastCompletions++;
      if (day.carbs_exceeded) carbExceeded++;
    }

    const totalDays = Math.max(recentDays.length, 1);
    const macroAdherence = (proteinHits / totalDays) * 100;
    const fastingAdherence = (fastCompletions / totalDays) * 100;

    // Count consecutive high-score days
    let consecutiveHighDays = 0;
    for (const day of recentDays) {
      // Use fasting_window_adherence as a proxy for daily quality
      if ((day.fasting_window_adherence || 0) >= 80) {
        consecutiveHighDays++;
      } else {
        break;
      }
    }

    // ── 7. Run adaptation rules ──
    const result = runAdaptationRules({
      base,
      avgScore,
      macroAdherence,
      fastingAdherence,
      consecutiveHighDays,
      ketoType,
      weightDelta: weightDelta || null,
      totalDays,
    });

    if (!result) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No adaptation needed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 8. Deactivate old adjustments ──
    await supabase
      .from("adaptive_macro_adjustments")
      .update({ is_active: false })
      .eq("client_id", client_id)
      .eq("is_active", true);

    // ── 9. Save new adjustment ──
    const { data: newAdj, error } = await supabase
      .from("adaptive_macro_adjustments")
      .insert({
        client_id,
        base_protein: base.protein,
        base_fat: base.fat,
        base_carbs: base.carbs,
        base_calories: base.calories,
        adjusted_protein: result.adjusted.protein,
        adjusted_fat: result.adjusted.fat,
        adjusted_carbs: result.adjusted.carbs,
        adjusted_calories: result.adjusted.calories,
        adjustment_reason: result.reason,
        rule_triggered: result.rule,
        macro_adherence_pct: macroAdherence,
        fasting_adherence_pct: fastingAdherence,
        daily_score_avg: avgScore,
        is_active: true,
        expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 day window
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, adjustment: newAdj }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Adaptation Rules Engine ──

interface RuleInput {
  base: MacroTargets;
  avgScore: number;
  macroAdherence: number;
  fastingAdherence: number;
  consecutiveHighDays: number;
  ketoType: string;
  weightDelta: number | null;
  totalDays: number;
}

function runAdaptationRules(input: RuleInput): AdaptationResult | null {
  const { base, avgScore, macroAdherence, consecutiveHighDays, ketoType, weightDelta } = input;

  // Safety limits
  const MIN_PROTEIN = Math.max(base.protein * 0.8, 50);
  const MAX_CARBS: Record<string, number> = { SKD: 20, HPKD: 30, TKD: 50, CKD: 50 };
  const MIN_FAT = Math.max(base.fat * 0.6, 30);

  const adjusted = { ...base };

  // RULE 1 — LOW COMPLIANCE (struggling)
  if (avgScore < 60 || macroAdherence < 70) {
    adjusted.fat = Math.round(base.fat * 1.10);
    adjusted.calories = Math.round(base.calories * 1.07);
    adjusted.protein = base.protein; // keep stable

    return applySafety(adjusted, MIN_PROTEIN, MAX_CARBS[ketoType] || 20, MIN_FAT, {
      rule: "low_compliance",
      reason: "Fat ↑ to reduce hunger and improve adherence",
    });
  }

  // RULE 5 — WEIGHT STALL (check before strong consistency)
  if (
    weightDelta !== null &&
    Math.abs(weightDelta) < 0.3 &&
    avgScore >= 75 &&
    consecutiveHighDays >= 5
  ) {
    adjusted.fat = Math.round(base.fat * 0.90);
    adjusted.protein = base.protein;
    adjusted.calories = Math.round((adjusted.protein * 4) + (adjusted.fat * 9) + (adjusted.carbs * 4));

    return applySafety(adjusted, MIN_PROTEIN, MAX_CARBS[ketoType] || 20, MIN_FAT, {
      rule: "weight_stall",
      reason: "Fat ↓ to break through plateau — compliance is strong",
    });
  }

  // RULE 2 — STRONG CONSISTENCY
  if (avgScore > 85 && consecutiveHighDays >= 3) {
    adjusted.fat = Math.round(base.fat * 0.93);
    adjusted.protein = base.protein;
    adjusted.calories = Math.round((adjusted.protein * 4) + (adjusted.fat * 9) + (adjusted.carbs * 4));

    return applySafety(adjusted, MIN_PROTEIN, MAX_CARBS[ketoType] || 20, MIN_FAT, {
      rule: "strong_consistency",
      reason: "Fat ↓ for fat loss optimization — great consistency!",
    });
  }

  // RULE 3 — TKD TRAINING DAY (this would be triggered per-day, but we set a general adjustment)
  if (ketoType === "TKD" && macroAdherence > 75) {
    adjusted.carbs = Math.min(base.carbs + 20, MAX_CARBS["TKD"] || 50);
    adjusted.fat = Math.round(base.fat * 0.95);
    adjusted.calories = Math.round((adjusted.protein * 4) + (adjusted.fat * 9) + (adjusted.carbs * 4));

    return applySafety(adjusted, MIN_PROTEIN, MAX_CARBS["TKD"] || 50, MIN_FAT, {
      rule: "tkd_training",
      reason: "Carbs ↑ for training recovery — fat slightly reduced",
    });
  }

  // No rule triggered
  return null;
}

function applySafety(
  adjusted: MacroTargets,
  minProtein: number,
  maxCarbs: number,
  minFat: number,
  meta: { rule: string; reason: string }
): AdaptationResult {
  // Enforce safety limits
  adjusted.protein = Math.max(adjusted.protein, minProtein);
  adjusted.carbs = Math.min(adjusted.carbs, maxCarbs);
  adjusted.fat = Math.max(adjusted.fat, minFat);

  // Recalculate calories from adjusted macros
  adjusted.calories = Math.round(
    (adjusted.protein * 4) + (adjusted.fat * 9) + (adjusted.carbs * 4)
  );

  return { adjusted, ...meta };
}
