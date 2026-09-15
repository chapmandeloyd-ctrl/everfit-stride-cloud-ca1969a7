import { requireUser } from "../_shared/auth.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fills in the "Coach Reads Aloud" block scripts and the two per-exercise coaching
// cues for an existing workout that was saved without them.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireUser(req, corsHeaders);
    if ("response" in auth) return auth.response;

    const { workout_plan_id, overwrite = false } = await req.json();
    if (!workout_plan_id) {
      return new Response(JSON.stringify({ error: "workout_plan_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: plan, error: planErr } = await admin
      .from("workout_plans")
      .select("id, name, description")
      .eq("id", workout_plan_id)
      .single();
    if (planErr) throw planErr;

    const { data: sections, error: secErr } = await admin
      .from("workout_sections")
      .select("id, name, section_type, rounds, order_index, intro_text")
      .eq("workout_plan_id", workout_plan_id)
      .order("order_index");
    if (secErr) throw secErr;

    const { data: rows, error: exErr } = await admin
      .from("workout_plan_exercises")
      .select("id, section_id, order_index, reps, duration_seconds, rest_seconds, form_cue_start, form_cue_mid, exercises(name)")
      .eq("workout_plan_id", workout_plan_id)
      .order("order_index");
    if (exErr) throw exErr;

    const payload = (sections || []).map((s: any) => ({
      section_id: s.id,
      block_name: s.name,
      section_type: s.section_type,
      rounds: s.rounds,
      exercises: (rows || [])
        .filter((r: any) => r.section_id === s.id)
        .map((r: any) => ({
          exercise_id: r.id,
          name: r.exercises?.name || "Exercise",
          work: r.duration_seconds ? `${r.duration_seconds}s` : `${r.reps ?? 10} reps`,
          rest: `${r.rest_seconds ?? 0}s`,
        })),
    }));

    const systemPrompt = `You are an elite adult strength & conditioning coach writing the spoken coaching layer for a workout app.

AUDIENCE — STRICT: adults only (18+). Never reference teens, youth, softball, or basketball programming.

For EVERY block you write intro_text: a "Coach Reads Aloud" script of 1-2 short sentences spoken directly to the athlete before the block starts.
For EVERY exercise you write exactly two cues:
- form_cue_start: one short sentence about setup and execution
- form_cue_mid: one short sentence about quality, tempo, breathing or common mistakes

Rules for every line: second person, plain spoken coaching, under 90 characters, no numbering, no quotes, no emoji, specific to that exact movement, and the two cues must differ.`;

    const tools = [{
      type: "function",
      function: {
        name: "write_cues",
        description: "Write block coach scripts and per-exercise coaching cues",
        parameters: {
          type: "object",
          properties: {
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section_id: { type: "string" },
                  intro_text: { type: "string" },
                  exercises: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        exercise_id: { type: "string" },
                        form_cue_start: { type: "string" },
                        form_cue_mid: { type: "string" },
                      },
                      required: ["exercise_id", "form_cue_start", "form_cue_mid"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["section_id", "intro_text", "exercises"],
                additionalProperties: false,
              },
            },
          },
          required: ["sections"],
          additionalProperties: false,
        },
      },
    }];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Workout: ${plan.name}\n${plan.description || ""}\n\nBlocks and exercises (keep every id exactly as given):\n${JSON.stringify(payload)}`,
          },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "write_cues" } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: `AI error: ${text}` }), {
        status: response.status === 429 ? 429 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("AI returned no cues");
    const result = JSON.parse(call.function.arguments);

    let sectionsUpdated = 0;
    let exercisesUpdated = 0;

    for (const sec of result.sections || []) {
      const existing = (sections || []).find((s: any) => s.id === sec.section_id);
      if (!existing) continue;
      if (sec.intro_text && (overwrite || !existing.intro_text?.trim())) {
        const { error } = await admin
          .from("workout_sections")
          .update({ intro_text: sec.intro_text.trim() })
          .eq("id", sec.section_id);
        if (!error) sectionsUpdated++;
      }
      for (const ex of sec.exercises || []) {
        const row = (rows || []).find((r: any) => r.id === ex.exercise_id);
        if (!row) continue;
        if (!overwrite && row.form_cue_start?.trim() && row.form_cue_mid?.trim()) continue;
        const { error } = await admin
          .from("workout_plan_exercises")
          .update({
            form_cue_start: (ex.form_cue_start || "").trim() || row.form_cue_start,
            form_cue_mid: (ex.form_cue_mid || "").trim() || row.form_cue_mid,
          })
          .eq("id", ex.exercise_id);
        if (!error) exercisesUpdated++;
      }
    }

    return new Response(JSON.stringify({ sectionsUpdated, exercisesUpdated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
