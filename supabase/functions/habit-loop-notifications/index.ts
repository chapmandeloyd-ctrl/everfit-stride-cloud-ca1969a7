import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClientState {
  client_id: string;
  fasting_enabled: boolean;
  active_fast_start_at: string | null;
  active_fast_target_hours: number | null;
  eating_window_hours: number;
  eating_window_ends_at: string | null;
  last_fast_ended_at: string | null;
}

interface HabitPrefs {
  max_daily_notifications: number;
  reduce_if_ignored: boolean;
  pre_window_enabled: boolean;
  break_fast_enabled: boolean;
  mid_window_enabled: boolean;
  last_meal_enabled: boolean;
  streak_protection_enabled: boolean;
  daily_score_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

const NOTIFICATION_MESSAGES: Record<string, string[]> = {
  pre_window: [
    "Your window opens soon — break your fast correctly",
    "Almost time — prepare your first meal with protein",
    "Window opening shortly — stay disciplined",
  ],
  break_fast: [
    "Time to break your fast — start with protein",
    "Window is open — fuel up with a clean meal",
    "Break your fast now — protein first, always",
  ],
  mid_window: [
    "Stay on track — hit your protein target",
    "Halfway through your window — are your macros on point?",
    "Mid-window check — keep pushing toward your targets",
  ],
  last_meal: [
    "Close your window strong — make your last meal count",
    "Final meal incoming — lock in your macros",
    "Last chance to hit your targets — finish strong",
  ],
  streak_protection: [
    "Don't break your streak — stay locked in",
    "Your streak is on the line — one more push",
    "Protect what you've built — stay consistent",
  ],
  daily_score: [
    "You're close to a Perfect Day — finish strong",
    "Great discipline today — keep it locked",
    "Reset tomorrow — stay disciplined",
  ],
};

function pickMessage(type: string, _seed?: number): string {
  const msgs = NOTIFICATION_MESSAGES[type] || ["Stay on track"];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

function isInQuietHours(now: Date, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  if (startMins <= endMins) return mins >= startMins && mins < endMins;
  return mins >= startMins || mins < endMins;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Get all clients with fasting enabled
    const { data: clients } = await supabase
      .from("client_feature_settings")
      .select("client_id, fasting_enabled, active_fast_start_at, active_fast_target_hours, eating_window_hours, eating_window_ends_at, last_fast_ended_at")
      .eq("fasting_enabled", true);

    if (!clients?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientIds = clients.map((c: ClientState) => c.client_id);

    // Batch fetch preferences and today's notifications
    const [prefsRes, sentTodayRes, streakRes, scoreRes] = await Promise.all([
      supabase
        .from("habit_loop_preferences")
        .select("*")
        .in("client_id", clientIds),
      supabase
        .from("habit_loop_notifications")
        .select("client_id, notification_type")
        .in("client_id", clientIds)
        .gte("scheduled_for", todayStart.toISOString())
        .not("sent_at", "is", null),
      supabase
        .from("client_consistency_streaks")
        .select("client_id, current_streak, last_scored_date")
        .in("client_id", clientIds),
      supabase
        .from("daily_checkins")
        .select("client_id, checkin_date, mood_score")
        .in("client_id", clientIds)
        .eq("checkin_date", now.toISOString().slice(0, 10)),
    ]);

    const prefsMap = new Map<string, HabitPrefs>();
    (prefsRes.data || []).forEach((p: any) => prefsMap.set(p.client_id, p));

    // Count notifications sent today per client
    const sentCountMap = new Map<string, Map<string, number>>();
    (sentTodayRes.data || []).forEach((n: any) => {
      if (!sentCountMap.has(n.client_id)) sentCountMap.set(n.client_id, new Map());
      const typeMap = sentCountMap.get(n.client_id)!;
      typeMap.set(n.notification_type, (typeMap.get(n.notification_type) || 0) + 1);
    });

    const streakMap = new Map<string, number>();
    (streakRes.data || []).forEach((s: any) => streakMap.set(s.client_id, s.current_streak || 0));

    const notificationsToInsert: any[] = [];
    const inAppToInsert: any[] = [];

    for (const client of clients as ClientState[]) {
      const cid = client.client_id;
      const prefs: HabitPrefs = prefsMap.get(cid) || {
        max_daily_notifications: 3,
        reduce_if_ignored: true,
        pre_window_enabled: true,
        break_fast_enabled: true,
        mid_window_enabled: true,
        last_meal_enabled: true,
        streak_protection_enabled: true,
        daily_score_enabled: true,
        quiet_hours_start: null,
        quiet_hours_end: null,
      };

      // Check quiet hours
      if (isInQuietHours(now, prefs.quiet_hours_start, prefs.quiet_hours_end)) continue;

      // Count today's sent notifications
      const todayTypes = sentCountMap.get(cid) || new Map();
      const totalSentToday = Array.from(todayTypes.values()).reduce((a, b) => a + b, 0);
      if (totalSentToday >= prefs.max_daily_notifications) continue;

      // Determine which notification to send based on fasting state
      let notifType: string | null = null;
      let message: string | null = null;

      const hasActiveFast = !!client.active_fast_start_at;
      const lastFastEnded = client.last_fast_ended_at ? new Date(client.last_fast_ended_at) : null;
      const eatingWindowEnd = client.eating_window_ends_at ? new Date(client.eating_window_ends_at) : null;
      const windowHours = client.eating_window_hours || 8;

      if (hasActiveFast && client.active_fast_start_at) {
        // Currently fasting
        const fastStart = new Date(client.active_fast_start_at);
        const targetHours = client.active_fast_target_hours || 16;
        const fastEndTime = new Date(fastStart.getTime() + targetHours * 3600000);
        const minsUntilEnd = (fastEndTime.getTime() - now.getTime()) / 60000;

        if (minsUntilEnd <= 15 && minsUntilEnd > 0 && prefs.pre_window_enabled && !todayTypes.has("pre_window")) {
          notifType = "pre_window";
        }
      } else if (lastFastEnded) {
        // Currently in eating window
        const hoursSinceFastEnd = (now.getTime() - lastFastEnded.getTime()) / 3600000;

        if (hoursSinceFastEnd <= 0.25 && prefs.break_fast_enabled && !todayTypes.has("break_fast")) {
          notifType = "break_fast";
        } else if (hoursSinceFastEnd >= windowHours * 0.4 && hoursSinceFastEnd <= windowHours * 0.6 && prefs.mid_window_enabled && !todayTypes.has("mid_window")) {
          notifType = "mid_window";
        } else if (eatingWindowEnd) {
          const minsUntilClose = (eatingWindowEnd.getTime() - now.getTime()) / 60000;
          if (minsUntilClose >= 60 && minsUntilClose <= 90 && prefs.last_meal_enabled && !todayTypes.has("last_meal")) {
            notifType = "last_meal";
          }
        }
      }

      // Streak protection — check if streak > 0 and no check-in today
      if (!notifType && prefs.streak_protection_enabled && !todayTypes.has("streak_protection")) {
        const streak = streakMap.get(cid) || 0;
        if (streak >= 2 && now.getHours() >= 18) {
          // Evening and hasn't logged — streak at risk
          const hasCheckin = scoreRes.data?.some((c: any) => c.client_id === cid);
          if (!hasCheckin) {
            notifType = "streak_protection";
          }
        }
      }

      // Daily score — end of day
      if (!notifType && prefs.daily_score_enabled && !todayTypes.has("daily_score") && now.getHours() >= 20) {
        notifType = "daily_score";
      }

      if (notifType && totalSentToday < prefs.max_daily_notifications) {
        message = pickMessage(notifType);
        notificationsToInsert.push({
          client_id: cid,
          notification_type: notifType,
          message,
          scheduled_for: now.toISOString(),
          sent_at: now.toISOString(),
        });
        inAppToInsert.push({
          user_id: cid,
          title: "🔔 Coach Alert",
          body: message,
          action_url: "/meals",
        });
      }
    }

    // Batch insert
    if (notificationsToInsert.length > 0) {
      await Promise.all([
        supabase.from("habit_loop_notifications").insert(notificationsToInsert),
        supabase.from("in_app_notifications").insert(inAppToInsert),
      ]);
    }

    return new Response(
      JSON.stringify({ processed: clients.length, sent: notificationsToInsert.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Habit loop error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
