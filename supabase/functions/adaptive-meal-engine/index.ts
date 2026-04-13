import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, client_id, data } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Batch actions for cron (no client_id needed)
    if (action === "run_all_daily" || action === "run_all_weekly") {
      const { data: clients } = await supabase
        .from("trainer_clients")
        .select("client_id")
        .eq("status", "active");

      const results: any[] = [];
      for (const c of (clients || [])) {
        try {
          if (action === "run_all_daily") {
            await runDailyLoopInternal(supabase, c.client_id);
          } else {
            await runWeeklyLoopInternal(supabase, c.client_id);
          }
          results.push({ client_id: c.client_id, success: true });
        } catch (e) {
          results.push({ client_id: c.client_id, success: false, error: e.message });
        }
      }
      return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (action) {
      case "track_behavior":
        return await trackBehavior(supabase, client_id, data);
      case "track_meal_interaction":
        return await trackMealInteraction(supabase, client_id, data);
      case "run_daily_loop":
        return await runDailyLoop(supabase, client_id);
      case "run_weekly_loop":
        return await runWeeklyLoop(supabase, client_id);
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (e) {
    console.error("adaptive-meal-engine error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Track daily behavior signals (upsert for the day) ───
async function trackBehavior(supabase: any, clientId: string, data: any) {
  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("client_meal_behavior")
    .select("*")
    .eq("client_id", clientId)
    .eq("tracked_date", today)
    .maybeSingle();

  if (existing) {
    // Increment counters
    const updates: any = {};
    if (data.meals_shown) updates.meals_shown = (existing.meals_shown || 0) + data.meals_shown;
    if (data.meals_selected) updates.meals_selected = (existing.meals_selected || 0) + data.meals_selected;
    if (data.meals_completed) updates.meals_completed = (existing.meals_completed || 0) + data.meals_completed;
    if (data.coach_picks_used) updates.coach_picks_used = (existing.coach_picks_used || 0) + data.coach_picks_used;
    if (data.manual_meal_entries) updates.manual_meal_entries = (existing.manual_meal_entries || 0) + data.manual_meal_entries;
    if (data.barcode_scans) updates.barcode_scans = (existing.barcode_scans || 0) + data.barcode_scans;
    if (data.ai_photo_logs) updates.ai_photo_logs = (existing.ai_photo_logs || 0) + data.ai_photo_logs;

    // Override booleans/levels if provided
    if (data.protein_target_hit !== undefined) updates.protein_target_hit = data.protein_target_hit;
    if (data.carbs_exceeded !== undefined) updates.carbs_exceeded = data.carbs_exceeded;
    if (data.fat_deviation !== undefined) updates.fat_deviation = data.fat_deviation;
    if (data.fast_completed !== undefined) updates.fast_completed = data.fast_completed;
    if (data.fast_broken_early !== undefined) updates.fast_broken_early = data.fast_broken_early;
    if (data.fasting_window_adherence !== undefined) updates.fasting_window_adherence = data.fasting_window_adherence;
    if (data.hunger_break_fast !== undefined) updates.hunger_break_fast = data.hunger_break_fast;
    if (data.hunger_mid_window !== undefined) updates.hunger_mid_window = data.hunger_mid_window;
    if (data.hunger_last_meal !== undefined) updates.hunger_last_meal = data.hunger_last_meal;

    const { error } = await supabase
      .from("client_meal_behavior")
      .update(updates)
      .eq("id", existing.id);

    if (error) throw error;
  } else {
    const { error } = await supabase.from("client_meal_behavior").insert({
      client_id: clientId,
      tracked_date: today,
      ...data,
    });
    if (error) throw error;
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Track individual meal shown/selected/ignored ───
async function trackMealInteraction(supabase: any, clientId: string, data: any) {
  const { recipe_id, interaction } = data; // interaction: 'shown' | 'selected' | 'completed'

  if (!recipe_id || !interaction) {
    return new Response(JSON.stringify({ error: "recipe_id and interaction required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: existing } = await supabase
    .from("client_meal_adaptive_scores")
    .select("*")
    .eq("client_id", clientId)
    .eq("recipe_id", recipe_id)
    .maybeSingle();

  if (existing) {
    const updates: any = {};
    if (interaction === "shown") {
      updates.times_shown = (existing.times_shown || 0) + 1;
      updates.last_shown_at = new Date().toISOString();
    } else if (interaction === "selected" || interaction === "completed") {
      updates.times_selected = (existing.times_selected || 0) + 1;
      updates.last_selected_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("client_meal_adaptive_scores")
      .update(updates)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const insert: any = {
      client_id: clientId,
      recipe_id,
      times_shown: interaction === "shown" ? 1 : 0,
      times_selected: interaction === "selected" || interaction === "completed" ? 1 : 0,
      last_shown_at: interaction === "shown" ? new Date().toISOString() : null,
      last_selected_at: interaction === "selected" ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from("client_meal_adaptive_scores").insert(insert);
    if (error) throw error;
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Internal versions (no Response return) for batch processing
async function runDailyLoopInternal(supabase: any, clientId: string) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const { data: behavior } = await supabase
    .from("client_meal_behavior").select("*").eq("client_id", clientId).eq("tracked_date", yesterdayStr).maybeSingle();
  if (!behavior) return;
  // Delegate to shared logic
  await _processDailyScoring(supabase, clientId, behavior);
}

async function runWeeklyLoopInternal(supabase: any, clientId: string) {
  await _processWeeklyProfile(supabase, clientId);
}

// ─── DAILY LOOP: Analyze previous day, adjust scoring ───
async function runDailyLoop(supabase: any, clientId: string) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // Get yesterday's behavior
  const { data: behavior } = await supabase
    .from("client_meal_behavior")
    .select("*")
    .eq("client_id", clientId)
    .eq("tracked_date", yesterdayStr)
    .maybeSingle();

  if (!behavior) {
    return new Response(JSON.stringify({ success: true, message: "No data for yesterday" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get all adaptive scores for this client
  const { data: scores } = await supabase
    .from("client_meal_adaptive_scores")
    .select("*")
    .eq("client_id", clientId);

  const adjustments: { id: string; score_adjustment: number; adjustment_reason: string; times_ignored: number }[] = [];

  for (const score of (scores || [])) {
    let newAdjustment = score.score_adjustment || 0;
    let reason = score.adjustment_reason || "preference";
    let timesIgnored = score.times_ignored || 0;

    // ── Rule 1: Preference Boost ──
    // Frequently selected → boost
    if (score.times_selected >= 3) {
      newAdjustment = Math.min(newAdjustment + 10, 50);
      reason = "preference";
    }
    // Shown 3+ times but never selected → penalize
    if (score.times_shown >= 3 && score.times_selected === 0) {
      timesIgnored = score.times_shown;
      newAdjustment = Math.max(newAdjustment - 10, -50);
      reason = "preference";
    }

    // ── Rule 2: Compliance Adjustment ──
    if (!behavior.protein_target_hit) {
      // Get recipe protein info
      const { data: recipe } = await supabase
        .from("recipes")
        .select("protein, carbs, calories, tags")
        .eq("id", score.recipe_id)
        .maybeSingle();

      if (recipe) {
        // Low protein compliance → boost high protein meals
        if (recipe.protein >= 30) {
          newAdjustment = Math.min(newAdjustment + 15, 50);
          reason = "compliance";
        }
      }
    }

    if (behavior.carbs_exceeded) {
      const { data: recipe } = await supabase
        .from("recipes")
        .select("keto_types")
        .eq("id", score.recipe_id)
        .maybeSingle();

      if (recipe) {
        const ketoTypes = (recipe.keto_types || []).map((k: string) => k.toUpperCase());
        // Carbs exceeded → suppress TKD meals
        if (ketoTypes.includes("TKD")) {
          newAdjustment = Math.max(newAdjustment - 15, -50);
          reason = "compliance";
        }
      }
    }

    // ── Rule 3: Hunger Matching ──
    const avgHunger = [behavior.hunger_break_fast, behavior.hunger_mid_window, behavior.hunger_last_meal]
      .filter((h: number | null) => h !== null);
    if (avgHunger.length > 0) {
      const avg = avgHunger.reduce((a: number, b: number) => a + b, 0) / avgHunger.length;
      const { data: recipe } = await supabase
        .from("recipes")
        .select("protein, fats, calories")
        .eq("id", score.recipe_id)
        .maybeSingle();

      if (recipe) {
        const isHighSatiety = recipe.protein >= 35 || (recipe.protein >= 25 && recipe.fats >= 20) || recipe.calories >= 500;
        const isLight = recipe.calories <= 350 || (recipe.protein <= 20 && recipe.fats <= 15);

        if (avg >= 7 && isHighSatiety) {
          newAdjustment = Math.min(newAdjustment + 5, 50);
          reason = "hunger";
        } else if (avg <= 3 && isLight) {
          newAdjustment = Math.min(newAdjustment + 5, 50);
          reason = "hunger";
        }
      }
    }

    // ── Rule 4: Behavior Adaptation ──
    // User repeats same meals → reinforce but cap
    if (score.times_selected >= 5) {
      newAdjustment = Math.min(newAdjustment, 30); // Cap high-repeat meals
    }

    if (newAdjustment !== score.score_adjustment || timesIgnored !== score.times_ignored) {
      adjustments.push({
        id: score.id,
        score_adjustment: newAdjustment,
        adjustment_reason: reason,
        times_ignored: timesIgnored,
      });
    }
  }

  // Batch update adjustments
  for (const adj of adjustments) {
    await supabase
      .from("client_meal_adaptive_scores")
      .update({
        score_adjustment: adj.score_adjustment,
        adjustment_reason: adj.adjustment_reason,
        times_ignored: adj.times_ignored,
      })
      .eq("id", adj.id);
  }

  // ── Variety injection for ignored recommendations ──
  // If user ignores coach picks often, increase variety (reset some negative scores)
  if (behavior.meals_shown > 0 && behavior.meals_selected === 0) {
    // User saw meals but selected none → reset mild negatives to give variety
    await supabase
      .from("client_meal_adaptive_scores")
      .update({ score_adjustment: 0, adjustment_reason: "variety" })
      .eq("client_id", clientId)
      .gte("score_adjustment", -15)
      .lte("score_adjustment", -1);
  }

  return new Response(
    JSON.stringify({ success: true, adjustments_made: adjustments.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── WEEKLY LOOP: Build adaptive profile ───
async function runWeeklyLoop(supabase: any, clientId: string) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday
  const weekStartStr = weekStart.toISOString().split("T")[0];

  // Get last 7 days of behavior
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: behaviors } = await supabase
    .from("client_meal_behavior")
    .select("*")
    .eq("client_id", clientId)
    .gte("tracked_date", sevenDaysAgo.toISOString().split("T")[0])
    .order("tracked_date", { ascending: true });

  const days = behaviors || [];
  const daysWithData = days.length;

  if (daysWithData === 0) {
    return new Response(JSON.stringify({ success: true, message: "No weekly data" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Calculate consistency (days tracked / 7)
  const consistencyScore = Math.round((daysWithData / 7) * 100);

  // Protein compliance rate
  const proteinHits = days.filter((d: any) => d.protein_target_hit).length;
  const proteinCompliance = daysWithData > 0 ? Math.round((proteinHits / daysWithData) * 100) : 0;

  // Carb compliance rate (days NOT exceeding)
  const carbCompliant = days.filter((d: any) => !d.carbs_exceeded).length;
  const carbCompliance = daysWithData > 0 ? Math.round((carbCompliant / daysWithData) * 100) : 0;

  // Fasting adherence
  const fastCompleted = days.filter((d: any) => d.fast_completed).length;
  const fastingAdherence = daysWithData > 0 ? Math.round((fastCompleted / daysWithData) * 100) : 0;

  // Average hunger levels
  const hungerBF = days.map((d: any) => d.hunger_break_fast).filter((h: any) => h !== null);
  const hungerMW = days.map((d: any) => d.hunger_mid_window).filter((h: any) => h !== null);
  const hungerLM = days.map((d: any) => d.hunger_last_meal).filter((h: any) => h !== null);

  const avgHungerBF = hungerBF.length > 0 ? hungerBF.reduce((a: number, b: number) => a + b, 0) / hungerBF.length : null;
  const avgHungerMW = hungerMW.length > 0 ? hungerMW.reduce((a: number, b: number) => a + b, 0) / hungerMW.length : null;
  const avgHungerLM = hungerLM.length > 0 ? hungerLM.reduce((a: number, b: number) => a + b, 0) / hungerLM.length : null;

  // Determine profile type
  let profileType = "inconsistent";
  if (consistencyScore >= 70 && proteinCompliance >= 60) {
    profileType = "consistent";
  } else if (consistencyScore < 40 || (proteinCompliance < 40 && carbCompliance < 40)) {
    profileType = "struggling";
  }

  // Determine meal pattern
  const { data: scores } = await supabase
    .from("client_meal_adaptive_scores")
    .select("times_selected")
    .eq("client_id", clientId)
    .gt("times_selected", 0)
    .order("times_selected", { ascending: false });

  let mealPattern = "mixed";
  if (scores && scores.length > 0) {
    const topCount = scores[0]?.times_selected || 0;
    const totalSelections = scores.reduce((a: number, s: any) => a + (s.times_selected || 0), 0);
    const uniqueMeals = scores.length;

    if (uniqueMeals <= 3 && totalSelections >= 5) {
      mealPattern = "repetitive";
    } else if (uniqueMeals >= 7) {
      mealPattern = "varied";
    }
  }

  // Scoring precision based on profile
  let precision = "low";
  if (profileType === "consistent" && daysWithData >= 5) {
    precision = "high";
  } else if (profileType === "consistent" || daysWithData >= 3) {
    precision = "medium";
  }

  // Upsert weekly profile
  const profileData = {
    client_id: clientId,
    week_start: weekStartStr,
    consistency_score: consistencyScore,
    profile_type: profileType,
    preferred_meal_pattern: mealPattern,
    avg_hunger_break_fast: avgHungerBF ? Math.round(avgHungerBF * 10) / 10 : null,
    avg_hunger_mid_window: avgHungerMW ? Math.round(avgHungerMW * 10) / 10 : null,
    avg_hunger_last_meal: avgHungerLM ? Math.round(avgHungerLM * 10) / 10 : null,
    protein_compliance_rate: proteinCompliance,
    carb_compliance_rate: carbCompliance,
    fasting_adherence_rate: fastingAdherence,
    scoring_precision: precision,
  };

  const { data: existingProfile } = await supabase
    .from("client_adaptive_profile")
    .select("id")
    .eq("client_id", clientId)
    .eq("week_start", weekStartStr)
    .maybeSingle();

  if (existingProfile) {
    await supabase
      .from("client_adaptive_profile")
      .update(profileData)
      .eq("id", existingProfile.id);
  } else {
    await supabase.from("client_adaptive_profile").insert(profileData);
  }

  // ── Weekly adaptive rules ──
  if (profileType === "struggling") {
    // Boost easy, high-satiety meals for struggling users
    const { data: recipes } = await supabase
      .from("recipes")
      .select("id, protein, fats, calories, prep_time_minutes")
      .or("protein.gte.30,calories.gte.450")
      .lte("prep_time_minutes", 15);

    if (recipes) {
      for (const recipe of recipes) {
        const { data: existing } = await supabase
          .from("client_meal_adaptive_scores")
          .select("id, score_adjustment")
          .eq("client_id", clientId)
          .eq("recipe_id", recipe.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("client_meal_adaptive_scores")
            .update({
              score_adjustment: Math.min((existing.score_adjustment || 0) + 10, 50),
              adjustment_reason: "struggling_support",
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("client_meal_adaptive_scores").insert({
            client_id: clientId,
            recipe_id: recipe.id,
            score_adjustment: 10,
            adjustment_reason: "struggling_support",
          });
        }
      }
    }
  } else if (profileType === "inconsistent") {
    // Simplify: reduce extreme scores
    await supabase
      .from("client_meal_adaptive_scores")
      .update({ score_adjustment: 0, adjustment_reason: "simplify" })
      .eq("client_id", clientId)
      .or("score_adjustment.gt.30,score_adjustment.lt.-30");
  }

  return new Response(
    JSON.stringify({
      success: true,
      profile: {
        consistency_score: consistencyScore,
        profile_type: profileType,
        scoring_precision: precision,
        meal_pattern: mealPattern,
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
