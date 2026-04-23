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
    } else if (mode === "build_full_program") {
      // End-to-end: invent workouts AND schedule them. Uses GPT-5 for deep reasoning.
      const restGuidance = rest_strategy === "fixed" && fixed_pattern
        ? `Train ONLY on these days of the week: ${fixed_pattern.join(", ")}. All other days are Rest.`
        : `Auto-place rest days intelligently to maximize recovery. With ${days_per_week} training days/week, space them evenly.`;

      const progressionGuidance = progression === "linear"
        ? "LINEAR PROGRESSION: Each week, add a small overload note (e.g. '+1 rep per set' or '+5 lb' or 'add 1 set on main lift') in the day's notes."
        : progression === "wave"
        ? "WAVE/UNDULATING: Cycle intensity weekly — Week 1 moderate, Week 2 hard, Week 3 easy/recovery, then repeat. Note intended intensity in each day's notes."
        : "NO PROGRESSION: Rotate the workouts across the schedule. Leave notes empty unless variety guidance is helpful.";

      systemPrompt = `You are an expert strength & conditioning coach designing a full multi-week training program from scratch for another trainer.

CONTEXT:
- Program length: ${weeks} weeks
- Training frequency: ${days_per_week} days per week
- Rest day rule: ${restGuidance}
- Progression style: ${progressionGuidance}

AVAILABLE EXERCISES (use ONLY these — match names EXACTLY):
${exerciseList}

YOUR TASK:
1. Invent a small set of distinct workout templates (typically 2-5 unique workouts, e.g. "Push Day", "Pull Day", "Leg Day"). Each workout is REUSED across the weeks.
2. Build each workout with proper structure: warm-up → main work → accessory → cooldown when appropriate.
3. Then schedule those workouts across ${weeks} weeks at ${days_per_week} sessions/week.

RULES:
- Every exercise_name MUST exactly match one from the AVAILABLE EXERCISES list
- Workout names should be descriptive and unique (e.g. "Push Day A", "Pull Day", "Lower Body Power")
- Every workout_name in the schedule MUST exactly match one of the workouts you defined
- Use day_of_week 1=Monday … 7=Sunday
- Only output workout days — rest days are implied by absence
- Keep daily notes short and actionable (under 80 chars)

BLOCK NAMING — use ONLY these exact section_name / block_label values:
"Warm-Up", "Working Sets", "Power / Explosive", "Conditioning", "Accessory / Isolation", "Cool Down / Mobility", "Finisher", "Skill / Drill", "Circuit", "Superset", "Interval"`;

      tools = [{
        type: "function",
        function: {
          name: "build_full_program",
          description: "Invent workouts AND schedule them across multiple weeks",
          parameters: {
            type: "object",
            properties: {
              program_name: { type: "string" },
              program_description: { type: "string", description: "Brief 1-2 sentence summary" },
              workouts: {
                type: "array",
                description: "The unique workout templates that will be reused across the schedule",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Unique workout name (e.g. 'Push Day A')" },
                    description: { type: "string" },
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
                              "Warm-Up", "Working Sets", "Power / Explosive", "Conditioning",
                              "Accessory / Isolation", "Cool Down / Mobility", "Finisher",
                              "Skill / Drill", "Circuit", "Superset", "Interval",
                            ],
                          },
                          section_name: { type: "string" },
                          section_type: { type: "string", enum: ["straight_set", "superset", "circuit"] },
                          rounds: { type: "number" },
                          exercises: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                exercise_name: { type: "string" },
                                sets: { type: "number" },
                                reps_or_time: { type: "string" },
                                rest_seconds: { type: "number" },
                                notes: { type: "string" },
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
                  required: ["name", "description", "category", "difficulty", "sections"],
                  additionalProperties: false,
                },
              },
              schedule: {
                type: "array",
                description: "All workout days across all weeks. Skip rest days.",
                items: {
                  type: "object",
                  properties: {
                    week_number: { type: "number" },
                    day_of_week: { type: "number", description: "1=Mon, 7=Sun" },
                    workout_name: { type: "string", description: "EXACT match from workouts[].name" },
                    notes: { type: "string" },
                  },
                  required: ["week_number", "day_of_week", "workout_name"],
                  additionalProperties: false,
                },
              },
            },
            required: ["program_name", "program_description", "workouts", "schedule"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "build_full_program" } };
    } else if (mode === "build_program") {
      // Multi-week program scheduler — uses GPT-5 for deep reasoning
      const workoutList = (workouts || []).map((w: any, i: number) =>
        `${i + 1}. "${w.name}"${w.category ? ` (${w.category})` : ""}${w.difficulty ? ` — ${w.difficulty}` : ""}`
      ).join("\n");

      const restGuidance = rest_strategy === "fixed" && fixed_pattern
        ? `Train ONLY on these days of the week: ${fixed_pattern.join(", ")}. All other days are Rest.`
        : `Auto-place rest days intelligently to maximize recovery. With ${days_per_week} training days/week, space them evenly (e.g. 3 days = Mon/Wed/Fri, 4 days = Mon/Tue/Thu/Fri).`;

      const progressionGuidance = progression === "linear"
        ? "LINEAR PROGRESSION: Each week, add a small overload note (e.g. '+1 rep per set' or '+5 lb' or 'add 1 set on main lift'). Place the note in the day's notes field."
        : progression === "wave"
        ? "WAVE/UNDULATING: Cycle intensity weekly — Week 1 moderate, Week 2 hard, Week 3 easy/recovery, then repeat. Note the intended intensity in each day's notes."
        : "NO PROGRESSION: Simply rotate the workouts across the schedule. Leave notes empty unless variety guidance is helpful.";

      systemPrompt = `You are an expert strength & conditioning coach designing a multi-week training program for another trainer's client.

CONTEXT:
- Program length: ${weeks} weeks
- Training frequency: ${days_per_week} days per week
- Rest day rule: ${restGuidance}
- Progression style: ${progressionGuidance}

AVAILABLE WORKOUTS (use ONLY these — do NOT invent new ones, match names EXACTLY):
${workoutList}

RULES:
- Every workout_name in your output MUST exactly match one from the list above
- Distribute the workouts intelligently across the week (avoid two heavy lower-body days back-to-back, alternate push/pull, etc.)
- Use day_of_week 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday
- Only output workout days — rest days are implied by absence
- Keep notes short and actionable (under 80 chars)
- The program_name and program_description should reflect the trainer's prompt and the structure you chose`;

      tools = [{
        type: "function",
        function: {
          name: "build_program",
          description: "Design a multi-week training program schedule",
          parameters: {
            type: "object",
            properties: {
              program_name: { type: "string" },
              program_description: { type: "string", description: "Brief 1-2 sentence summary of the program's intent and structure" },
              schedule: {
                type: "array",
                description: "All workout days across all weeks. Skip rest days entirely.",
                items: {
                  type: "object",
                  properties: {
                    week_number: { type: "number", description: "1-indexed week number" },
                    day_of_week: { type: "number", description: "1=Mon, 7=Sun" },
                    workout_name: { type: "string", description: "EXACT match from the available workouts list" },
                    notes: { type: "string", description: "Optional progression/intensity note for this day" },
                  },
                  required: ["week_number", "day_of_week", "workout_name"],
                  additionalProperties: false,
                },
              },
            },
            required: ["program_name", "program_description", "schedule"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "build_program" } };
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
