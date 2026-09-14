import { requireUser } from "../_shared/auth.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await requireUser(req, corsHeaders);
    if ("response" in auth) return auth.response;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const blockLabel = typeof body.blockLabel === "string" ? body.blockLabel.slice(0, 120) : "";
    const exercises: string[] = Array.isArray(body.exercises)
      ? body.exercises.filter((e: unknown) => typeof e === "string").slice(0, 12)
      : [];

    if (!blockLabel) {
      return new Response(JSON.stringify({ error: "blockLabel is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Write a short spoken coaching intro (1-2 sentences, max 35 words) that a workout coach reads aloud at the start of a "${blockLabel}" block.${
      exercises.length ? ` The exercises in this block are: ${exercises.join(", ")}.` : ""
    } Energetic, natural, second person. Return only the sentence, no quotes.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error(`AI gateway failed [${res.status}]: ${details}`);
      return new Response(JSON.stringify({ error: "AI request failed", status: res.status, details }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await res.json();
    const text: string = (json?.choices?.[0]?.message?.content ?? "").trim().replace(/^["']|["']$/g, "");

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-coach-script error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
