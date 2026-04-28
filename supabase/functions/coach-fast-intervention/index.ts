import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * coach-fast-intervention
 *
 * Returns a short, personalized coach line for a user who is about to end
 * their fast early. The frontend already shows static suggestions instantly;
 * this AI line fades in on top once it's ready (hybrid pattern).
 *
 * Input:
 *   {
 *     elapsedHours: number,
 *     targetHours: number,
 *     stageLabel?: string,        // e.g. "Catabolic", "Fat Burning"
 *     hadCaffeineToday?: boolean,
 *     waterOzToday?: number,
 *     localTimeOfDay?: string,    // "morning" | "afternoon" | "evening" | "night"
 *   }
 *
 * Output: { line: string }       (1-2 short sentences, second person, no preamble)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      elapsedHours = 0,
      targetHours = 16,
      stageLabel,
      hadCaffeineToday,
      waterOzToday,
      localTimeOfDay,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const elapsedH = Math.max(0, Math.round(elapsedHours * 10) / 10);
    const remainingH = Math.max(0, Math.round((targetHours - elapsedH) * 10) / 10);

    const context: string[] = [];
    context.push(`Elapsed: ${elapsedH}h of ${targetHours}h target (${remainingH}h left).`);
    if (stageLabel) context.push(`Current fasting stage: ${stageLabel}.`);
    if (typeof hadCaffeineToday === "boolean") {
      context.push(hadCaffeineToday ? "Has logged caffeine today." : "Has NOT logged any caffeine today.");
    }
    if (typeof waterOzToday === "number") {
      context.push(`Water today: ${Math.round(waterOzToday)} oz.`);
    }
    if (localTimeOfDay) context.push(`Time of day: ${localTimeOfDay}.`);

    const systemPrompt = `You are a calm, expert fasting coach inside KSOM-360.
The user is about to end their fast early. Speak in second person ("you"),
warm but direct. Do NOT lecture, judge, or use exclamation points.
Name the most likely cause of the urge in plain English (food noise, glucose dip,
social trigger, boredom, real hunger), referencing their context if useful.
Keep it ONE short sentence, max 22 words. No preamble. No emojis. No quotes.`;

    const userPrompt = `Context:\n${context.join("\n")}\n\nWrite the single coach line.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
        }),
      },
    );

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limited" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!response.ok) {
      const txt = await response.text();
      console.error("AI gateway error", response.status, txt);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const line: string = (data?.choices?.[0]?.message?.content ?? "").toString().trim().replace(/^["']|["']$/g, "");

    return new Response(
      JSON.stringify({ line }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("coach-fast-intervention error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});