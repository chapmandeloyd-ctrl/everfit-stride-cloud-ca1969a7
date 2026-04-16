import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Macro Alignment Scoring (0-20 pts) ───
interface MacroContext {
  ketoAbbrev: string | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFats: number | null;
  targetCalories: number | null;
  macroMode: string; // percentage_based | gram_based
  ketoProteinPct: number | null;
  ketoFatPct: number | null;
  ketoCarbPct: number | null;
  trainingState: string | null;
  goal: string | null;
}

function scoreMacroAlignment(
  recipe: any,
  ctx: MacroContext
): { score: number; feedback: string; suggestedMultiplier: number } {
  const profile: string = recipe.macro_profile || "balanced";
  const prot = recipe.protein || 0;
  const carb = recipe.carbs || 0;
  const fat = recipe.fats || 0;
  const cal = recipe.calories || 0;

  let score = 0;
  let feedback = "";
  let suggestedMultiplier = 1.0;

  // If no macro targets are set at all, give neutral score with no feedback
  const hasAnyTargets = (ctx.targetProtein && ctx.targetProtein > 0) ||
    (ctx.targetFats && ctx.targetFats > 0) ||
    (ctx.targetCarbs && ctx.targetCarbs > 0) ||
    (ctx.targetCalories && ctx.targetCalories > 0);
  if (!hasAnyTargets && !ctx.ketoAbbrev) {
    return { score: 10, feedback: "", suggestedMultiplier: 1.0 };
  }

  const keto = (ctx.ketoAbbrev || "").toUpperCase();

  // ── Protein alignment (0-8 pts) ──
  if (ctx.targetProtein && ctx.targetProtein > 0) {
    // Assume 3-4 meals/day, so per-meal target is ~25-33% of daily
    const perMealTarget = ctx.targetProtein / 3;
    const proteinRatio = prot / perMealTarget;

    if (proteinRatio >= 0.8 && proteinRatio <= 1.3) {
      score += 8; // Strong match
    } else if (proteinRatio >= 0.5 && proteinRatio <= 1.6) {
      score += 5; // Moderate
    } else {
      score += 2; // Poor
    }

    // High protein targets → prioritize high_protein meals
    if (ctx.targetProtein >= 140 && profile === "high_protein") {
      score += 2; // Bonus
    }

    // Portion adjustment for protein
    if (proteinRatio < 0.6 && prot > 0) {
      suggestedMultiplier = Math.min(1.5, perMealTarget / prot);
      feedback = "This meal is low in protein — increase portion";
    } else if (proteinRatio > 1.5) {
      suggestedMultiplier = Math.max(0.5, perMealTarget / prot);
    }
  }

  // ── Fat alignment (0-6 pts) ──
  if (keto === "SKD") {
    // SKD → boost high_fat meals
    if (profile === "high_fat" || (cal > 0 && (fat * 9) / cal >= 0.6)) {
      score += 6;
    } else if (cal > 0 && (fat * 9) / cal >= 0.4) {
      score += 3;
    } else {
      score += 1;
    }
  } else if (ctx.goal === "fat_loss") {
    // Fat loss → reduce high_fat meals
    if (profile === "high_fat") {
      score += 0;
      if (!feedback) feedback = "Fat is high — choose a leaner meal";
    } else if (cal > 0 && (fat * 9) / cal <= 0.4) {
      score += 6;
    } else {
      score += 3;
    }
  } else {
    // Default
    score += 3;
  }

  // ── Carb alignment (0-6 pts) ──
  if (keto === "SKD") {
    // SKD → hide meals >10g carbs (handled as exclusion)
    if (carb <= 5) {
      score += 6;
    } else if (carb <= 10) {
      score += 4;
    } else {
      score += 0; // Will be excluded separately
    }
  } else if (keto === "HPKD") {
    // HPKD → allow low carb only
    if (carb <= 10) {
      score += 6;
    } else if (carb <= 20) {
      score += 3;
    } else {
      score += 0;
    }
  } else if (keto === "TKD") {
    // TKD → allow performance_carb meals ONLY when training
    if (ctx.trainingState === "post_workout" || ctx.trainingState === "training_today") {
      if (profile === "performance_carb" || carb >= 20) {
        score += 6;
      } else {
        score += 3;
      }
    } else {
      // Not training → penalize carby meals
      if (carb <= 10) {
        score += 6;
      } else if (profile === "performance_carb") {
        score += 0;
      } else {
        score += 2;
      }
    }
  } else {
    score += 3;
  }

  // ── Calorie-based portion adjustment ──
  if (ctx.targetCalories && ctx.targetCalories > 0 && cal > 0) {
    const perMealCalTarget = ctx.targetCalories / 3;
    const calRatio = cal / perMealCalTarget;

    if (calRatio > 1.4) {
      const newMult = Math.max(0.5, perMealCalTarget / cal);
      if (newMult < suggestedMultiplier) {
        suggestedMultiplier = newMult;
        if (!feedback) feedback = "High calorie meal — consider a smaller portion";
      }
    }
  }

  // ── Perfect match feedback ──
  if (score >= 16 && !feedback) {
    feedback = "Perfect macro match — stay on track";
  } else if (score >= 10 && !feedback) {
    feedback = "Good fit for your macros";
  } else if (!feedback) {
    feedback = "Consider adjusting portion or choosing another option";
  }

  // Round multiplier to nearest 0.5
  suggestedMultiplier = Math.round(suggestedMultiplier * 2) / 2;
  suggestedMultiplier = Math.max(0.5, Math.min(1.5, suggestedMultiplier));

  return { score: Math.min(20, score), feedback, suggestedMultiplier };
}

// ─── Carb exclusion check ───
function shouldExcludeByCarbs(recipe: any, ketoAbbrev: string | null, trainingState: string | null): boolean {
  const carb = recipe.carbs || 0;
  const keto = (ketoAbbrev || "").toUpperCase();
  const profile = recipe.macro_profile || "balanced";

  if (keto === "SKD" && carb > 10) return true;
  if (keto === "HPKD" && carb > 20) return true;
  if (keto === "TKD" && profile === "performance_carb" && trainingState !== "post_workout" && trainingState !== "training_today") return true;

  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      client_id,
      meal_types = [],
      meal_goals = [],
      hunger_level,
      prep_styles = [],
      fasting_state,
      eating_phase,
      training_state,
      keto_type,
      goal,
      auto_mode = false,
    } = await req.json();

    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block meals during active fasting
    if (fasting_state === "fasting_active") {
      return new Response(
        JSON.stringify({
          meals: [],
          total: 0,
          blocked: true,
          blocked_reason: "fasting_active",
          message: "You're currently fasting. Meals will be available when your fast ends.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get client context
    const [ketoRes, macroRes, adaptiveRes, profileRes] = await Promise.all([
      supabase
        .from("client_keto_assignments")
        .select("*, keto_types (*)")
        .eq("client_id", client_id)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("client_macro_targets")
        .select("*")
        .eq("client_id", client_id)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("client_meal_adaptive_scores")
        .select("recipe_id, score_adjustment, times_shown, times_selected, times_ignored")
        .eq("client_id", client_id),
      supabase
        .from("client_adaptive_profile")
        .select("*")
        .eq("client_id", client_id)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const adaptiveScoreMap = new Map<string, number>();
    const interactionMap = new Map<string, { shown: number; selected: number; ignored: number }>();
    for (const s of (adaptiveRes.data || [])) {
      adaptiveScoreMap.set(s.recipe_id, s.score_adjustment || 0);
      interactionMap.set(s.recipe_id, {
        shown: s.times_shown || 0,
        selected: s.times_selected || 0,
        ignored: s.times_ignored || 0,
      });
    }
    const clientProfile = profileRes.data;
    const ketoTypeData = ketoRes.data?.keto_types;
    const macros = macroRes.data;
    const clientKetoAbbrev = keto_type || ketoTypeData?.abbreviation || null;

    // Build macro context for alignment scoring
    const macroCtx: MacroContext = {
      ketoAbbrev: clientKetoAbbrev,
      targetProtein: macros?.target_protein || null,
      targetCarbs: macros?.target_carbs || null,
      targetFats: macros?.target_fats || null,
      targetCalories: macros?.target_calories || null,
      macroMode: ketoTypeData?.macro_mode || "percentage_based",
      ketoProteinPct: ketoTypeData?.protein_pct || null,
      ketoFatPct: ketoTypeData?.fat_pct || null,
      ketoCarbPct: ketoTypeData?.carb_pct || null,
      trainingState: training_state || null,
      goal: goal || null,
    };

    // 2. Fetch all recipes (now includes macro_profile)
    const { data: allRecipes } = await supabase
      .from("recipes")
      .select("*")
      .order("protein", { ascending: false });

    if (!allRecipes || allRecipes.length === 0) {
      return new Response(
        JSON.stringify({ meals: [], total: 0, keto_type: clientKetoAbbrev, macro_targets: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Score every meal on expanded 0–120 scale (was 0-100, now +20 for macro alignment)
    const scored = allRecipes.map((recipe: any) => {
      let phaseScore = 0;
      let ketoScore = 0;
      let trainingScore = 0;
      let goalScore = 0;
      let satietyScore = 0;
      let excluded = false;

      const recipeIfRoles: string[] = (recipe.if_roles || []).map((r: string) => r.toLowerCase());
      const recipeKetoTypes: string[] = (recipe.keto_types || []).map((k: string) => k.toUpperCase());
      const recipeTriggers: string[] = (recipe.trigger_conditions || []).map((t: string) => t.toLowerCase());
      const recipeTags: string[] = (recipe.tags || []).map((t: string) => t.toLowerCase());
      const recipeMealRole = (recipe.meal_role || "").toLowerCase();
      const cal = recipe.calories || 0;
      const prot = recipe.protein || 0;
      const carb = recipe.carbs || 0;
      const fat = recipe.fats || 0;
      const prepMin = recipe.prep_time_minutes || 999;

      // ── Macro-based carb exclusion ──
      if (shouldExcludeByCarbs(recipe, clientKetoAbbrev, training_state)) {
        excluded = true;
      }

      // ── 1. Phase Match (0–30 pts) ──
      if (eating_phase) {
        if (recipeIfRoles.includes(eating_phase)) {
          phaseScore = 30;
        } else if (recipeIfRoles.length > 0) {
          excluded = true;
        }
      }

      // ── 2. Keto Type Match (0–25 pts) ──
      if (clientKetoAbbrev && recipeKetoTypes.length > 0) {
        if (recipeKetoTypes.includes(clientKetoAbbrev.toUpperCase())) {
          ketoScore = 25;
        } else {
          excluded = true;
        }
      } else if (clientKetoAbbrev && recipeKetoTypes.length === 0) {
        ketoScore = 10;
      }

      // ── 3. Training Match (0–20 pts) ──
      if (training_state === "post_workout") {
        if (recipeMealRole.includes("performance_fuel") || recipeTriggers.includes("post_workout")) {
          trainingScore = 20;
        } else if (recipeKetoTypes.includes("TKD")) {
          trainingScore = 15;
        } else {
          trainingScore = 5;
        }
      } else if (training_state === "training_today") {
        if (recipeKetoTypes.includes("TKD") || recipeTriggers.includes("muscle_preservation")) {
          trainingScore = 15;
        } else {
          trainingScore = 5;
        }
      } else {
        if (recipeKetoTypes.length > 0 && recipeKetoTypes.every((k: string) => k === "TKD")) {
          excluded = true;
        } else if (recipeMealRole.includes("control") || recipeTags.includes("low carb") || recipeTags.includes("keto")) {
          trainingScore = 15;
        } else {
          trainingScore = 5;
        }
      }

      // ── 4. Goal Alignment (0–15 pts) ──
      if (goal) {
        if (goal === "fat_loss") {
          if (cal <= 500 && prot >= 25) goalScore = 15;
          else if (cal <= 600) goalScore = 10;
          else goalScore = 5;
        } else if (goal === "performance") {
          if (recipeKetoTypes.includes("TKD") || recipeTriggers.includes("muscle_preservation")) goalScore = 15;
          else if (prot >= 30) goalScore = 10;
          else goalScore = 5;
        } else if (goal === "recomposition" || goal === "recovery") {
          const protRatio = cal > 0 ? (prot * 4) / cal : 0;
          if (protRatio >= 0.3 && cal >= 400 && cal <= 700) goalScore = 15;
          else if (prot >= 30) goalScore = 10;
          else goalScore = 5;
        }
      }

      // ── 5. Satiety Match (0–10 pts) ──
      if (hunger_level) {
        const isHighSatiety = prot >= 35 || (prot >= 25 && fat >= 20) || cal >= 500;
        const isLight = cal <= 350 || (prot <= 20 && fat <= 15);
        if (hunger_level === "High" && isHighSatiety) satietyScore = 10;
        else if (hunger_level === "Light" && isLight) satietyScore = 10;
        else if (hunger_level === "Moderate") satietyScore = 7;
        else satietyScore = 3;
      }

      // ── 6. NEW: Macro Alignment Score (0–20 pts) ──
      const macroAlignment = excluded ? { score: 0, feedback: "", suggestedMultiplier: 1.0 } : scoreMacroAlignment(recipe, macroCtx);

      // ── 7. Adaptive Score ──
      const adaptiveBoost = adaptiveScoreMap.get(recipe.id) || 0;

      // ── 8. Profile-based adjustments ──
      let profileBoost = 0;
      if (clientProfile) {
        if (clientProfile.profile_type === "struggling") {
          const isEasyHighSatiety = prepMin <= 15 && (prot >= 30 || cal >= 450);
          if (isEasyHighSatiety) profileBoost += 10;
        }
        if (clientProfile.profile_type === "inconsistent") {
          const interaction = interactionMap.get(recipe.id);
          if (!interaction || interaction.shown === 0) profileBoost += 5;
        }
        if (clientProfile.scoring_precision === "high") {
          if (adaptiveBoost > 0) profileBoost += Math.round(adaptiveBoost * 0.3);
        }
      }

      const totalScore = excluded
        ? -1
        : phaseScore + ketoScore + trainingScore + goalScore + satietyScore + macroAlignment.score + adaptiveBoost + profileBoost;

      return {
        ...recipe,
        _score: totalScore,
        _excluded: excluded,
        _breakdown: {
          phase: phaseScore,
          keto: ketoScore,
          training: trainingScore,
          goal: goalScore,
          satiety: satietyScore,
          macro_alignment: macroAlignment.score,
          adaptive: adaptiveBoost,
          profile: profileBoost,
        },
        _prepTime: prepMin,
        _macro_feedback: macroAlignment.feedback,
        _suggested_multiplier: macroAlignment.suggestedMultiplier,
        _macro_profile: recipe.macro_profile || "balanced",
      };
    });

    // 4. Remove excluded meals
    let filtered = scored.filter((r: any) => !r._excluded);

    // 5. Apply strict phase filtering
    if (fasting_state === "break_fast_triggered" || eating_phase === "break_fast") {
      const breakFastOnly = filtered.filter((r: any) => {
        const roles = (r.if_roles || []).map((x: string) => x.toLowerCase());
        return roles.includes("break_fast");
      });
      if (breakFastOnly.length > 0) filtered = breakFastOnly;
    }

    if (fasting_state === "eating_window_closing" || eating_phase === "last_meal") {
      const lastMealOnly = filtered.filter((r: any) => {
        const roles = (r.if_roles || []).map((x: string) => x.toLowerCase());
        return roles.includes("last_meal");
      });
      if (lastMealOnly.length > 0) filtered = lastMealOnly;
    }

    // 6. Apply hunger level hard filter
    if (hunger_level === "Light") {
      filtered = filtered.filter((r: any) => !r.calories || r.calories <= 400);
    } else if (hunger_level === "High") {
      filtered = filtered.filter((r: any) => !r.calories || r.calories >= 400);
    }

    // 7. Sort by score descending, then protein, then lowest carbs
    filtered.sort((a: any, b: any) => {
      const scoreDiff = (b._score || 0) - (a._score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      const protDiff = (b.protein || 0) - (a.protein || 0);
      if (protDiff !== 0) return protDiff;
      return (a.carbs || 0) - (b.carbs || 0);
    });

    // 8. Fallback chain
    let usedFallback = false;
    if (filtered.length === 0) {
      usedFallback = true;
      filtered = scored
        .filter((r: any) => r._score > 0)
        .sort((a: any, b: any) => (b._score || 0) - (a._score || 0))
        .slice(0, 20);
    }
    if (filtered.length === 0) {
      filtered = (allRecipes || [])
        .filter((r: any) => {
          if (!r.tags) return false;
          const rTags = r.tags.map((t: string) => t.toLowerCase());
          return rTags.some((t: string) =>
            ["keto", "keto diet", "low carb", "low-carb", "high protein"].includes(t)
          );
        })
        .sort((a: any, b: any) => (b.protein || 0) - (a.protein || 0))
        .slice(0, 20);
    }

    // 9. AI fallback
    let aiSuggestions: any[] = [];
    if (filtered.length === 0) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        const prompt = `Generate 5 keto-friendly meal suggestions for someone on a ${ketoTypeData?.name || "Standard Ketogenic Diet"}.
Phase: ${eating_phase || "general eating"}. Training: ${training_state || "none"}. Goal: ${goal || "balanced"}.
Daily targets: ${macros?.target_calories || 2000} cal, ${macros?.target_protein || 120}g protein, ${macros?.target_carbs || 25}g carbs, ${macros?.target_fats || 150}g fat.
Return JSON array with objects: { name, description, calories, protein, carbs, fats, prep_time_minutes, tags, macro_profile }
macro_profile must be one of: high_protein, high_fat, balanced, performance_carb`;
        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "You are a keto nutrition expert. Return only valid JSON arrays." },
                { role: "user", content: prompt },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "suggest_meals",
                  description: "Return keto meal suggestions",
                  parameters: {
                    type: "object",
                    properties: {
                      meals: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, calories: { type: "number" }, protein: { type: "number" }, carbs: { type: "number" }, fats: { type: "number" }, prep_time_minutes: { type: "number" }, tags: { type: "array", items: { type: "string" } }, macro_profile: { type: "string" } }, required: ["name", "calories", "protein", "carbs", "fats"] } },
                    },
                    required: ["meals"],
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "suggest_meals" } },
            }),
          });
          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
            if (toolCall?.function?.arguments) {
              const parsed = JSON.parse(toolCall.function.arguments);
              aiSuggestions = (parsed.meals || []).map((m: any) => ({
                ...m,
                id: crypto.randomUUID(),
                is_ai_generated: true,
                _macro_feedback: "AI-generated to match your macros",
                _suggested_multiplier: 1.0,
                _macro_profile: m.macro_profile || "balanced",
              }));
            }
          }
        } catch (e) { console.error("AI fallback error:", e); }
      }
    }

    const pool = filtered.length > 0 ? filtered : aiSuggestions;

    // 10. Build Coach Picks (top 3 with distinct roles)
    const coachPicks: any[] = [];
    if (pool.length > 0) {
      coachPicks.push({ ...pool[0], _pick_label: "Best Match", _pick_slot: 1 });
      const alt = pool.find((r: any, i: number) => i > 0 && r.id !== pool[0].id);
      if (alt) coachPicks.push({ ...alt, _pick_label: "Alternative Option", _pick_slot: 2 });
      const quickCandidates = pool
        .filter((r: any) => !coachPicks.some((p: any) => p.id === r.id))
        .sort((a: any, b: any) => (a._prepTime || 999) - (b._prepTime || 999));
      if (quickCandidates.length > 0) {
        coachPicks.push({ ...quickCandidates[0], _pick_label: "Quick Option", _pick_slot: 3 });
      } else if (pool.length >= 3 && !coachPicks.some((p: any) => p.id === pool[2].id)) {
        coachPicks.push({ ...pool[2], _pick_label: "Quick Option", _pick_slot: 3 });
      }
    }

    // Clean internal scoring fields
    const cleanMeal = (r: any) => {
      const { _score, _excluded, _breakdown, _prepTime, _pick_label, _pick_slot, _macro_feedback, _suggested_multiplier, _macro_profile, ...clean } = r;
      return {
        ...clean,
        score: _score,
        pick_label: _pick_label || null,
        pick_slot: _pick_slot || null,
        macro_feedback: _macro_feedback || null,
        suggested_multiplier: _suggested_multiplier || 1.0,
        macro_profile: _macro_profile || "balanced",
        score_breakdown: _breakdown || null,
      };
    };

    const limit = auto_mode ? 3 : 30;
    const results = pool.slice(0, limit).map(cleanMeal);
    const picks = coachPicks.map(cleanMeal);

    return new Response(
      JSON.stringify({
        meals: results,
        coach_picks: picks,
        total: results.length,
        used_fallback: usedFallback,
        has_ai_suggestions: aiSuggestions.length > 0,
        keto_type: ketoTypeData?.name || clientKetoAbbrev || null,
        keto_abbreviation: clientKetoAbbrev,
        eating_phase,
        fasting_state,
        training_state,
        macro_targets: macros
          ? {
              calories: macros.target_calories,
              protein: macros.target_protein,
              carbs: macros.target_carbs,
              fats: macros.target_fats,
            }
          : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("meal-filter error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
