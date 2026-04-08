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

    // Fetch protocol data
    let protocolData: Record<string, unknown> | null = null;
    if (pType === "program") {
      const { data } = await supabase
        .from("fasting_protocols")
        .select("*")
        .eq("id", protocol_id)
        .maybeSingle();
      protocolData = data;
    } else {
      const { data } = await supabase
        .from("quick_fasting_plans")
        .select("*")
        .eq("id", protocol_id)
        .maybeSingle();
      protocolData = data;
    }

    if (!protocolData) {
      return new Response(JSON.stringify({ error: "Protocol not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch keto type data
    const { data: ketoType } = await supabase
      .from("keto_types")
      .select("*")
      .eq("id", keto_type_id)
      .maybeSingle();

    if (!ketoType) {
      return new Response(JSON.stringify({ error: "Keto type not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context for AI
    const fastHours = pType === "program"
      ? protocolData.fast_target_hours
      : protocolData.fast_hours;

    const protocolName = protocolData.name as string;
    const ketoTypeName = ketoType.name as string;
    const ketoAbbrev = ketoType.abbreviation as string;

    const prompt = `You are a metabolic science expert writing for a premium health coaching platform called KSOM-360.

A client has been assigned a combined fasting + nutrition plan. Generate a compelling, scientifically-grounded synergy description that explains WHY this specific pairing works together metabolically.

FASTING PROTOCOL:
- Name: ${protocolName}
- Fasting Window: ${fastHours} hours
- Type: ${pType === "program" ? `Multi-week program (${protocolData.duration_days} days)` : "Quick fasting plan"}
- Category: ${protocolData.category || "general"}
- Description: ${protocolData.description || "N/A"}

KETO TYPE:
- Name: ${ketoTypeName} (${ketoAbbrev})
- Fat: ${ketoType.fat_pct}% | Protein: ${ketoType.protein_pct}% | Carbs: ${ketoType.carbs_pct}%
- Carb Limit: ${ketoType.carb_limit_grams || "N/A"}g
- How It Works: ${ketoType.how_it_works || "N/A"}
- Built For: ${(ketoType.built_for || []).join(", ")}

INSTRUCTIONS:
1. Write 3-4 sentences explaining the metabolic synergy between this specific fasting window and this specific keto type.
2. Reference real metabolic processes (glycogen depletion, ketone production, fat oxidation, autophagy, etc.) relevant to the fasting duration.
3. Explain how the keto type's macro ratio complements and extends the benefits of the fast.
4. End with a motivating statement about the KSOM Metabolic System.
5. Do NOT use bullet points — write flowing, compelling prose.
6. Do NOT start with "Your" — vary your opening.
7. Keep it under 80 words. Make every word count.
8. Sound authoritative but accessible — like a world-class metabolic coach.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a metabolic science writer for a premium coaching platform. Write concise, compelling, scientifically-accurate content." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      throw new Error(`AI gateway returned ${status}`);
    }

    const aiData = await aiResponse.json();
    const synergyText = aiData.choices?.[0]?.message?.content?.trim() || "";

    if (!synergyText) {
      throw new Error("AI returned empty synergy text");
    }

    // Cache it
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
      // Still return the text even if caching fails
      return new Response(JSON.stringify({
        synergy: {
          protocol_name: protocolName,
          keto_type_name: ketoTypeName,
          synergy_text: synergyText,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
