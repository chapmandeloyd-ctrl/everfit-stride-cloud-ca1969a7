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

    // 3. Score and filter recipes based on engine state
    const scored = allRecipes.map((recipe: any) => {
      let score = 0;
      let matches = { phase: false, keto: false, training: false, goal: false, tags: false };

      const recipeIfRoles: string[] = (recipe.if_roles || []).map((r: string) => r.toLowerCase());
      const recipeKetoTypes: string[] = (recipe.keto_types || []).map((k: string) => k.toUpperCase());
      const recipeTriggers: string[] = (recipe.trigger_conditions || []).map((t: string) => t.toLowerCase());
      const recipeTags: string[] = (recipe.tags || []).map((t: string) => t.toLowerCase());
      const recipeMealRole = (recipe.meal_role || "").toLowerCase();

      // --- Phase match (highest priority: 30 points) ---
      if (eating_phase) {
        if (recipeIfRoles.includes(eating_phase)) {
          score += 30;
          matches.phase = true;
        } else if (recipeIfRoles.length === 0) {
          // No roles specified = generic, slight penalty
          score += 5;
        } else {
          // Wrong phase = heavy penalty
          score -= 20;
        }
      }

      // --- Keto type match (25 points) ---
      if (clientKetoAbbrev) {
        if (recipeKetoTypes.includes(clientKetoAbbrev.toUpperCase())) {
          score += 25;
          matches.keto = true;
        } else if (recipeKetoTypes.length === 0) {
          // Generic recipe, small bonus
          score += 5;
        } else {
          score -= 10;
        }
      }

      // --- Training state match (20 points) ---
      if (training_state === "post_workout" || training_state === "training_today") {
        if (recipeTriggers.includes("post_workout") || recipeTriggers.includes("muscle_preservation")) {
          score += 20;
          matches.training = true;
        }
        // TKD meals get priority when training
        if (clientKetoAbbrev === "TKD" && recipeKetoTypes.includes("TKD")) {
          score += 15;
        }
      }

      // --- Goal match (15 points) ---
      if (goal) {
        if (goal === "fat_loss" && (recipeTags.includes("low carb") || recipeTags.includes("low calorie") || recipeTags.includes("keto"))) {
          score += 15;
          matches.goal = true;
        } else if (goal === "performance" && (recipeTags.includes("high protein") || recipeTriggers.includes("muscle_preservation"))) {
          score += 15;
          matches.goal = true;
        } else if (goal === "recovery" && (recipeTriggers.includes("post_workout") || recipeTags.includes("anti-inflammatory"))) {
          score += 15;
          matches.goal = true;
        }
      }

      // --- Tag/filter matching (10 points each) ---
      // Map meal types
      for (const mt of meal_types) {
        const lower = mt.toLowerCase();
        if (lower === "breakfast" && recipeTags.includes("breakfast")) { score += 10; matches.tags = true; }
        if (lower === "lunch" && recipeTags.includes("lunch")) { score += 10; matches.tags = true; }
        if (lower === "dinner" && (recipeTags.includes("dinner") || recipeTags.includes("main course"))) { score += 10; matches.tags = true; }
        if (lower === "snack" && recipeTags.includes("snack")) { score += 10; matches.tags = true; }
      }

      // Map meal goals
      for (const mg of meal_goals) {
        const lower = mg.toLowerCase();
        if (lower.includes("break my fast") && recipeIfRoles.includes("break_fast")) { score += 15; matches.tags = true; }
        if (lower.includes("high protein") && (recipe.protein || 0) >= 30) { score += 10; matches.tags = true; }
        if (lower.includes("light") && (recipe.calories || 0) <= 400) { score += 10; matches.tags = true; }
        if (lower.includes("performance") && recipeTriggers.includes("muscle_preservation")) { score += 10; matches.tags = true; }
        if (lower.includes("quick") && (recipe.prep_time_minutes || 999) <= 15) { score += 10; matches.tags = true; }
      }

      // Map prep styles
      for (const ps of prep_styles) {
        const lower = ps.toLowerCase();
        if (lower === "quick" && (recipe.prep_time_minutes || 999) <= 15) score += 5;
        if ((lower === "grab & go" || lower === "no prep") && (recipe.prep_time_minutes || 999) <= 5) score += 5;
      }

      // Base keto bonus for all keto-tagged recipes
      if (recipeTags.includes("keto") || recipeTags.includes("keto diet") || recipeTags.includes("low carb")) {
        score += 3;
      }

      return { ...recipe, _score: score, _matches: matches };
    });

    // 4. Apply strict filtering for engine-driven states
    let filtered = scored;

    // Break fast: ONLY show break_fast meals
    if (fasting_state === "break_fast_triggered" || eating_phase === "break_fast") {
      const breakFastOnly = filtered.filter((r: any) => {
        const roles = (r.if_roles || []).map((x: string) => x.toLowerCase());
        return roles.includes("break_fast");
      });
      if (breakFastOnly.length > 0) filtered = breakFastOnly;
    }

    // Eating window closing: ONLY show last_meal meals
    if (fasting_state === "eating_window_closing" || eating_phase === "last_meal") {
      const lastMealOnly = filtered.filter((r: any) => {
        const roles = (r.if_roles || []).map((x: string) => x.toLowerCase());
        return roles.includes("last_meal");
      });
      if (lastMealOnly.length > 0) filtered = lastMealOnly;
    }

    // Training priority: boost TKD when training
    if ((training_state === "training_today" || training_state === "post_workout") && clientKetoAbbrev === "TKD") {
      const tkdMeals = filtered.filter((r: any) => {
        const kt = (r.keto_types || []).map((x: string) => x.toUpperCase());
        return kt.includes("TKD");
      });
      if (tkdMeals.length > 0) {
        // Put TKD meals first, then others
        const nonTkd = filtered.filter((r: any) => {
          const kt = (r.keto_types || []).map((x: string) => x.toUpperCase());
          return !kt.includes("TKD");
        });
        filtered = [...tkdMeals, ...nonTkd];
      }
    }

    // Keto type strict filter: if recipe has keto_types set, it must include client's type
    if (clientKetoAbbrev) {
      filtered = filtered.filter((r: any) => {
        const kt = (r.keto_types || []).map((x: string) => x.toUpperCase());
        return kt.length === 0 || kt.includes(clientKetoAbbrev.toUpperCase());
      });
    }

    // 5. Apply hunger level
    if (hunger_level === "Light") {
      filtered = filtered.filter((r: any) => !r.calories || r.calories <= 400);
    } else if (hunger_level === "High") {
      filtered = filtered.filter((r: any) => !r.calories || r.calories >= 400);
    }

    // 6. Sort by score descending, then protein, then lowest carbs
    filtered.sort((a: any, b: any) => {
      const scoreDiff = (b._score || 0) - (a._score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      const protDiff = (b.protein || 0) - (a.protein || 0);
      if (protDiff !== 0) return protDiff;
      return (a.carbs || 0) - (b.carbs || 0);
    });

    // 7. Fallback if no results
    let usedFallback = false;
    if (filtered.length === 0) {
      usedFallback = true;
      filtered = scored
        .filter((r: any) => r._score > 0)
        .sort((a: any, b: any) => (b._score || 0) - (a._score || 0))
        .slice(0, 20);
    }

    // 8. If STILL no results, try basic keto fallback
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
Phase: ${eating_phase || "general eating"}.
Training: ${training_state || "none"}.
Goal: ${goal || "balanced"}.
Requirements: ${meal_goals.join(", ") || "balanced keto meals"}.
Daily targets: ${macros?.target_calories || 2000} cal, ${macros?.target_protein || 120}g protein, ${macros?.target_carbs || 25}g carbs, ${macros?.target_fats || 150}g fat.

Return JSON array with objects: { name, description, calories, protein, carbs, fats, prep_time_minutes, tags }`;

        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "You are a keto nutrition expert. Return only valid JSON arrays." },
                { role: "user", content: prompt },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "suggest_meals",
                    description: "Return keto meal suggestions",
                    parameters: {
                      type: "object",
                      properties: {
                        meals: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              description: { type: "string" },
                              calories: { type: "number" },
                              protein: { type: "number" },
                              carbs: { type: "number" },
                              fats: { type: "number" },
                              prep_time_minutes: { type: "number" },
                              tags: { type: "array", items: { type: "string" } },
                            },
                            required: ["name", "calories", "protein", "carbs", "fats"],
                          },
                        },
                      },
                      required: ["meals"],
                    },
                  },
                },
              ],
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
              }));
            }
          }
        } catch (e) {
          console.error("AI fallback error:", e);
        }
      }
    }

    // Auto mode: return top 3
    const limit = auto_mode ? 3 : 30;
    const results = filtered.length > 0 ? filtered.slice(0, limit) : aiSuggestions;

    // Clean internal scoring fields from response
    const cleanResults = results.map((r: any) => {
      const { _score, _matches, ...clean } = r;
      return clean;
    });

    return new Response(
      JSON.stringify({
        meals: cleanResults,
        total: cleanResults.length,
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
