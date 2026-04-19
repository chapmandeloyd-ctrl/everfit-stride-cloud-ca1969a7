import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Returns true if "now" (HH:MM in client local — we approximate UTC) falls in the quiet window
function inQuietHours(nowMins: number, start: string | null, end: string | null) {
  if (!start || !end) return false;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (s === e) return false;
  if (s < e) return nowMins >= s && nowMins < e;
  // wraps midnight
  return nowMins >= s || nowMins < e;
}

// How many nudges allowed per day per frequency setting
const FREQ_CAP: Record<string, number> = { low: 1, medium: 2, high: 3 };

// Nudge slot definitions: time-of-day windows where each type can fire
// (UTC minutes from midnight, 5-min cron tolerance)
const SLOTS = [
  { type: "checkin",   prefKey: "nudge_checkin",  hourUTC: 13, title: "👋 Daily check-in", body: "How's your day going? Take 30 seconds to log how you feel." },
  { type: "workout",   prefKey: "nudge_workout",  hourUTC: 16, title: "💪 Workout reminder", body: "Don't forget your training session today." },
  { type: "fasting",   prefKey: "nudge_fasting",  hourUTC: 11, title: "⏱️ Fasting check", body: "Stay strong — your fasting window is on track." },
  { type: "sleep",     prefKey: "nudge_sleep",    hourUTC: 2,  title: "🌙 Wind down", body: "Time to start winding down for quality sleep." },
  { type: "recovery",  prefKey: "nudge_recovery", hourUTC: 19, title: "🧘 Recovery moment", body: "Take 5 minutes for breathing or stretching." },
];

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

    // Find which slot (if any) we're currently in (within ±5 min of slot hour)
    const activeSlots = SLOTS.filter(s => Math.abs(nowMins - s.hourUTC * 60) <= 5);
    if (!activeSlots.length) {
      return new Response(JSON.stringify({ skipped: "no slot active", nowMins }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all clients with nudges enabled
    const { data: clients, error } = await supabase
      .from("client_feature_settings")
      .select("client_id, nudge_enabled, nudge_frequency, quiet_hours_start, quiet_hours_end, nudge_checkin, nudge_workout, nudge_fasting, nudge_sleep, nudge_recovery, engine_mode")
      .eq("nudge_enabled", true);

    if (error) throw error;
    if (!clients?.length) {
      return new Response(JSON.stringify({ processed: 0, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientIds = clients.map((c: any) => c.client_id);

    // Pull today's nudge history per client to enforce daily caps + dedupe per type
    const { data: todayNotifs } = await supabase
      .from("in_app_notifications")
      .select("user_id, type, reference_id")
      .in("user_id", clientIds)
      .gte("created_at", today + "T00:00:00.000Z")
      .like("type", "nudge_%");

    const sentToday = new Map<string, { count: number; types: Set<string> }>();
    (todayNotifs || []).forEach((n: any) => {
      const cur = sentToday.get(n.user_id) || { count: 0, types: new Set() };
      cur.count++;
      cur.types.add(n.type);
      sentToday.set(n.user_id, cur);
    });

    const toInsert: any[] = [];

    for (const c of clients as any[]) {
      // Respect quiet hours
      if (inQuietHours(nowMins, c.quiet_hours_start, c.quiet_hours_end)) continue;

      const cap = FREQ_CAP[c.nudge_frequency || "medium"] ?? 2;
      const stats = sentToday.get(c.client_id) || { count: 0, types: new Set<string>() };
      if (stats.count >= cap) continue;

      for (const slot of activeSlots) {
        // Athletic engine: skip fasting nudges
        if (c.engine_mode === "athletic" && slot.type === "fasting") continue;
        // Per-type toggle off?
        if (c[slot.prefKey] === false) continue;
        // Already sent this type today?
        const typeKey = `nudge_${slot.type}`;
        if (stats.types.has(typeKey)) continue;
        // Cap reached after this push?
        if (stats.count >= cap) break;

        toInsert.push({
          user_id: c.client_id,
          title: slot.title,
          body: slot.body,
          type: typeKey,
          action_url: "/client/dashboard",
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

    console.log(`smart-nudges: ${clients.length} clients, ${activeSlots.length} active slot(s), ${toInsert.length} sent`);
    return new Response(
      JSON.stringify({ processed: clients.length, sent: toInsert.length, slots: activeSlots.map(s => s.type) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("smart-nudges error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
