import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { meal_name, calories, protein, fats, carbs, keto_types, meal_role, source, ingredients_text } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Step 1: Run local validation checks
    const flags: string[] = [];
    const hasMacros = protein != null && fats != null && carbs != null && calories != null;

    if (!hasMacros) {
      if (protein == null) flags.push("missing_protein");
      if (fats == null) flags.push("missing_fat");
      if (carbs == null) flags.push("missing_carbs");
      if (calories == null) flags.push("missing_calories");
    }

    const expectedCal = hasMacros ? Math.round((protein * 4) + (fats * 9) + (carbs * 4)) : 0;
    if (hasMacros && Math.abs(calories - expectedCal) > calories * 0.10) {
      flags.push("calorie_mismatch");
    }

    if (protein > 150) flags.push("protein_excessive");
    if (fats > 120) flags.push("fat_excessive");

    const ketoArr = keto_types || [];
    if (ketoArr.includes("SKD") && carbs > 10) flags.push("keto_violation_skd");
    if (ketoArr.includes("HPKD") && carbs > 20) flags.push("keto_violation_hpkd");

    // If no flags, return as-is (no correction needed)
    if (flags.length === 0) {
      return new Response(JSON.stringify({
        needs_correction: false,
        original: { calories, protein, fats, carbs },
        corrected: { calories, protein, fats, carbs },
        flags: [],
        suggestion: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Call AI for intelligent correction
    const systemPrompt = `You are a keto nutrition expert for the KSOM360 system. Your job is to correct meal macro data.

Rules:
- Calories MUST equal (protein × 4) + (fat × 9) + (carbs × 4) within 5%
- For SKD keto: carbs must be ≤ 10g
- For HPKD keto: carbs must be ≤ 20g
- Protein should not exceed 150g per serving
- Fat should not exceed 120g per serving
- If fat is missing, estimate it from the meal name and ingredients
- If calories mismatch, recalculate from macros
- Provide exactly ONE short coaching tip (under 15 words)

You MUST respond using the correct_macros tool.`;

    const userPrompt = `Correct this meal:
Name: ${meal_name || "Unknown"}
Source: ${source || "manual"}
Current macros: ${calories || "?"} cal, ${protein || "?"}g protein, ${fats ?? "MISSING"}g fat, ${carbs || "?"}g carbs
Keto types: ${ketoArr.join(", ") || "none"}
Meal role: ${meal_role || "unknown"}
Ingredients: ${ingredients_text || "not provided"}
Issues found: ${flags.join(", ")}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "correct_macros",
            description: "Return corrected macro values and a coaching suggestion",
            parameters: {
              type: "object",
              properties: {
                corrected_calories: { type: "number", description: "Corrected calorie value" },
                corrected_protein: { type: "number", description: "Corrected protein in grams" },
                corrected_fats: { type: "number", description: "Corrected fat in grams" },
                corrected_carbs: { type: "number", description: "Corrected carbs in grams" },
                suggestion: { type: "string", description: "One short coaching tip under 15 words" },
              },
              required: ["corrected_calories", "corrected_protein", "corrected_fats", "corrected_carbs", "suggestion"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "correct_macros" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      // Fallback: return formula-based correction
      return new Response(JSON.stringify({
        needs_correction: true,
        original: { calories, protein, fats, carbs },
        corrected: {
          calories: expectedCal || calories,
          protein: protein || 0,
          fats: fats || 0,
          carbs: carbs || 0,
        },
        flags,
        suggestion: "Review and adjust macros manually for accuracy.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    let corrected = { calories: expectedCal, protein: protein || 0, fats: fats || 0, carbs: carbs || 0 };
    let suggestion = "Review your macros for accuracy.";

    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const args = JSON.parse(toolCall.function.arguments);
        corrected = {
          calories: args.corrected_calories,
          protein: args.corrected_protein,
          fats: args.corrected_fats,
          carbs: args.corrected_carbs,
        };
        suggestion = args.suggestion || suggestion;
      }
    } catch (e) {
      console.error("Failed to parse AI correction:", e);
    }

    return new Response(JSON.stringify({
      needs_correction: true,
      original: { calories, protein, fats, carbs },
      corrected,
      flags,
      suggestion,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("macro-correction error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
