import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const lovableTts = async (text: string) => {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return null;
    const r = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: text,
        voice: "alloy",
        response_format: "mp3",
      }),
    });
    if (!r.ok) {
      console.error("Lovable TTS fallback failed:", r.status, await r.text().catch(() => ""));
      return null;
    }
    return await r.arrayBuffer();
  };

  try {
    const { text, voiceId: requestedVoiceId } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!text) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioHeaders = {
      ...corsHeaders,
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=3600",
    };

    if (!ELEVENLABS_API_KEY) {
      const fallback = await lovableTts(text);
      if (fallback) return new Response(fallback, { headers: audioHeaders });
      return new Response(JSON.stringify({ error: "No TTS provider configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default to Jessica if no voiceId provided
    const voiceId = requestedVoiceId || "cgSgspJ2msm6clMCkdW9";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.7,
            similarity_boost: 0.85,
            style: 0.4,
            use_speaker_boost: true,
            speed: 1.05,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("ElevenLabs error:", err);
      const fallback = await lovableTts(text);
      if (fallback) return new Response(fallback, { headers: audioHeaders });
      return new Response(JSON.stringify({ error: "ElevenLabs request failed", detail: err }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, { headers: audioHeaders });
  } catch (err) {
    console.error("TTS error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
