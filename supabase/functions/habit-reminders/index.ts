import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMin = now.getUTCMinutes();
    const today = now.toISOString().slice(0, 10);

    // Fetch all active habits with reminders enabled
    const { data: habits, error: habitsErr } = await supabase
      .from("client_habits")
      .select("id, client_id, name, icon_url, reminder_time, frequency, start_date, end_date, goal_value, goal_unit")
      .eq("is_active", true)
      .eq("reminder_enabled", true)
      .not("reminder_time", "is", null);

    if (habitsErr) throw habitsErr;
    if (!habits?.length) {
      return new Response(JSON.stringify({ processed: 0, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter habits due today and within the current time window (±5 min)
    const dueHabits = habits.filter((h: any) => {
      // Check date range
      if (h.start_date > today) return false;
      if (h.end_date && h.end_date < today) return false;

      // Check frequency
      if (h.frequency === "weekly") {
        const startDay = new Date(h.start_date + "T00:00:00").getDay();
        if (now.getDay() !== startDay) return false;
      }

      // Check reminder time is within current window (cron runs every 5 min)
      if (!h.reminder_time) return false;
      const [rh, rm] = h.reminder_time.split(":").map(Number);
      const reminderMins = rh * 60 + rm;
      const nowMins = currentHour * 60 + currentMin;
      return Math.abs(nowMins - reminderMins) <= 5;
    });

    if (!dueHabits.length) {
      return new Response(JSON.stringify({ processed: habits.length, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check which habits already have a notification sent today (dedup)
    const habitIds = dueHabits.map((h: any) => h.id);
    const clientIds = [...new Set(dueHabits.map((h: any) => h.client_id))];

    const { data: existingNotifs } = await supabase
      .from("in_app_notifications")
      .select("user_id, reference_id")
      .in("user_id", clientIds)
      .gte("created_at", today + "T00:00:00.000Z")
      .eq("type", "habit_reminder");

    const sentKeys = new Set(
      (existingNotifs || []).map((n: any) => `${n.user_id}_${n.reference_id}`)
    );

    // Also check which habits are already completed today
    const { data: completions } = await supabase
      .from("habit_completions")
      .select("habit_id, client_id")
      .in("habit_id", habitIds)
      .eq("completion_date", today);

    const completedKeys = new Set(
      (completions || []).map((c: any) => `${c.client_id}_${c.habit_id}`)
    );

    const toInsert: any[] = [];

    for (const habit of dueHabits) {
      const key = `${habit.client_id}_${habit.id}`;
      // Skip if already notified or already completed
      if (sentKeys.has(key) || completedKeys.has(key)) continue;

      const icon = habit.icon_url?.startsWith("emoji:") ? habit.icon_url.replace("emoji:", "") : "🎯";

      toInsert.push({
        user_id: habit.client_id,
        title: `${icon} ${habit.name}`,
        body: `Time to work on your habit! Goal: ${habit.goal_value} ${habit.goal_unit}`,
        type: "habit_reminder",
        action_url: `/client/habits/${habit.id}`,
        reference_id: habit.id,
      });
    }

    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from("in_app_notifications")
        .insert(toInsert);
      if (insertErr) {
        console.error("Failed to insert notifications:", insertErr);
      }
    }

    console.log(`Habit reminders: ${habits.length} habits checked, ${toInsert.length} notifications sent`);

    return new Response(
      JSON.stringify({ processed: habits.length, sent: toInsert.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Habit reminder error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
