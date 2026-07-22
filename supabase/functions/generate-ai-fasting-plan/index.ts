import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PROTOCOL_CATALOG = [
  { id: "9a3564ef-e0f1-4a99-91a8-a012f16ae67a", name: "16:8 Daily", fast_hours: 16, difficulty: "beginner" },
  { id: "c4c6ca76-8666-4c27-bc4a-fab402880561", name: "16:8 Weekdays", fast_hours: 16, difficulty: "beginner" },
  { id: "9c4cf186-3c67-4063-a550-736a590d20a7", name: "18:6 Daily", fast_hours: 18, difficulty: "moderate" },
  { id: "934791fa-4ae0-49a1-b01e-fe46f5ccf952", name: "20:4 Warrior", fast_hours: 20, difficulty: "advanced" },
  { id: "0a0ae445-c6d8-4a7f-88a7-85fe4441d5c3", name: "OMAD", fast_hours: 23, difficulty: "advanced" },
  { id: "5f26b008-4626-47ad-8556-4d86bafe57c8", name: "5:2", fast_hours: 24, difficulty: "moderate" },
  { id: "af2978c2-bde1-4518-bc22-984caa42b6cc", name: "4:3", fast_hours: 24, difficulty: "advanced" },
];

const FUEL_STYLES = ["Balance", "Performance", "Lean", "Recomp", "Extreme"];

const SYSTEM_PROMPT = `You are Apex360 AI — the personal fasting & fuel coach for Apex360-IF.
You are designing a personalized intermittent-fasting plan for one client based on their onboarding answers.

HARD RULES:
- The eating window MUST start at or after the client's wake time + a reasonable buffer. NEVER suggest a 12 PM break-fast for someone who wakes at 6 PM.
- If ANY medical safety flag is present (diabetes, pregnancy, eating disorder history, medication concerns), restrict protocol choice to 14:10 or 16:8 only. Never suggest OMAD, 20:4, 4:3, or extended fasts.
- Honor the client's stated fuel preference exactly. If they picked "Balance", do not recommend "Extreme".
- Beginner (never fasted) → start with 14:10 or 16:8. Never OMAD or extended.
- Weekend-different clients → suggest a lighter weekend rhythm.
- Training days → schedule the eating window so their biggest meal falls within 2 hours of training.
- Speak to the client directly in "you" language. Cite THEIR answers in the reasoning bullets.

GOAL AGGRESSIVENESS (drive fuel + protocol picks from this):
- Compute weight-loss target as (weightKg - goalWeightKg) / weightKg * 100.
- If >= 12% AND user has NO safety flags AND is not primarily performance-driven: pick "Lean" or "Extreme" fuel. Extreme only for 4–6 weeks then step back to Lean — say this in expectations.
- If 5–12%: pick "Lean" (fat-loss default).
- If < 5% or maintenance: pick "Balance" or "Recomp".
- Never recommend "Extreme" for athletes, performance goals, or clients with safety flags.

FAST TYPE / PROTOCOL SELECTION:
- Match protocol difficulty to fastingExperience.experienceLevel:
  * "none" → 16:8 Daily or 16:8 Weekdays only.
  * "occasional" → up to 18:6 Daily.
  * "regular" → up to 20:4 Warrior or 5:2.
  * "advanced" with longestFastHours >= 24 AND tolerance != "challenging" → OMAD / 4:3 acceptable.
- If tolerance = "challenging", drop one difficulty tier.
- Align window with dailyRhythm.wakeTime + training window when provided.

REASONING BULLETS must reference at least: (1) their goal weight or activity, (2) their fasting experience, (3) their daily rhythm. Never generic advice.

Return ONLY valid JSON matching this schema (no prose, no code fences):
{
  "protocol_id": "<uuid from PROTOCOL_CATALOG>",
  "protocol_name": "<matching name>",
  "fast_hours": <number>,
  "eat_hours": <number>,
  "fuel_style": "<one of: Balance | Performance | Lean | Recomp | Extreme>",
  "window_start_time": "HH:MM",  // when the eating window opens (break-fast time), 24h
  "window_end_time": "HH:MM",    // when the eating window closes (last meal), 24h
  "duration_days": <14 | 21 | 28>,
  "weekly_pattern": "daily" | "weekdays_only" | "weekend_lighter",
  "reasoning": [
    "4-6 short bullets. Each MUST cite something specific the client told us."
  ],
  "expectations": [
    "3-5 short bullets about what to expect in week 1 (energy, hunger, tips)."
  ],
  "schedule_breakdown": [
    { "time": "HH:MM", "label": "Break-fast", "note": "..." },
    { "time": "HH:MM", "label": "Snack",      "note": "..." },
    { "time": "HH:MM", "label": "Last meal",  "note": "..." },
    { "time": "HH:MM", "label": "Fast starts","note": "..." }
  ]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const body = await req.json();
    const { client_id, onboarding, regenerate_reason, preview } = body ?? {};
    const isPreview = preview === true || !client_id;
    if (!onboarding) {
      return new Response(JSON.stringify({ error: "onboarding required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `CLIENT ONBOARDING DATA:
${JSON.stringify(onboarding, null, 2)}

AVAILABLE PROTOCOLS (pick the best-fit protocol_id from this list):
${JSON.stringify(PROTOCOL_CATALOG, null, 2)}

FUEL STYLES: ${FUEL_STYLES.join(", ")}

${regenerate_reason ? `THE CLIENT ASKED TO REGENERATE. What they want changed:\n"${regenerate_reason}"\n\nRespect this in your new proposal.` : ""}

Design their plan now. Return ONLY the JSON object.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI gateway ${aiRes.status}`, detail: errText }), {
        status: aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

    let plan;
    try { plan = JSON.parse(content); }
    catch { throw new Error("AI returned invalid JSON"); }

    // Persist the proposal (service role bypasses RLS but we still pass client_id)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let proposalId: string | null = null;
    if (!isPreview) {
      const { data: inserted, error: insertErr } = await supabase
        .from("ai_plan_proposals")
        .insert({
          client_id,
          status: "proposed",
          onboarding_snapshot: onboarding,
          plan,
          reasoning: plan.reasoning ?? [],
          expectations: plan.expectations ?? [],
          schedule_breakdown: plan.schedule_breakdown ?? [],
          model: "google/gemini-3-flash-preview",
          regenerate_reason: regenerate_reason ?? null,
        })
        .select("id")
        .single();
      if (insertErr) console.error("Proposal insert error", insertErr);
      proposalId = inserted?.id ?? null;
    }

    return new Response(JSON.stringify({ proposal_id: proposalId, plan }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});