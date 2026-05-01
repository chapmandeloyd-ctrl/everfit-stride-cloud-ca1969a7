import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name } = await req.json();
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
            content: "You are a beverage & supplement nutrition database. Given a name (often a brand like 'Zero Pepsi', 'Celsius Peach Vibe', 'Xtend BCAA Mango', 'Scivation Xtend'), return nutrition for ONE standard serving (soda: 12 fl oz can; energy drink: 12-16 fl oz can; BCAA powder: 1 scoop ~12.5g; black coffee: 8 fl oz; tea: 8 fl oz). Use widely-known Supplement Facts / Nutrition Facts label data. IMPORTANT: BCAAs and most zero-calorie drinks have 0 calories, 0 protein, 0 carbs, 0 fat on the label even though amino acids technically contain nitrogen — report what the label says (usually all zeros for Xtend, Scivation, Celsius, Diet Coke, etc.). Do NOT count BCAA amino acid mg as protein grams. If the brand is unknown, give a typical estimate for the category.",
          },
          { role: "user", content: `Beverage: ${name.trim()}` },
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
                },
                required: ["name", "serving", "calories", "protein", "carbs", "fats"],
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