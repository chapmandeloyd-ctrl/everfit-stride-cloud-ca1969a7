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
    const {
      client_id,
      meal_types = [],
      meal_goals = [],
      hunger_level,
      prep_styles = [],
      // New engine state inputs
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

    // 1. Get client keto assignment + macro targets
    const [ketoRes, macroRes] = await Promise.all([
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
    ]);

    const ketoTypeData = ketoRes.data?.keto_types;
    const macros = macroRes.data;
    const clientKetoAbbrev = keto_type || ketoTypeData?.abbreviation || null;

    // 2. Fetch all recipes
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

    // 3. Score every meal on a 0–100 scale
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

      // ── 1. Phase Match (0–30 pts) ──
      if (eating_phase) {
        if (recipeIfRoles.includes(eating_phase)) {
          phaseScore = 30;
        } else if (recipeIfRoles.length > 0) {
          // Has roles but wrong phase → exclude
          excluded = true;
        }
        // No roles set = generic meal, gets 0 phase pts but not excluded
      }

      // ── 2. Keto Type Match (0–25 pts) ──
      if (clientKetoAbbrev && recipeKetoTypes.length > 0) {
        if (recipeKetoTypes.includes(clientKetoAbbrev.toUpperCase())) {
          ketoScore = 25;
        } else {
          // Wrong keto type → exclude completely
          excluded = true;
        }
      } else if (clientKetoAbbrev && recipeKetoTypes.length === 0) {
        // Generic recipe, compatible but lower score
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
        // no_training → control meals get bonus, TKD-only excluded
        if (recipeKetoTypes.length > 0 && recipeKetoTypes.every((k: string) => k === "TKD")) {
          excluded = true; // TKD-only meals hidden when not training
        } else if (recipeMealRole.includes("control") || recipeTags.includes("low carb") || recipeTags.includes("keto")) {
          trainingScore = 15;
        } else {
          trainingScore = 5;
        }
      }

      // ── 4. Goal Alignment (0–15 pts) ──
      if (goal) {
        if (goal === "fat_loss") {
          // Lean meals (low cal, high protein-to-cal ratio) = 15
          if (cal <= 500 && prot >= 25) {
            goalScore = 15;
          } else if (cal <= 600) {
            goalScore = 10;
          } else {
            goalScore = 5; // Heavy meals still get something
          }
        } else if (goal === "performance") {
          if (recipeKetoTypes.includes("TKD") || recipeTriggers.includes("muscle_preservation")) {
            goalScore = 15;
          } else if (prot >= 30) {
            goalScore = 10;
          } else {
            goalScore = 5;
          }
        } else if (goal === "recomposition" || goal === "recovery") {
          // Balanced: moderate cal, good protein
          const protRatio = cal > 0 ? (prot * 4) / cal : 0;
          if (protRatio >= 0.3 && cal >= 400 && cal <= 700) {
            goalScore = 15;
          } else if (prot >= 30) {
            goalScore = 10;
          } else {
            goalScore = 5;
          }
        }
      }

      // ── 5. Satiety Match (0–10 pts) ──
      if (hunger_level) {
        const isHighSatiety = prot >= 35 || (prot >= 25 && fat >= 20) || cal >= 500;
        const isLight = cal <= 350 || (prot <= 20 && fat <= 15);

        if (hunger_level === "High" && isHighSatiety) {
          satietyScore = 10;
        } else if (hunger_level === "Light" && isLight) {
          satietyScore = 10;
        } else if (hunger_level === "Moderate") {
          satietyScore = 7; // Moderate matches most meals
        } else {
          satietyScore = 3; // Mismatch
        }
      }

      const totalScore = excluded ? -1 : phaseScore + ketoScore + trainingScore + goalScore + satietyScore;

      return {
        ...recipe,
        _score: totalScore,
        _excluded: excluded,
        _breakdown: { phase: phaseScore, keto: ketoScore, training: trainingScore, goal: goalScore, satiety: satietyScore },
        _prepTime: prepMin,
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

    // 8. Fallback chain — never return empty
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

    // 9. AI fallback if absolutely nothing
    let aiSuggestions: any[] = [];
    if (filtered.length === 0) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        const prompt = `Generate 5 keto-friendly meal suggestions for someone on a ${ketoTypeData?.name || "Standard Ketogenic Diet"}.
Phase: ${eating_phase || "general eating"}. Training: ${training_state || "none"}. Goal: ${goal || "balanced"}.
Daily targets: ${macros?.target_calories || 2000} cal, ${macros?.target_protein || 120}g protein, ${macros?.target_carbs || 25}g carbs, ${macros?.target_fats || 150}g fat.
Return JSON array with objects: { name, description, calories, protein, carbs, fats, prep_time_minutes, tags }`;
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
                      meals: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, calories: { type: "number" }, protein: { type: "number" }, carbs: { type: "number" }, fats: { type: "number" }, prep_time_minutes: { type: "number" }, tags: { type: "array", items: { type: "string" } } }, required: ["name", "calories", "protein", "carbs", "fats"] } },
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
              aiSuggestions = (parsed.meals || []).map((m: any) => ({ ...m, id: crypto.randomUUID(), is_ai_generated: true }));
            }
          }
        } catch (e) { console.error("AI fallback error:", e); }
      }
    }

    const pool = filtered.length > 0 ? filtered : aiSuggestions;

    // 10. Build Coach Picks (top 3 with distinct roles)
    const coachPicks: any[] = [];
    if (pool.length > 0) {
      // Slot 1: Best Match — highest score
      coachPicks.push({ ...pool[0], _pick_label: "Best Match", _pick_slot: 1 });

      // Slot 2: Alternative Option — 2nd highest that isn't the same recipe
      const alt = pool.find((r: any, i: number) => i > 0 && r.id !== pool[0].id);
      if (alt) coachPicks.push({ ...alt, _pick_label: "Alternative Option", _pick_slot: 2 });

      // Slot 3: Quick Option — fastest prep among remaining top meals
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
      const { _score, _excluded, _breakdown, _prepTime, _pick_label, _pick_slot, ...clean } = r;
      return { ...clean, score: _score, pick_label: _pick_label || null, pick_slot: _pick_slot || null };
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
