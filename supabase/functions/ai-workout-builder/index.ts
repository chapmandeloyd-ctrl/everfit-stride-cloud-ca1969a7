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
    const { mode, prompt, exercise_names, category, difficulty } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!prompt || !exercise_names || exercise_names.length === 0) {
      return new Response(
        JSON.stringify({ error: "prompt and exercise_names are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const exerciseList = exercise_names.join(", ");

    let systemPrompt: string;
    let tools: any[] | undefined;
    let toolChoice: any | undefined;

    if (mode === "suggest_exercise") {
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
- Group related exercises into supersets or circuits when it makes sense`;

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
                    section_name: { type: "string", description: "e.g. Warm-Up, Main, Superset A, Circuit, Cool Down" },
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
                  required: ["section_name", "section_type", "rounds", "exercises"],
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
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        tools,
        tool_choice: toolChoice,
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
