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
      .select("calories, protein, carbs, fats")
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

    const exceeded: string[] = [];
    if (macros.target_calories && totals.calories > macros.target_calories) exceeded.push("calories");
    if (macros.target_carbs && totals.carbs > macros.target_carbs) exceeded.push("carbs");
    if (macros.target_fats && totals.fats > macros.target_fats) exceeded.push("fats");
    if (macros.target_protein && totals.protein > macros.target_protein) exceeded.push("protein");

    if (exceeded.length === 0) {
      // Check if close to limits (within 90%)
      const warnings: string[] = [];
      if (macros.target_carbs && totals.carbs >= macros.target_carbs * 0.9) warnings.push("carbs");
      if (macros.target_calories && totals.calories >= macros.target_calories * 0.9) warnings.push("calories");

      return new Response(
        JSON.stringify({
          nudge: warnings.length > 0
            ? { type: "warning", message: `You're close to your ${warnings.join(" and ")} limit. Choose wisely for your next meal!`, exceeded: [], warnings }
            : null,
          totals,
          targets: macros,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate AI coaching nudge
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiMessage = "";

    if (LOVABLE_API_KEY) {
      const prompt = `You are a supportive keto coach. The client has exceeded their daily ${exceeded.join(", ")} targets.

Current totals: ${totals.calories} cal, ${totals.protein}g protein, ${totals.carbs}g carbs, ${totals.fats}g fat.
Targets: ${macros.target_calories} cal, ${macros.target_protein}g protein, ${macros.target_carbs}g carbs, ${macros.target_fats}g fat.
${logged_meal ? `Just logged: ${logged_meal.name} (${logged_meal.calories} cal, P:${logged_meal.protein}g C:${logged_meal.carbs}g F:${logged_meal.fats}g)` : ""}

Give a brief, encouraging coaching message (2 sentences max) about what to adjust for the next meal. Be specific about which macros to reduce. Use a warm but direct tone.`;

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
              { role: "system", content: "You are KSOM-360, a supportive keto nutrition coach. Keep responses under 2 sentences." },
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

    // Fallback messages
    if (!aiMessage) {
      if (exceeded.includes("carbs")) {
        aiMessage = "You're over carbs — adjust your next meal to stay in fat-burning range. Try a high-protein, zero-carb option.";
      } else if (exceeded.includes("calories")) {
        aiMessage = "You've hit your calorie target for today. If you need to eat, keep it light — think leafy greens or broth.";
      } else if (exceeded.includes("fats")) {
        aiMessage = "Fat intake is above target. Go lean protein for your next meal to balance things out.";
      } else {
        aiMessage = "You're over your macro targets. Consider lighter options for the rest of the day.";
      }
    }

    return new Response(
      JSON.stringify({
        nudge: {
          type: "exceeded",
          message: aiMessage,
          exceeded,
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
