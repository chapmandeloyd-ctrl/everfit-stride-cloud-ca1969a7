import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseHM(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function inQuietHours(nowMins: number, start: string | null, end: string | null) {
  const s = parseHM(start);
  const e = parseHM(end);
  if (s === null || e === null || s === e) return false;
  if (s < e) return nowMins >= s && nowMins < e;
  return nowMins >= s || nowMins < e;
}

// Habit Loop trigger types (must match HabitLoopSettings.tsx)
const TRIGGERS = [
  { key: "pre_window",         prefKey: "pre_window_enabled",         offsetMin: -15, title: "⏰ Eating window opens soon", body: "15 minutes until your eating window opens. Get ready to break fast." },
  { key: "break_fast",         prefKey: "break_fast_enabled",         offsetMin: 0,   title: "🍽️ Break your fast", body: "Your eating window is open. Choose a high-protein meal to start strong." },
  { key: "mid_window",         prefKey: "mid_window_enabled",         offsetMin: null /* computed */, title: "🎯 Mid-window check", body: "You're halfway through your eating window. How are your macros tracking?" },
  { key: "last_meal",          prefKey: "last_meal_enabled",          offsetMin: null /* computed: window_close - 75 */, title: "🌙 Last meal coming up", body: "Your eating window closes in ~75 minutes. Time for your final meal." },
  { key: "streak_protection",  prefKey: "streak_protection_enabled",  offsetMin: null /* fires at 20:00 UTC if streak at risk */, title: "🔥 Protect your streak!", body: "You haven't logged today — keep your streak alive." },
  { key: "daily_score",        prefKey: "daily_score_enabled",        offsetMin: null /* fires at 21:00 UTC */, title: "🏆 Daily score ready", body: "See how you did today and what to focus on tomorrow." },
] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const nowMins = now.getUTCHours() * 60 + now.getUTCMinutes();
    const today = now.toISOString().slice(0, 10);
    const TOL = 5; // ±5 min window (cron runs every 5 min)

    // Pull habit-loop prefs joined with feature settings (eating window data)
    const { data: prefs, error } = await supabase
      .from("habit_loop_preferences")
      .select(`
        client_id,
        max_daily_notifications,
        reduce_if_ignored,
        pre_window_enabled,
        break_fast_enabled,
        mid_window_enabled,
        last_meal_enabled,
        streak_protection_enabled,
        daily_score_enabled,
        quiet_hours_start,
        quiet_hours_end
      `);

    if (error) throw error;
    if (!prefs?.length) {
      return new Response(JSON.stringify({ processed: 0, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientIds = prefs.map((p: any) => p.client_id);

    // Get eating window config + engine mode
    const { data: featureSettings } = await supabase
      .from("client_feature_settings")
      .select("client_id, eating_window_hours, eating_window_ends_at, engine_mode, fasting_enabled")
      .in("client_id", clientIds);

    const featureMap = new Map<string, any>();
    (featureSettings || []).forEach((f: any) => featureMap.set(f.client_id, f));

    // Today's habit-loop notifications (dedupe + cap)
    const { data: todayNotifs } = await supabase
      .from("in_app_notifications")
      .select("user_id, type, reference_id")
      .in("user_id", clientIds)
      .gte("created_at", today + "T00:00:00.000Z")
      .like("type", "habit_loop_%");

    const sentToday = new Map<string, { count: number; types: Set<string> }>();
    (todayNotifs || []).forEach((n: any) => {
      const cur = sentToday.get(n.user_id) || { count: 0, types: new Set() };
      cur.count++;
      cur.types.add(n.type);
      sentToday.set(n.user_id, cur);
    });

    // Today's meal logs (for streak protection)
    const { data: mealLogs } = await supabase
      .from("client_meal_selections")
      .select("client_id")
      .in("client_id", clientIds)
      .eq("meal_date", today);
    const loggedToday = new Set((mealLogs || []).map((m: any) => m.client_id));

    const toInsert: any[] = [];

    for (const p of prefs as any[]) {
      const fs = featureMap.get(p.client_id);
      // Athletic engine has no fasting — skip window-based triggers
      const isAthletic = fs?.engine_mode === "athletic";
      const fastingOff = fs && fs.fasting_enabled === false;

      // Quiet hours
      if (inQuietHours(nowMins, p.quiet_hours_start, p.quiet_hours_end)) continue;

      const cap = p.max_daily_notifications ?? 3;
      const stats = sentToday.get(p.client_id) || { count: 0, types: new Set<string>() };
      if (stats.count >= cap) continue;

      // Compute window close time for this client (HH:MM UTC)
      const closeMins = parseHM(fs?.eating_window_ends_at);
      const windowHours = fs?.eating_window_hours ?? 8;
      const openMins = closeMins !== null ? (closeMins - windowHours * 60 + 24 * 60) % (24 * 60) : null;
      const midMins = openMins !== null ? (openMins + (windowHours * 60) / 2) % (24 * 60) : null;
      const lastMealMins = closeMins !== null ? (closeMins - 75 + 24 * 60) % (24 * 60) : null;
      const preWindowMins = openMins !== null ? (openMins - 15 + 24 * 60) % (24 * 60) : null;

      const fireTimes: Record<string, number | null> = {
        pre_window:        preWindowMins,
        break_fast:        openMins,
        mid_window:        midMins,
        last_meal:         lastMealMins,
        streak_protection: 20 * 60, // 20:00 UTC
        daily_score:       21 * 60, // 21:00 UTC
      };

      for (const trig of TRIGGERS) {
        if (stats.count >= cap) break;
        if (p[trig.prefKey] === false) continue;

        // Window-dependent triggers require fasting enabled and non-athletic
        const windowDependent = ["pre_window", "break_fast", "mid_window", "last_meal"].includes(trig.key);
        if (windowDependent && (isAthletic || fastingOff)) continue;

        const fireAt = fireTimes[trig.key];
        if (fireAt === null || fireAt === undefined) continue;

        // Match current minute (with tolerance, handle wrap)
        const diff = Math.min(
          Math.abs(nowMins - fireAt),
          Math.abs(nowMins - fireAt + 24 * 60),
          Math.abs(nowMins - fireAt - 24 * 60),
        );
        if (diff > TOL) continue;

        const typeKey = `habit_loop_${trig.key}`;
        if (stats.types.has(typeKey)) continue;

        // Streak protection only fires if user hasn't logged
        if (trig.key === "streak_protection" && loggedToday.has(p.client_id)) continue;

        toInsert.push({
          user_id: p.client_id,
          title: trig.title,
          body: trig.body,
          type: typeKey,
          action_url: trig.key === "daily_score" ? "/client/progress" : "/client/dashboard",
          reference_id: today,
        });
        stats.count++;
        stats.types.add(typeKey);
      }
    }

    if (toInsert.length) {
      const { error: insErr } = await supabase.from("in_app_notifications").insert(toInsert);
      if (insErr) console.error("insert error:", insErr);
    }

    console.log(`habit-loop-scheduler: ${prefs.length} clients evaluated, ${toInsert.length} notifications sent`);
    return new Response(
      JSON.stringify({ processed: prefs.length, sent: toInsert.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("habit-loop-scheduler error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
