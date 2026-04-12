import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { client_id, logged_meal } = await req.json();

    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split("T")[0];

    // Get today's nutrition logs
    const { data: todayLogs } = await supabase
      .from("nutrition_logs")
      .select("calories, protein, carbs, fats, created_at")
      .eq("client_id", client_id)
      .eq("log_date", today);

    // Get macro targets
    const { data: macros } = await supabase
      .from("client_macro_targets")
      .select("target_calories, target_protein, target_carbs, target_fats")
      .eq("client_id", client_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!macros) {
      return new Response(
        JSON.stringify({ nudge: null, reason: "no_targets" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate totals
    const totals = (todayLogs || []).reduce(
      (acc: any, log: any) => ({
        calories: acc.calories + (log.calories || 0),
        protein: acc.protein + (log.protein || 0),
        carbs: acc.carbs + (log.carbs || 0),
        fats: acc.fats + (log.fats || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    const mealCount = (todayLogs || []).length;

    // --- SMART COACHING LAYER ---

    // 1. Detect skipped meals (no logs by certain times)
    const hour = new Date().getUTCHours();
    const skippedMeal = mealCount === 0 && hour >= 12;
    const longGap = detectLongGap(todayLogs || []);

    // 2. Detect low protein pattern
    const proteinRatio = macros.target_protein ? totals.protein / macros.target_protein : 1;
    const lowProtein = mealCount >= 1 && proteinRatio < 0.3 && hour >= 14;

    // 3. Detect high carbs from just-logged meal
    const highCarbMeal = logged_meal && macros.target_carbs && logged_meal.carbs > macros.target_carbs * 0.4;

    // 4. Standard exceeded checks
    const exceeded: string[] = [];
    if (macros.target_calories && totals.calories > macros.target_calories) exceeded.push("calories");
    if (macros.target_carbs && totals.carbs > macros.target_carbs) exceeded.push("carbs");
    if (macros.target_fats && totals.fats > macros.target_fats) exceeded.push("fats");
    if (macros.target_protein && totals.protein > macros.target_protein) exceeded.push("protein");

    // Build coaching context for AI
    const coachingSignals: string[] = [];
    if (skippedMeal) coachingSignals.push("skipped_meal");
    if (longGap) coachingSignals.push("long_gap");
    if (lowProtein) coachingSignals.push("low_protein");
    if (highCarbMeal) coachingSignals.push("high_carb_meal");
    if (exceeded.length > 0) coachingSignals.push(`exceeded:${exceeded.join(",")}`);

    // Build suggested actions
    const suggestions: { type: string; label: string; action: string }[] = [];

    if (lowProtein) {
      suggestions.push({
        type: "high_protein",
        label: "🥩 High Protein Meals",
        action: "Show high-protein meal options",
      });
    }

    if (highCarbMeal || exceeded.includes("carbs")) {
      suggestions.push({
        type: "low_carb",
        label: "🥗 Low Carb Options",
        action: "Show low-carb meals for next meal",
      });
    }

    if (skippedMeal || longGap) {
      suggestions.push({
        type: "quick_meal",
        label: "⚡ Quick & Easy Meals",
        action: "Show quick grab-and-go options",
      });
      suggestions.push({
        type: "break_fast",
        label: "🍳 Break Your Fast",
        action: "Show break-fast meals",
      });
    }

    // If within budget but protein is lagging
    if (exceeded.length === 0 && macros.target_protein && totals.protein < macros.target_protein * 0.5 && hour >= 15) {
      suggestions.push({
        type: "protein_boost",
        label: "💪 Protein Boost",
        action: "Suggest high-protein snack or meal",
      });
    }

    // --- GENERATE COACHING MESSAGE ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiMessage = "";

    if (LOVABLE_API_KEY && coachingSignals.length > 0) {
      const prompt = buildCoachingPrompt(coachingSignals, totals, macros, logged_meal, mealCount, hour);

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are KSOM-360, a supportive keto nutrition coach. Be warm but direct. Keep responses to 2 sentences max. Sound like a real coach texting their client, not a robot." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiMessage = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.error("AI nudge error:", e);
      }
    }

    // Fallback messages based on signal
    if (!aiMessage) {
      aiMessage = getFallbackMessage(coachingSignals, totals, macros);
    }

    // Determine nudge type
    let nudgeType = "info";
    if (exceeded.length > 0) nudgeType = "exceeded";
    else if (highCarbMeal) nudgeType = "warning";
    else if (lowProtein) nudgeType = "suggestion";
    else if (skippedMeal || longGap) nudgeType = "prompt";

    // Only return nudge if there's something to say
    if (coachingSignals.length === 0 && exceeded.length === 0) {
      // Check close-to-limit warnings
      const warnings: string[] = [];
      if (macros.target_carbs && totals.carbs >= macros.target_carbs * 0.9) warnings.push("carbs");
      if (macros.target_calories && totals.calories >= macros.target_calories * 0.9) warnings.push("calories");

      return new Response(
        JSON.stringify({
          nudge: warnings.length > 0
            ? { type: "warning", message: `You're close to your ${warnings.join(" and ")} limit. Choose wisely for your next meal!`, exceeded: [], warnings, suggestions: [] }
            : null,
          totals,
          targets: macros,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        nudge: {
          type: nudgeType,
          message: aiMessage,
          exceeded,
          signals: coachingSignals,
          suggestions,
        },
        totals,
        targets: macros,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("meal-coach-nudge error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function detectLongGap(logs: any[]): boolean {
  if (logs.length === 0) return false;
  const now = Date.now();
  const lastLog = logs.reduce((latest: any, log: any) => {
    const t = new Date(log.created_at).getTime();
    return t > latest ? t : latest;
  }, 0);
  const hoursSinceLast = (now - lastLog) / (1000 * 60 * 60);
  return hoursSinceLast >= 5;
}

function buildCoachingPrompt(
  signals: string[],
  totals: any,
  macros: any,
  logged_meal: any,
  mealCount: number,
  hour: number
): string {
  const parts: string[] = [];

  parts.push(`Current time: ~${hour}:00. Meals logged today: ${mealCount}.`);
  parts.push(`Today's totals: ${totals.calories} cal, ${totals.protein}g protein, ${totals.carbs}g carbs, ${totals.fats}g fat.`);
  parts.push(`Daily targets: ${macros.target_calories} cal, ${macros.target_protein}g protein, ${macros.target_carbs}g carbs, ${macros.target_fats}g fat.`);

  if (logged_meal) {
    parts.push(`Just logged: ${logged_meal.name} (${logged_meal.calories} cal, P:${logged_meal.protein}g C:${logged_meal.carbs}g F:${logged_meal.fats}g)`);
  }

  if (signals.includes("skipped_meal")) {
    parts.push("⚠️ The client hasn't logged any meals today and it's past noon. They may have skipped meals. Encourage them to eat something keto-friendly.");
  }
  if (signals.includes("long_gap")) {
    parts.push("⚠️ It's been 5+ hours since their last logged meal. Remind them to fuel up with something smart.");
  }
  if (signals.includes("low_protein")) {
    parts.push("⚠️ Protein intake is below 30% of target and it's afternoon. Strongly suggest a high-protein meal.");
  }
  if (signals.includes("high_carb_meal")) {
    parts.push("⚠️ The meal they just logged had high carbs (over 40% of daily carb budget in one meal). Coach them on adjusting the next meal.");
  }
  if (signals.some(s => s.startsWith("exceeded:"))) {
    const exceededMacros = signals.find(s => s.startsWith("exceeded:"))!.split(":")[1];
    parts.push(`⚠️ They've exceeded their daily ${exceededMacros} targets. Give specific advice on what to eat (or not eat) for the rest of the day.`);
  }

  parts.push("Give a brief, encouraging coaching message. Be specific. Use a warm but direct tone like a real coach texting their client.");

  return parts.join("\n");
}

function getFallbackMessage(signals: string[], totals: any, macros: any): string {
  if (signals.includes("skipped_meal")) {
    return "Hey! You haven't logged any meals today. Let's get something keto-friendly in — even a quick snack counts. Tap below for easy options! 💪";
  }
  if (signals.includes("long_gap")) {
    return "It's been a while since your last meal. Time to refuel! Try a high-protein option to keep your energy up. 🔥";
  }
  if (signals.includes("low_protein")) {
    return "Your protein is running low today — let's fix that! Try a high-protein meal like grilled chicken or eggs to hit your target. 🥩";
  }
  if (signals.includes("high_carb_meal")) {
    return "That meal was carb-heavy. No stress — just go lean and low-carb for your next meal to stay in your zone. 🥗";
  }
  if (signals.some(s => s.startsWith("exceeded:"))) {
    const exceeded = signals.find(s => s.startsWith("exceeded:"))!.split(":")[1];
    if (exceeded.includes("carbs")) {
      return "You're over carbs — adjust your next meal to stay in fat-burning range. Try a high-protein, zero-carb option.";
    }
    if (exceeded.includes("calories")) {
      return "You've hit your calorie target for today. If you need to eat, keep it light — think leafy greens or broth.";
    }
    if (exceeded.includes("fats")) {
      return "Fat intake is above target. Go lean protein for your next meal to balance things out.";
    }
    return "You're over your macro targets. Consider lighter options for the rest of the day.";
  }
  return "Keep going — you're doing great! Stay focused on your macros. 💪";
}
