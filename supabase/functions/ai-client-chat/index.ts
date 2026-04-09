import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { messages, client_context } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const engine = client_context?.engine_mode || "metabolic";
    const ketoType = client_context?.keto_type || "Standard";
    const protocol = client_context?.protocol_name || "your assigned protocol";
    const level = client_context?.current_level || 1;
    const firstName = client_context?.first_name || "there";

    let toneInstruction = "Be warm, supportive, and motivating.";
    if (engine === "metabolic") toneInstruction = "Be clear, structured, and clinically confident. Focus on metabolic health.";
    else if (engine === "performance") toneInstruction = "Be direct, confident, and results-driven. Focus on performance optimization.";
    else if (engine === "athletic") toneInstruction = "Be energetic, competitive, and growth-focused. Focus on athletic development.";

    const systemPrompt = `You are KSOM-360 AI — a personal coaching assistant embedded inside a professional fitness & metabolic coaching platform.
You are speaking DIRECTLY to the client (athlete/member), not to their coach.

YOUR PERSONALITY:
- You are knowledgeable, supportive, and motivating
- You speak like a trusted coach who knows their program inside and out
- Keep responses concise but impactful — no walls of text
- Use short paragraphs, bullet points when helpful
- ${toneInstruction}

CLIENT PROFILE:
- Name: ${firstName}
- Engine: ${engine.toUpperCase()}
- Level: ${level}
- Keto Type: ${ketoType}
- Protocol: ${protocol}

WHAT YOU CAN HELP WITH:
- Explain their fasting protocol and keto type
- Answer questions about their program
- Provide motivation and accountability
- Explain the science behind their plan in simple terms
- Give tips for staying on track
- Help with common challenges (hunger, energy, cravings)

STRICT RULES:
- NEVER give medical advice or diagnose conditions
- NEVER contradict their coach's assigned program
- If they ask to change their plan, tell them to speak with their coach
- Keep responses under 150 words unless they ask for detail
- Be encouraging but honest
- Reference their specific program details when relevant`;

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
          ...(messages || []),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("AI client chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
