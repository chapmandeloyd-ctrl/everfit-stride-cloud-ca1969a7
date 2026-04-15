import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Scenario definitions (rules decide WHAT to say) ──
interface ScenarioMatch {
  type: string;
  priority: number;
  fallbackMessage: string;
  fallbackAction: string;
  aiPromptContext: string;
}

interface CoachingContext {
  dailyScore: number;
  macroAdherence: number;
  fastingAdherence: number;
  streak: number;
  ketoType: string;
  hasTrainingToday: boolean;
  hasHungerSignal: boolean;
  isStalling: boolean;
  clientName: string;
}

const SCENARIO_RULES: Array<(ctx: CoachingContext) => ScenarioMatch | null> = [
  // Priority 1 — Fasting failure
  (ctx) => {
    if (ctx.fastingAdherence >= 70) return null;
    return {
      type: "fasting_failure",
      priority: 1,
      fallbackMessage: "You broke your fast early — delay your first meal tomorrow by 60–90 minutes. Control the start of your window and the rest of the day follows.",
      fallbackAction: "Delay first meal by 60–90 minutes tomorrow",
      aiPromptContext: `Client broke their fast early (${Math.round(ctx.fastingAdherence)}% fasting adherence). ${ctx.streak > 0 ? `They have a ${ctx.streak}-day streak.` : "No active streak."} Goal: get them to delay their first meal tomorrow and protect their fasting window.`,
    };
  },

  // Priority 2 — Macro failure
  (ctx) => {
    if (ctx.macroAdherence >= 70) return null;
    return {
      type: "macro_failure",
      priority: 2,
      fallbackMessage: "Your macros were off — prioritize protein first in your next meal. Build around protein and let fats follow. This will stabilize your hunger immediately.",
      fallbackAction: "Build next meal around protein first",
      aiPromptContext: `Client's macro adherence was low (${Math.round(ctx.macroAdherence)}%). Keto type: ${ctx.ketoType}. ${ctx.streak > 0 ? `${ctx.streak}-day streak active.` : ""} Goal: get them to prioritize protein in their next meal.`,
    };
  },

  // Priority 3 — Low score
  (ctx) => {
    if (ctx.dailyScore >= 60) return null;
    return {
      type: "low_score",
      priority: 3,
      fallbackMessage: "You're off track — tighten your fasting window tomorrow. Hit your full fast before eating. That alone will reset your momentum.",
      fallbackAction: "Complete your full fast tomorrow",
      aiPromptContext: `Client's daily score is low (${Math.round(ctx.dailyScore)}/100). They're struggling with overall compliance. Goal: give them ONE thing to focus on tomorrow to reset momentum.`,
    };
  },

  // Priority 4 — Stall
  (ctx) => {
    if (!ctx.isStalling || ctx.macroAdherence < 80) return null;
    return {
      type: "stall",
      priority: 4,
      fallbackMessage: "You're consistent — now tighten your fat intake slightly. Keep protein high and reduce excess fat to restart fat loss.",
      fallbackAction: "Reduce fat intake by 5-10% this week",
      aiPromptContext: `Client is in a weight stall — high compliance (${Math.round(ctx.macroAdherence)}% macro adherence, score ${Math.round(ctx.dailyScore)}) but no weight change. ${ctx.streak}-day streak. Goal: encourage them that consistency is working and suggest a small fat reduction to break the plateau.`,
    };
  },

  // Priority 5 — TKD Training
  (ctx) => {
    if (ctx.ketoType !== "TKD" || !ctx.hasTrainingToday) return null;
    return {
      type: "tkd_training",
      priority: 5,
      fallbackMessage: "Fuel your performance — add targeted carbs post-workout. Keep the rest of your day clean and controlled.",
      fallbackAction: "Add 15-30g carbs around your workout",
      aiPromptContext: `Client is on Targeted Keto (TKD) and has a training session today. Goal: remind them to add targeted carbs around their workout for performance while keeping the rest of the day clean.`,
    };
  },

  // Priority 5 — Low energy / hunger
  (ctx) => {
    if (!ctx.hasHungerSignal) return null;
    return {
      type: "low_energy",
      priority: 5,
      fallbackMessage: "Your body is signaling low energy — increase fat in your next meal. This will stabilize hunger and improve adherence.",
      fallbackAction: "Add extra fat to your next meal",
      aiPromptContext: `Client reported high hunger signals yesterday. Keto type: ${ctx.ketoType}. Goal: tell them to increase fat in their next meal to stabilize hunger and energy.`,
    };
  },

  // Priority 6 — Strong day
  (ctx) => {
    if (ctx.dailyScore <= 85) return null;
    return {
      type: "strong_day",
      priority: 6,
      fallbackMessage: "Strong execution today — stay consistent and let the system work. Repeat this tomorrow and you'll push into a higher fat-burning state.",
      fallbackAction: "Repeat today's routine tomorrow",
      aiPromptContext: `Client had an excellent day — score ${Math.round(ctx.dailyScore)}/100, ${ctx.streak > 0 ? `${ctx.streak}-day streak` : "building momentum"}. Macro adherence: ${Math.round(ctx.macroAdherence)}%. Goal: reinforce their great execution and motivate them to repeat it.`,
    };
  },
];

function pickBestScenario(ctx: CoachingContext): ScenarioMatch | null {
  const candidates: ScenarioMatch[] = [];
  for (const rule of SCENARIO_RULES) {
    const result = rule(ctx);
    if (result) candidates.push(result);
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0];
}

// ── AI personalization layer ──
async function generateAIMessage(
  scenario: ScenarioMatch,
  ctx: CoachingContext
): Promise<{ message: string; action: string } | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  const systemPrompt = `You are the voice of KSOM360 — a direct, confident coaching system. You speak TO the client.

RULES:
- Write exactly 2-3 sentences. No more.
- Give ONE clear, specific action.
- NEVER use soft language: no "try", "maybe", "consider", "perhaps", "might want to"
- Be confident and direct — like a coach who knows exactly what's needed
- NEVER give medical advice
- Use the client's streak/numbers to make it personal when provided
- End with forward momentum — what to do next, not what went wrong

RESPOND IN THIS EXACT JSON FORMAT:
{"message": "your coaching message here", "action": "one clear action item"}`;

  const userPrompt = `Scenario: ${scenario.type}
Context: ${scenario.aiPromptContext}
${ctx.clientName ? `Client name: ${ctx.clientName}` : ""}

Generate the coaching message now.`;

  try {
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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return null; // Fall back to rule-based message
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    // Parse JSON from response (handle markdown code blocks)
    const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    if (parsed.message && parsed.action) {
      return { message: parsed.message, action: parsed.action };
    }
    return null;
  } catch (err) {
    console.error("AI generation failed, using fallback:", err);
    return null;
  }
}

function getDeliverySlot(): string {
  const hour = new Date().getUTCHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "mid_window";
  return "evening";
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { client_id } = await req.json();
    if (!client_id) {
      return new Response(
        JSON.stringify({ error: "client_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    // ── Check if already sent today ──
    const { data: existing } = await supabase
      .from("coaching_messages")
      .select("id")
      .eq("client_id", client_id)
      .eq("message_date", today)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Already coached today" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Gather all behavior data in parallel ──
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const [
      { data: behavior },
      { data: summary },
      { data: streakData },
      { data: ketoAssignment },
      { count: workoutCount },
      { data: profile },
    ] = await Promise.all([
      supabase
        .from("client_meal_behavior")
        .select("*")
        .eq("client_id", client_id)
        .eq("tracked_date", yesterdayStr)
        .maybeSingle(),
      supabase
        .from("client_weekly_summaries")
        .select("avg_score_7d, completion_7d, bodyweight_delta")
        .eq("client_id", client_id)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("client_consistency_streaks")
        .select("current_streak")
        .eq("client_id", client_id)
        .maybeSingle(),
      supabase
        .from("client_keto_assignments")
        .select("keto_type_id, keto_types(name)")
        .eq("client_id", client_id)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("workout_sessions")
        .select("id", { count: "exact", head: true })
        .eq("client_id", client_id)
        .gte("started_at", today)
        .lt("started_at", new Date(new Date(today).getTime() + 86400000).toISOString()),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", client_id)
        .maybeSingle(),
    ]);

    // ── Build context ──
    const ctx: CoachingContext = {
      dailyScore: summary?.avg_score_7d || 50,
      macroAdherence: behavior?.protein_target_hit ? 85 : (behavior ? 55 : 50),
      fastingAdherence: behavior?.fasting_window_adherence || 0,
      streak: streakData?.current_streak || 0,
      ketoType: (ketoAssignment as any)?.keto_types?.name || "SKD",
      hasTrainingToday: (workoutCount || 0) > 0,
      hasHungerSignal:
        (behavior?.hunger_break_fast || 0) >= 4 ||
        (behavior?.hunger_mid_window || 0) >= 4 ||
        (behavior?.hunger_last_meal || 0) >= 4,
      isStalling:
        summary?.bodyweight_delta !== null &&
        summary?.bodyweight_delta !== undefined &&
        Math.abs(summary.bodyweight_delta) < 0.3 &&
        (summary?.avg_score_7d || 0) >= 75,
      clientName: profile?.full_name?.split(" ")[0] || "",
    };

    // ── Pick scenario (rules decide WHAT) ──
    const scenario = pickBestScenario(ctx);

    if (!scenario) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No coaching scenario matched" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Generate personalized message (AI decides HOW) ──
    const aiResult = await generateAIMessage(scenario, ctx);

    const finalMessage = aiResult?.message || scenario.fallbackMessage;
    const finalAction = aiResult?.action || scenario.fallbackAction;

    // ── Save coaching message ──
    const { data: saved, error } = await supabase
      .from("coaching_messages")
      .insert({
        client_id,
        coach_type: scenario.type,
        message: finalMessage,
        action_text: finalAction,
        priority: scenario.priority,
        delivery_slot: getDeliverySlot(),
        message_date: today,
        daily_score: ctx.dailyScore,
        macro_adherence: ctx.macroAdherence,
        fasting_adherence: ctx.fastingAdherence,
        streak: ctx.streak,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        coaching: saved,
        ai_generated: !!aiResult,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Coaching engine error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
