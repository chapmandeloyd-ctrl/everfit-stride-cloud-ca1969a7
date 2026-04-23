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
    const { mode, prompt, exercise_names, category, difficulty, workouts, weeks, days_per_week, progression, rest_strategy, fixed_pattern } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (mode !== "explain_workout" && mode !== "build_program" && (!exercise_names || exercise_names.length === 0)) {
      return new Response(
        JSON.stringify({ error: "exercise_names is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const exerciseList = (exercise_names || []).join(", ");

    let systemPrompt: string;
    let tools: any[] | undefined;
    let toolChoice: any | undefined;
    let modelOverride: string | undefined;
    let userMessage = prompt;

    if (mode === "explain_workout") {
      // Lightweight reasoning summary — uses gpt-5-mini for speed/cost
      modelOverride = "openai/gpt-5-mini";
      systemPrompt = `You are an expert fitness coach explaining workout design choices to another trainer.

Given a workout the AI just built, explain in 3-5 short bullet points WHY these exercises and groupings make sense together.
Focus on:
- Movement balance (push/pull, upper/lower, anterior/posterior)
- Energy system progression (warm-up → strength → conditioning → cooldown)
- Why specific supersets or circuits were paired
- Recovery and sequencing logic

Keep it tight — under 120 words total. Use plain language, no fluff. Format as markdown bullets.`;
      // The frontend passes the workout JSON as the prompt for explanation mode
      userMessage = `Explain the design of this workout:\n\n${prompt}`;
    } else if (mode === "suggest_exercise") {
      systemPrompt = `You are an expert fitness coach building workouts. The trainer wants exercise suggestions.

Available exercises in their library: ${exerciseList}

RULES:
- ONLY suggest exercises from the list above
- Match the name EXACTLY as written
- Consider the workout context when suggesting
- Suggest 3-5 exercises`;

      tools = [{
        type: "function",
        function: {
          name: "suggest_exercises",
          description: "Suggest exercises from the trainer's library",
          parameters: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    exercise_name: { type: "string", description: "Exact name from the exercise library" },
                    sets: { type: "number" },
                    reps_or_time: { type: "string", description: "e.g. '12' or '30 sec'" },
                    rest_seconds: { type: "number" },
                    reason: { type: "string", description: "Brief reason for this suggestion" },
                  },
                  required: ["exercise_name", "sets", "reps_or_time", "rest_seconds", "reason"],
                  additionalProperties: false,
                },
              },
            },
            required: ["suggestions"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "suggest_exercises" } };
    } else {
      systemPrompt = `You are an expert fitness coach building a complete workout plan.

Available exercises in the trainer's library: ${exerciseList}

RULES:
- ONLY use exercises from the list above — match names EXACTLY
- Create a logical, well-structured workout
- Include warm-up exercises if appropriate
- Set appropriate sets, reps/time, and rest periods
- Category hint: ${category || "general"}
- Difficulty hint: ${difficulty || "intermediate"}
- Group related exercises into supersets or circuits when it makes sense

BLOCK NAMING — CRITICAL:
You MUST use ONLY these exact block_label values for every section. Do NOT invent names like "Custom Block", "Block 1", "Section A", or anything not in this list:
  • "Warm-Up"            — light prep movements
  • "Working Sets"       — main strength / hypertrophy work
  • "Power / Explosive"  — plyos, Olympic lifts, speed
  • "Conditioning"       — HIIT, intervals, sprints
  • "Accessory / Isolation" — targeted muscle work
  • "Cool Down / Mobility" — stretching, recovery
  • "Finisher"           — short high-intensity burnout
  • "Skill / Drill"      — sport-specific technique
  • "Circuit"            — cycle through with minimal rest
  • "Superset"           — two exercises back-to-back
  • "Interval"           — timed work/rest periods

Pick the most appropriate block_label for each section based on its purpose. The section_name field should match block_label EXACTLY (no extra words, no numbering).`;

      tools = [{
        type: "function",
        function: {
          name: "build_workout",
          description: "Build a complete structured workout plan",
          parameters: {
            type: "object",
            properties: {
              workout_name: { type: "string" },
              description: { type: "string", description: "Brief workout instructions/summary" },
              category: { type: "string" },
              difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    block_label: {
                      type: "string",
                      enum: [
                        "Warm-Up",
                        "Working Sets",
                        "Power / Explosive",
                        "Conditioning",
                        "Accessory / Isolation",
                        "Cool Down / Mobility",
                        "Finisher",
                        "Skill / Drill",
                        "Circuit",
                        "Superset",
                        "Interval",
                      ],
                      description: "MUST be one of the trainer's predefined block types — exact match required.",
                    },
                    section_name: { type: "string", description: "Should equal block_label exactly. Do NOT invent custom names." },
                    section_type: { type: "string", enum: ["straight_set", "superset", "circuit"] },
                    rounds: { type: "number", description: "Number of rounds for supersets/circuits, 1 for straight sets" },
                    exercises: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          exercise_name: { type: "string", description: "Exact name from the exercise library" },
                          sets: { type: "number" },
                          reps_or_time: { type: "string", description: "e.g. '12' or '30 sec'" },
                          rest_seconds: { type: "number" },
                          notes: { type: "string", description: "Optional form cues or notes" },
                        },
                        required: ["exercise_name", "sets", "reps_or_time", "rest_seconds"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["block_label", "section_name", "section_type", "rounds", "exercises"],
                  additionalProperties: false,
                },
              },
            },
            required: ["workout_name", "description", "category", "difficulty", "sections"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "build_workout" } };
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelOverride || "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        ...(tools ? { tools, tool_choice: toolChoice } : {}),
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
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

    // Explanation mode returns plain text, not a tool call
    if (mode === "explain_workout") {
      const text = data.choices?.[0]?.message?.content || "";
      return new Response(JSON.stringify({ result: { explanation: text }, mode }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "No structured response from AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ result, mode: mode || "full_workout" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI workout builder error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
