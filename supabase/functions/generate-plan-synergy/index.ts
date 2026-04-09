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

Generate a JSON object with these exact keys:

{
  "keto_synergy": "2-3 sentences. Direct. How ${fastHours}h fasting + ${ketoAbbrev} macro split work together metabolically. No fluff.",
  "benefits": ["Fat loss benefit", "Muscle retention benefit", "Energy benefit", "Recovery benefit"],
  "execution": ["Protein target instruction", "Meal timing instruction", "Fasting behavior instruction", "One more tactical tip"],
  "timeline": [
    {"period": "Week 1–2", "detail": "What happens metabolically"},
    {"period": "Week 3–4", "detail": "What shifts"},
    {"period": "Week 5+", "detail": "Expected adaptation"}
  ],
  "coach_warning": "One bold, direct warning. Example: Too much fat will slow results on this plan."
}

RULES:
- No paragraphs. Short, punchy lines.
- No AI tone. Sound like a coach giving orders.
- Benefits and execution: max 8 words per bullet.
- Timeline details: max 12 words each.
- Coach warning: max 15 words.
- Must be scannable in 5 seconds.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You output valid JSON only. No markdown. No explanation. No code fences." },
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

    // Store the structured JSON as the synergy_text field (stringified)
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
