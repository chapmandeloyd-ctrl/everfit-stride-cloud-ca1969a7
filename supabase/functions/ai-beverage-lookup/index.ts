import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, category } = await req.json();
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
            content: `You are a beverage & supplement nutrition database. Return EVERYTHING printed on the official Nutrition Facts / Supplement Facts label for ONE standard serving.

CRITICAL RULES:
1. Report EXACTLY what the label states. Do NOT compute macros from ingredients.
2. BCAA powders (Xtend, Scivation, Optimum, Mutant, etc.): label shows Calories 0, Protein 0g, Carbs 0g, Fat 0g. Free-form amino acids (L-Leucine, L-Glutamine, L-Isoleucine, L-Valine) are NOT counted as protein on US supplement labels. Always return 0/0/0/0.
3. Zero-cal energy drinks (Celsius, Bang, Monster Zero, Reign, C4): typically 0–10 cal, 0g protein, 0–2g carbs, 0g fat.
4. Diet/Zero sodas (Diet Coke, Coke Zero, Pepsi Zero): 0 cal, 0/0/0.
5. Black coffee (8 oz): ~2 cal, 0/0/0. Tea: ~2 cal, 0/0/0.
6. Standard servings: soda 12 fl oz can, energy drink 12–16 fl oz can, BCAA 1 scoop (~12.5g), coffee/tea 8 fl oz.

YOU MUST ALWAYS POPULATE these fields (use 0 or empty array when absent — NEVER omit):
- electrolytes: { sodium_mg, potassium_mg, magnesium_mg, calcium_mg } — all 4 keys, use 0 if not on label
- caffeine_mg: number, 0 if none
- sugar_g, added_sugar_g, fiber_g: numbers, 0 if not listed
- vitamins: array of {name, amount, unit, dv_pct?} — [] if none
- aminos: array of {name, amount_mg} for free-form amino acids (L-Leucine, L-Glutamine, L-Isoleucine, L-Valine, L-Citrulline, taurine if free-form, etc.) — [] if none. These do NOT count as protein.
- other: array of {name, amount, unit} for taurine, beta-alanine, glucuronolactone, electrolyte blends, etc. — [] if none

SPECIFIC EXAMPLES YOU MUST MATCH:
- Xtend BCAA Original (1 scoop ~13.5g): aminos = [{L-Leucine, 3500}, {L-Glutamine, 2500}, {L-Isoleucine, 1750}, {L-Valine, 1750}, {L-Citrulline Malate, 1000}]; electrolytes = {sodium_mg: 220, potassium_mg: 220, magnesium_mg: 0, calcium_mg: 0}; vitamins = [{B6, 0.64, mg, 50}]; other = []. Calories 0, protein 0, carbs 0, fat 0.
- Celsius Original 12oz: caffeine_mg 200; vitamins include B-vitamins + Vitamin C; other includes Taurine, Guarana, Ginger, Glucuronolactone.
- Diet Coke 12oz: caffeine_mg 46; sodium_mg 40; everything else 0/[].

If unsure of the exact brand, give the typical value for that product CATEGORY — but NEVER invent protein for a BCAA, and NEVER return empty electrolytes/vitamins/aminos arrays for known products like Xtend.`,
          },
          { role: "user", content: `Beverage: ${name.trim()}${category ? `\nCategory hint: ${category}` : ""}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_beverage_nutrition",
              description: "Return nutrition for one standard serving",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Cleaned/standardized beverage name" },
                  serving: { type: "string", description: "Serving size, e.g. '12 fl oz can'" },
                  calories: { type: "number" },
                  protein: { type: "number", description: "grams" },
                  carbs: { type: "number", description: "grams" },
                  fats: { type: "number", description: "grams" },
                  electrolytes: {
                    type: "object",
                    description: "Electrolytes in mg (use 0 if absent)",
                    properties: {
                      sodium_mg: { type: "number" },
                      potassium_mg: { type: "number" },
                      magnesium_mg: { type: "number" },
                      calcium_mg: { type: "number" },
                    },
                    required: ["sodium_mg", "potassium_mg", "magnesium_mg", "calcium_mg"],
                  },
                  caffeine_mg: { type: "number", description: "0 if none" },
                  sugar_g: { type: "number" },
                  added_sugar_g: { type: "number" },
                  fiber_g: { type: "number" },
                  vitamins: {
                    type: "array",
                    description: "Vitamins on label",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        amount: { type: "number" },
                        unit: { type: "string", description: "mg, mcg, IU" },
                        dv_pct: { type: "number", description: "% Daily Value, optional" },
                      },
                      required: ["name", "amount", "unit"],
                    },
                  },
                  aminos: {
                    type: "array",
                    description: "Free-form amino acids in mg (BCAAs, etc.)",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "e.g. L-Leucine" },
                        amount_mg: { type: "number" },
                      },
                      required: ["name", "amount_mg"],
                    },
                  },
                  other: {
                    type: "array",
                    description: "Other notable ingredients (taurine, beta-alanine, etc.)",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        amount: { type: "number" },
                        unit: { type: "string" },
                      },
                      required: ["name", "amount", "unit"],
                    },
                  },
                },
                 required: ["name", "serving", "calories", "protein", "carbs", "fats", "electrolytes", "caffeine_mg", "sugar_g", "added_sugar_g", "fiber_g", "vitamins", "aminos", "other"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_beverage_nutrition" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI lookup failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No nutrition returned");
    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ nutrition: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-beverage-lookup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Lookup failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});