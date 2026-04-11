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
    const { client_name, onboarding_answers, profile_data } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an AI coaching assistant for the KSOM-360 professional fitness platform.

Generate a concise coaching brief for a trainer about their new client. This is an internal document — NOT client-facing.

CLIENT: ${client_name || "New Client"}

CLIENT PROGRAM:
- Keto Type: ${profile_data?.keto_type || "Not assigned"}
- Fasting Protocol: ${profile_data?.fasting_protocol || (profile_data?.fasting_enabled ? "Enabled (no protocol set)" : "Not enabled")}
- Subscription Tier: ${profile_data?.tier || "starter"}
${profile_data?.sport_profile ? `- Sport: ${profile_data.sport_profile.sport || "N/A"} | Position: ${profile_data.sport_profile.position || "N/A"} | Team: ${profile_data.sport_profile.team_name || "N/A"}` : ""}

ONBOARDING ANSWERS:
${JSON.stringify(onboarding_answers || {}, null, 2)}

PROFILE DATA:
${JSON.stringify(profile_data || {}, null, 2)}

Generate a structured coaching brief with:

📋 CLIENT SNAPSHOT
- Quick summary of who this client is and their primary goal (2-3 sentences)

🎯 KEY PRIORITIES
- 3-4 bullet points of the most important things the coach should focus on

⚠️ WATCH POINTS
- 1-3 potential concerns or things to monitor (injuries, experience level, time constraints)

💡 RECOMMENDED STARTING APPROACH
- Suggested training frequency
- Suggested intensity level
- Keto/fasting-specific recommendations if applicable (e.g., keto adaptation phase, fasting ramp-up)

🗒️ NOTES FOR COACH
- Any additional context that would help the coach personalize the experience

Keep it professional, data-driven, and actionable. Use a supportive, health-focused tone.`;

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
          { role: "user", content: "Generate the coaching brief based on the client data provided." },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
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

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ summary: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI onboarding summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
