import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Scenario definitions ──
interface Scenario {
  type: string;
  priority: number;
  message: string;
  action: string;
}

const SCENARIOS: Record<string, (ctx: CoachingContext) => Scenario | null> = {
  fasting_failure: (ctx) => {
    if (ctx.fastingAdherence >= 70) return null;
    return {
      type: "fasting_failure",
      priority: 1,
      message:
        "You broke your fast early — delay your first meal tomorrow by 60–90 minutes. Control the start of your window and the rest of the day follows.",
      action: "Delay first meal by 60–90 minutes tomorrow",
    };
  },

  macro_failure: (ctx) => {
    if (ctx.macroAdherence >= 70) return null;
    return {
      type: "macro_failure",
      priority: 2,
      message:
        "Your macros were off — prioritize protein first in your next meal. Build around protein and let fats follow. This will stabilize your hunger immediately.",
      action: "Build next meal around protein first",
    };
  },

  low_score: (ctx) => {
    if (ctx.dailyScore >= 60) return null;
    return {
      type: "low_score",
      priority: 3,
      message:
        "You're off track — tighten your fasting window tomorrow. Hit your full fast before eating. That alone will reset your momentum.",
      action: "Complete your full fast tomorrow",
    };
  },

  stall: (ctx) => {
    if (!ctx.isStalling || ctx.macroAdherence < 80) return null;
    return {
      type: "stall",
      priority: 4,
      message:
        "You're consistent — now tighten your fat intake slightly. Keep protein high and reduce excess fat to restart fat loss.",
      action: "Reduce fat intake by 5-10% this week",
    };
  },

  tkd_training: (ctx) => {
    if (ctx.ketoType !== "TKD" || !ctx.hasTrainingToday) return null;
    return {
      type: "tkd_training",
      priority: 5,
      message:
        "Fuel your performance — add targeted carbs post-workout. Keep the rest of your day clean and controlled.",
      action: "Add 15-30g carbs around your workout",
    };
  },

  low_energy: (ctx) => {
    if (!ctx.hasHungerSignal) return null;
    return {
      type: "low_energy",
      priority: 5,
      message:
        "Your body is signaling low energy — increase fat in your next meal. This will stabilize hunger and improve adherence.",
      action: "Add extra fat to your next meal",
    };
  },

  strong_day: (ctx) => {
    if (ctx.dailyScore <= 85) return null;
    return {
      type: "strong_day",
      priority: 6,
      message:
        "Strong execution today — stay consistent and let the system work. Repeat this tomorrow and you'll push into a higher fat-burning state.",
      action: "Repeat today's routine tomorrow",
    };
  },
};

interface CoachingContext {
  dailyScore: number;
  macroAdherence: number;
  fastingAdherence: number;
  streak: number;
  ketoType: string;
  hasTrainingToday: boolean;
  hasHungerSignal: boolean;
  isStalling: boolean;
}

function pickBestScenario(ctx: CoachingContext): Scenario | null {
  const candidates: Scenario[] = [];

  for (const key of Object.keys(SCENARIOS)) {
    const result = SCENARIOS[key](ctx);
    if (result) candidates.push(result);
  }

  if (candidates.length === 0) return null;

  // Sort by priority (1 = highest)
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0];
}

// ── Determine delivery slot based on current hour ──
function getDeliverySlot(): string {
  const hour = new Date().getUTCHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "mid_window";
  return "evening";
}

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

    // ── Gather behavior data ──
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Get yesterday's behavior
    const { data: behavior } = await supabase
      .from("client_meal_behavior")
      .select("*")
      .eq("client_id", client_id)
      .eq("tracked_date", yesterdayStr)
      .maybeSingle();

    // Get weekly summary for score + stall detection
    const { data: summary } = await supabase
      .from("client_weekly_summaries")
      .select("avg_score_7d, completion_7d, bodyweight_delta")
      .eq("client_id", client_id)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get streak
    const { data: streakData } = await supabase
      .from("client_consistency_streaks")
      .select("current_streak")
      .eq("client_id", client_id)
      .maybeSingle();

    // Get keto type
    const { data: ketoAssignment } = await supabase
      .from("client_keto_assignments")
      .select("keto_type_id, keto_types(name)")
      .eq("client_id", client_id)
      .eq("is_active", true)
      .maybeSingle();

    // Check if training today (workout sessions)
    const { count: workoutCount } = await supabase
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client_id)
      .gte("started_at", today)
      .lt("started_at", new Date(new Date(today).getTime() + 86400000).toISOString());

    // ── Build context ──
    const dailyScore = summary?.avg_score_7d || 50;
    const macroAdherence = behavior?.protein_target_hit ? 85 : (behavior ? 55 : 50);
    const fastingAdherence = (behavior?.fasting_window_adherence || 0);
    const streak = streakData?.current_streak || 0;
    const ketoType = (ketoAssignment as any)?.keto_types?.name || "SKD";
    const hasTrainingToday = (workoutCount || 0) > 0;
    const hasHungerSignal =
      (behavior?.hunger_break_fast || 0) >= 4 ||
      (behavior?.hunger_mid_window || 0) >= 4 ||
      (behavior?.hunger_last_meal || 0) >= 4;
    const isStalling =
      summary?.bodyweight_delta !== null &&
      summary?.bodyweight_delta !== undefined &&
      Math.abs(summary.bodyweight_delta) < 0.3 &&
      dailyScore >= 75;

    const ctx: CoachingContext = {
      dailyScore,
      macroAdherence,
      fastingAdherence,
      streak,
      ketoType,
      hasTrainingToday,
      hasHungerSignal,
      isStalling,
    };

    const scenario = pickBestScenario(ctx);

    if (!scenario) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No coaching scenario matched" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Save coaching message ──
    const { data: saved, error } = await supabase
      .from("coaching_messages")
      .insert({
        client_id,
        coach_type: scenario.type,
        message: scenario.message,
        action_text: scenario.action,
        priority: scenario.priority,
        delivery_slot: getDeliverySlot(),
        message_date: today,
        daily_score: dailyScore,
        macro_adherence: macroAdherence,
        fasting_adherence: fastingAdherence,
        streak,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, coaching: saved }),
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
