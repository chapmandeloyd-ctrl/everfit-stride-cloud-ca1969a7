import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, eating_phase, keto_type } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const USDA_API_KEY = Deno.env.get("USDA_API_KEY");

    console.log(`Parsing meal text: "${text.slice(0, 80)}"`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a nutrition expert. Parse the user's meal description into structured macro data. Be accurate with portion estimates. If the user mentions a quantity, use it. Otherwise estimate a standard serving.`,
          },
          {
            role: "user",
            content: `Parse this meal: "${text}"
Current eating phase: ${eating_phase || "unknown"}
Keto type: ${keto_type || "unknown"}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_meal",
              description: "Return structured nutrition data for the described meal",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Clean meal name" },
                  calories: { type: "number", description: "Total estimated calories" },
                  protein: { type: "number", description: "Protein in grams" },
                  carbs: { type: "number", description: "Net carbs in grams" },
                  fats: { type: "number", description: "Fat in grams" },
                  ingredients: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        amount: { type: "string" },
                        calories: { type: "number" },
                        protein: { type: "number" },
                        carbs: { type: "number" },
                        fats: { type: "number" },
                      },
                      required: ["name", "calories", "protein", "carbs", "fats"],
                    },
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "How confident the estimate is",
                  },
                  if_role: {
                    type: "string",
                    enum: ["break_fast", "mid_window", "last_meal"],
                    description: "Best eating phase for this meal",
                  },
                  meal_role: {
                    type: "string",
                    enum: ["high_protein", "control", "performance", "heavy"],
                    description: "Functional role of this meal",
                  },
                  macro_profile: {
                    type: "string",
                    enum: ["high_protein", "high_fat", "balanced", "performance_carb"],
                    description: "Macro profile classification",
                  },
                  main_food_item: {
                    type: "string",
                    description: "Primary food item for USDA cross-reference",
                  },
                  meal_intensity: {
                    type: "string",
                    enum: ["light", "moderate", "heavy", "recovery"],
                    description: "How intense/heavy this meal is",
                  },
                  satiety_score: {
                    type: "number",
                    description: "Fullness rating 1-10 (10 = most filling)",
                  },
                  digestion_load: {
                    type: "string",
                    enum: ["low", "moderate", "high"],
                    description: "How hard this meal is to digest",
                  },
                  craving_replacement: {
                    type: "string",
                    description: "What craving this meal satisfies (e.g. 'sweet', 'salty', 'crunchy')",
                  },
                },
                required: [
                  "name", "calories", "protein", "carbs", "fats",
                  "ingredients", "confidence", "if_role", "meal_role", "macro_profile",
                  "main_food_item", "meal_intensity", "satiety_score", "digestion_load",
                  "craving_replacement",
                ],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "parse_meal" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No parsed data returned from AI");

    const parsed = JSON.parse(toolCall.function.arguments);

    let nutrition = {
      name: parsed.name,
      calories: Math.round(parsed.calories),
      protein: Math.round(parsed.protein * 10) / 10,
      carbs: Math.round(parsed.carbs * 10) / 10,
      fats: Math.round(parsed.fats * 10) / 10,
      ingredients: parsed.ingredients || [],
      confidence: parsed.confidence || "medium",
      if_role: parsed.if_role || "mid_window",
      meal_role: parsed.meal_role || "balanced",
      macro_profile: parsed.macro_profile || "balanced",
      source: "ai" as string,
    };

    // Cross-reference with USDA for better accuracy
    if (USDA_API_KEY && parsed.main_food_item) {
      try {
        const usdaRes = await fetch(
          `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: parsed.main_food_item,
              pageSize: 1,
              dataType: ["Foundation", "SR Legacy"],
            }),
          }
        );

        if (usdaRes.ok) {
          const usdaData = await usdaRes.json();
          const food = usdaData.foods?.[0];
          if (food) {
            const nutrients = food.foodNutrients || [];
            const get = (ids: number[]) => {
              for (const id of ids) {
                const n = nutrients.find((n: any) => n.nutrientId === id);
                if (n) return Math.round((n.value || 0) * 10) / 10;
              }
              return 0;
            };

            // Average AI + USDA for better accuracy
            nutrition = {
              ...nutrition,
              calories: Math.round((parsed.calories + get([1008, 2048])) / 2),
              protein: Math.round(((parsed.protein + get([1003])) / 2) * 10) / 10,
              carbs: Math.round(((parsed.carbs + get([1005])) / 2) * 10) / 10,
              fats: Math.round(((parsed.fats + get([1004])) / 2) * 10) / 10,
              source: "ai+usda",
            };
          }
        }
      } catch {
        // USDA cross-ref is best-effort
      }
    }

    return new Response(JSON.stringify({ nutrition }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in parse-meal-text:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Parse failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
