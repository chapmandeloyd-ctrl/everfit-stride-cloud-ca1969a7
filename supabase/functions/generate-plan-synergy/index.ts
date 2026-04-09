import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { protocol_type, protocol_id, keto_type_id } = await req.json();

    if (!protocol_id || !keto_type_id) {
      return new Response(JSON.stringify({ error: "protocol_id and keto_type_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pType = protocol_type || "quick_plan";

    // Check cache first
    const { data: cached } = await supabase
      .from("plan_synergy_content")
      .select("*")
      .eq("protocol_type", pType)
      .eq("protocol_id", protocol_id)
      .eq("keto_type_id", keto_type_id)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ synergy: cached }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch protocol + keto type data in parallel
    const [protocolResult, ketoResult] = await Promise.all([
      pType === "program"
        ? supabase.from("fasting_protocols").select("*").eq("id", protocol_id).maybeSingle()
        : supabase.from("quick_fasting_plans").select("*").eq("id", protocol_id).maybeSingle(),
      supabase.from("keto_types").select("*").eq("id", keto_type_id).maybeSingle(),
    ]);

    const protocolData = protocolResult.data;
    const ketoType = ketoResult.data;

    if (!protocolData) {
      return new Response(JSON.stringify({ error: "Protocol not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ketoType) {
      return new Response(JSON.stringify({ error: "Keto type not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fastHours = pType === "program" ? protocolData.fast_target_hours : protocolData.fast_hours;
    const protocolName = protocolData.name as string;
    const ketoTypeName = ketoType.name as string;
    const ketoAbbrev = ketoType.abbreviation as string;
    const durationDays = pType === "program" ? protocolData.duration_days : null;

    const prompt = `You are a metabolic performance coach for KSOM-360. Output ONLY valid JSON. No markdown, no code fences.

CLIENT PROTOCOL:
- Protocol: ${protocolName}
- Fast Window: ${fastHours}h
- Duration: ${durationDays ? `${durationDays} days` : "Ongoing"}
- Category: ${protocolData.category || "general"}
- Description: ${protocolData.description || "N/A"}

KETO TYPE:
- Name: ${ketoTypeName} (${ketoAbbrev})
- Fat: ${ketoType.fat_pct}% | Protein: ${ketoType.protein_pct}% | Carbs: ${ketoType.carbs_pct}%
- Carb Limit: ${ketoType.carb_limit_grams || "N/A"}g
- How It Works: ${ketoType.how_it_works || "N/A"}
- Built For: ${(ketoType.built_for || []).join(", ")}

Generate a JSON object with these exact keys. This must be LONG-FORM, detailed, professional content. Treat the fasting protocol and keto type as ONE unified metabolic system — not separate things.

{
  "keto_synergy": "4–6 sentences. Explain how ${fastHours}h fasting + ${ketoAbbrev} macro split work together as ONE metabolic system. Cover glycogen depletion, ketone production, fat oxidation, and how the keto type locks in the metabolic state post-fast. Make the reader understand this is a complete system, not two separate strategies.",

  "how_it_works": "5–8 sentences. Deep physiology. Cover: glycogen depletion timeline during ${fastHours}h fast, when ketone production activates, the role of ${ketoType.protein_pct}% protein in muscle preservation, how ${ketoType.fat_pct}% fat fuels sustained ketosis, why ${ketoType.carbs_pct}% carbs keeps insulin suppressed, and how this creates a continuous fat-burning loop between fasting and eating windows.",

  "the_science": "4–6 sentences. Credibility layer. Reference muscle protein synthesis (MPS), diet-induced thermogenesis (TEF), hormonal responses (growth hormone, insulin, glucagon), and how this specific pairing optimizes body recomposition. Include specific protein targets like 1.6–2.2g per kg of lean body mass if relevant to ${ketoAbbrev}. Make it sound research-backed but accessible.",

  "adaptation_timeline": [
    {"phase": 1, "title": "Baseline Build", "period": "Weeks 1–2", "detail": "2–3 sentences. What happens metabolically in the first two weeks. Keto adaptation, initial water loss, energy fluctuations, establishing protein targets."},
    {"phase": 2, "title": "MPS Response", "period": "Weeks 3–4", "detail": "2–3 sentences. Recovery improvements, muscle soreness reduction, strength maintenance, metabolic efficiency increasing."},
    {"phase": 3, "title": "Body Recomposition", "period": "Weeks 5–8", "detail": "2–3 sentences. Visible fat loss while muscle preserved, the hallmark of successful ${ketoAbbrev} execution. Energy stabilization."},
    {"phase": 4, "title": "Optimized State", "period": "Week 9+", "detail": "2–3 sentences. Full adaptation. Describe the end state — what the client looks and feels like when this system is fully working."}
  ],

  "built_for": ["Who this combo is ideal for — 4 bullet points, each 8–15 words. Be specific to ${ketoAbbrev} + ${fastHours}h fasting."],

  "coach_notes": [
    "5 numbered coaching tips. Each 10–20 words. Tactical, direct, actionable advice specific to executing ${ketoAbbrev} with ${fastHours}h fasting."
  ],

  "eat_this": ["6 specific foods/food groups that work best with ${ketoAbbrev}. Include preparation notes where relevant."],

  "avoid_this": ["5 specific foods/habits to avoid on ${ketoAbbrev}. Explain WHY briefly."],

  "coach_warning": "One bold, direct warning. 15–25 words. Specific to this combo."
}

RULES:
- This is a PERFORMANCE SYSTEM, not an article.
- Sound like a coach giving directions, not a textbook.
- Each section must stand alone as a complete block.
- No filler words. Every sentence must add value.
- The adaptation_timeline details should be 2–3 full sentences each, not bullet fragments.
- eat_this and avoid_this entries should be specific and actionable.
- coach_notes should be numbered tactical instructions.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You output valid JSON only. No markdown. No explanation. No code fences. Generate detailed, long-form coaching content." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      throw new Error(`AI gateway returned ${status}`);
    }

    const aiData = await aiResponse.json();
    let rawContent = aiData.choices?.[0]?.message?.content?.trim() || "";

    // Strip markdown code fences if present
    rawContent = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let structured: Record<string, unknown>;
    try {
      structured = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse AI JSON:", rawContent);
      throw new Error("AI returned invalid JSON");
    }

    const synergyText = JSON.stringify(structured);

    const { data: inserted, error: insertError } = await supabase
      .from("plan_synergy_content")
      .upsert({
        protocol_type: pType,
        protocol_id,
        keto_type_id,
        protocol_name: protocolName,
        keto_type_name: ketoTypeName,
        synergy_text: synergyText,
      }, { onConflict: "protocol_type,protocol_id,keto_type_id" })
      .select()
      .single();

    if (insertError) {
      console.error("Cache insert error:", insertError);
      return new Response(JSON.stringify({
        synergy: {
          protocol_name: protocolName,
          keto_type_name: ketoTypeName,
          synergy_text: synergyText,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ synergy: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-plan-synergy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
