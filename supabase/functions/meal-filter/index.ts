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
    } = await req.json();

    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    const ketoType = ketoRes.data?.keto_types;
    const macros = macroRes.data;

    // 2. Build tag filters from user selections
    const tagFilters: string[] = [];

    // Map meal types to tags
    for (const mt of meal_types) {
      const lower = mt.toLowerCase();
      if (lower === "breakfast") tagFilters.push("Breakfast");
      else if (lower === "lunch") tagFilters.push("Lunch");
      else if (lower === "dinner") tagFilters.push("Dinner", "Main Course", "Main Dish");
      else if (lower === "snack") tagFilters.push("Snack");
    }

    // Map meal goals to tags
    for (const mg of meal_goals) {
      const lower = mg.toLowerCase();
      if (lower.includes("break my fast")) tagFilters.push("break fast right", "fasting support");
      if (lower.includes("high protein")) tagFilters.push("High Protein", "High protein", "High-Protein", "High Protein stacks", "lean protein");
      if (lower.includes("light")) tagFilters.push("Low Calorie", "Low calorie", "Low Fat");
      if (lower.includes("performance")) tagFilters.push("Post-workout", "Iron Bowl");
      if (lower.includes("quick")) tagFilters.push("Quick & Easy", "quick prep", "Simple Meals", "Simple meals");
    }

    // Map prep styles to tags
    for (const ps of prep_styles) {
      const lower = ps.toLowerCase();
      if (lower === "quick") tagFilters.push("Quick & Easy", "quick prep");
      if (lower === "grab & go" || lower === "no prep") tagFilters.push("No Cook", "No-Cook", "No cooking");
    }

    // Always include keto tags
    tagFilters.push("Keto", "Keto Diet", "Low Carb", "Low-Carb", "low carb", "Low carb");

    const uniqueTags = [...new Set(tagFilters)];

    // 3. Fetch recipes matching tags
    const { data: allRecipes } = await supabase
      .from("recipes")
      .select("*")
      .order("protein", { ascending: false });

    let filtered = (allRecipes || []).filter((r: any) => {
      if (!r.tags || r.tags.length === 0) return false;
      const rTags = r.tags.map((t: string) => t.toLowerCase());
      return uniqueTags.some((t) => rTags.includes(t.toLowerCase()));
    });

    // 4. Apply hunger level sizing
    if (hunger_level === "Light") {
      filtered = filtered.filter((r: any) => !r.calories || r.calories <= 400);
    } else if (hunger_level === "High") {
      filtered = filtered.filter((r: any) => !r.calories || r.calories >= 400);
    }

    // 5. Sort: highest protein, lowest carbs, fastest prep
    filtered.sort((a: any, b: any) => {
      const protDiff = (b.protein || 0) - (a.protein || 0);
      if (protDiff !== 0) return protDiff;
      const carbDiff = (a.carbs || 0) - (b.carbs || 0);
      if (carbDiff !== 0) return carbDiff;
      return (a.prep_time_minutes || 999) - (b.prep_time_minutes || 999);
    });

    // 6. If no results, fallback to best keto meals overall
    let usedFallback = false;
    if (filtered.length === 0) {
      usedFallback = true;
      filtered = (allRecipes || [])
        .filter((r: any) => {
          if (!r.tags) return false;
          const rTags = r.tags.map((t: string) => t.toLowerCase());
          return rTags.some((t: string) =>
            ["keto", "keto diet", "low carb", "low-carb", "high protein", "high-protein"].includes(t)
          );
        })
        .sort((a: any, b: any) => (b.protein || 0) - (a.protein || 0))
        .slice(0, 20);
    }

    // 7. If STILL no results, AI generates suggestions
    let aiSuggestions: any[] = [];
    if (filtered.length === 0) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        const prompt = `Generate 5 keto-friendly meal suggestions for someone on a ${ketoType?.name || "Standard Ketogenic Diet"}.
Requirements: ${meal_goals.join(", ") || "balanced keto meals"}.
Hunger level: ${hunger_level || "moderate"}.
Prep style: ${prep_styles.join(", ") || "any"}.
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

    const results = filtered.length > 0 ? filtered.slice(0, 30) : aiSuggestions;

    return new Response(
      JSON.stringify({
        meals: results,
        total: results.length,
        used_fallback: usedFallback,
        has_ai_suggestions: aiSuggestions.length > 0,
        keto_type: ketoType?.name || null,
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
