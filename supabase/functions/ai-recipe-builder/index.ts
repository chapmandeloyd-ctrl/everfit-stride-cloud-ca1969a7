import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const mealMetadataProperties = {
  name: { type: "string", description: "Recipe name" },
  description: { type: "string", description: "Brief description (1-2 sentences)" },
  instructions: { type: "string", description: "Step-by-step cooking instructions" },
  ingredients: { type: "string", description: "List of ingredients with quantities, one per line" },
  calories: { type: "number", description: "Total calories per serving" },
  protein: { type: "number", description: "Protein in grams per serving" },
  carbs: { type: "number", description: "Carbs in grams per serving" },
  fats: { type: "number", description: "Fat in grams per serving" },
  prep_time_minutes: { type: "number", description: "Prep time in minutes" },
  cook_time_minutes: { type: "number", description: "Cook time in minutes" },
  servings: { type: "number", description: "Number of servings" },
  tags: {
    type: "array",
    items: { type: "string" },
    description: "Relevant tags like dietary style, meal type, etc.",
  },
  if_roles: {
    type: "array",
    items: { type: "string", enum: ["break_fast", "mid_window", "last_meal"] },
    description: "Which eating-window roles this meal fits (e.g. break_fast, mid_window, last_meal)",
  },
  meal_role: { type: "string", description: "Primary meal role label e.g. break_fast_safe" },
  subtype: { type: "string", description: "Meal subtype e.g. high_protein_control" },
  keto_types: {
    type: "array",
    items: { type: "string", enum: ["SKD", "TKD", "HPKD", "CKD"] },
    description: "Which keto protocols this supports (SKD, TKD, HPKD, CKD)",
  },
  trigger_conditions: {
    type: "array",
    items: { type: "string" },
    description: "When this meal is best triggered e.g. post_fast, high_hunger, muscle_preservation",
  },
  carb_limit_note: { type: "string", description: "Coaching note about carb impact on ketosis" },
  protein_target_note: { type: "string", description: "Coaching note about protein benefit" },
  why_it_works: { type: "string", description: "Explanation of why this meal is effective for its purpose" },
  best_for: {
    type: "array",
    items: { type: "string" },
    description: "List of ideal use cases e.g. Breaking a fast safely, Post-workout recovery",
  },
  avoid_if: {
    type: "array",
    items: { type: "string" },
    description: "Situations where this meal should be avoided e.g. Low appetite, Beginner phase",
  },
  meal_timing: { type: "string", description: "Timing guidance e.g. Best used as first meal after fasting window" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, text, bulk } = await req.json();

    if (!url && !text) {
      return new Response(
        JSON.stringify({ error: "Provide a URL or text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let content = text || "";

    if (url) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; RecipeBot/1.0)",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
        const html = await res.text();
        content = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 15000);
      } catch (fetchErr) {
        console.error("URL fetch error:", fetchErr);
        return new Response(
          JSON.stringify({ error: `Could not fetch URL: ${(fetchErr as Error).message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemBase = `You are a recipe extraction assistant. Given text content, extract recipe information including all meal metadata fields like IF roles, keto types, trigger conditions, coaching notes, best-for scenarios, avoid-if warnings, and meal timing. Estimate any missing macro values based on the ingredients. If servings is not specified, default to 1. For keto/IF metadata, infer reasonable values from ingredients and macros if not explicitly stated.`;

    if (bulk) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemBase + " Extract ALL individual recipes found in the text." },
            { role: "user", content: `Extract ALL recipes from this content:\n\n${content.slice(0, 50000)}` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_recipes",
                description: "Extract all recipes found in the text with full meal metadata",
                parameters: {
                  type: "object",
                  properties: {
                    recipes: {
                      type: "array",
                      description: "Array of all recipes found",
                      items: {
                        type: "object",
                        properties: mealMetadataProperties,
                        required: ["name", "calories", "protein", "carbs", "fats"],
                      },
                    },
                  },
                  required: ["recipes"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "extract_recipes" } },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errText = await response.text();
        console.error("AI gateway error:", response.status, errText);
        throw new Error("AI processing failed");
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) throw new Error("AI did not return recipe data");
      const parsed = JSON.parse(toolCall.function.arguments);

      return new Response(JSON.stringify({ success: true, recipes: parsed.recipes || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single recipe mode
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemBase + " If the text contains multiple recipes, extract only the first/main one." },
          { role: "user", content: `Extract the recipe from this content:\n\n${content}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_recipe",
              description: "Extract structured recipe data with full meal metadata",
              parameters: {
                type: "object",
                properties: mealMetadataProperties,
                required: ["name", "calories", "protein", "carbs", "fats"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_recipe" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI processing failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("AI did not return recipe data");
    const recipe = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, recipe }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-recipe-builder error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
