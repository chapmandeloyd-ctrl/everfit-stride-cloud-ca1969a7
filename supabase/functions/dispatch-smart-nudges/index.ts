// Hourly smart nudge engine.
// Two nudges to start:
//   - "missed_workout": fires at 18:00 local if the client has no
//     workout_session today and has nudge_workout enabled.
//   - "sleep_winddown": fires at 21:00 local if nudge_sleep enabled.
// Respects client_feature_settings.nudge_enabled and quiet hours.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWebPush, recordExpiredSubscription } from "../_shared/web-push.ts";
import { nowInZone, getClientTimezone } from "../_shared/push-time.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function inQuietHours(hour: number, start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;
  const s = parseInt(start.slice(0, 2), 10);
  const e = parseInt(end.slice(0, 2), 10);
  if (isNaN(s) || isNaN(e)) return false;
  if (s === e) return false;
  if (s < e) return hour >= s && hour < e;
  return hour >= s || hour < e; // wraps midnight
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: settings, error } = await supabase
      .from("client_feature_settings")
      .select("client_id, nudge_enabled, nudge_workout, nudge_sleep, quiet_hours_start, quiet_hours_end")
      .eq("nudge_enabled", true);
    if (error) throw error;

    let sent = 0, failed = 0, fired = 0;
    const tzCache: Record<string, string> = {};

    for (const s of settings ?? []) {
      const tz = tzCache[s.client_id] || (tzCache[s.client_id] = await getClientTimezone(supabase, s.client_id));
      const { hour, minute, date } = nowInZone(tz);

      if (inQuietHours(hour, s.quiet_hours_start, s.quiet_hours_end)) continue;
      // Cron runs hourly at :00, so only react when minute is small (avoid double-firing).
      if (minute > 5) continue;

      // ----- Missed workout nudge -----
      if (s.nudge_workout && hour === 18) {
        const refId = `missed_workout:${date}`;
        const { data: existing } = await supabase
          .from("notification_log").select("id")
          .eq("user_id", s.client_id).eq("kind", "nudge")
          .eq("reference_id", refId).eq("status", "sent").maybeSingle();
        if (!existing) {
          // Did they train today?
          const dayStart = new Date(`${date}T00:00:00`);
          const { data: sess } = await supabase
            .from("workout_sessions")
            .select("id")
            .eq("client_id", s.client_id)
            .gte("started_at", dayStart.toISOString())
            .limit(1);
          if (!sess?.length) {
            const { data: subs } = await supabase
              .from("push_subscriptions").select("id, endpoint, p256dh, auth, user_agent")
              .eq("user_id", s.client_id);
            if (subs?.length) {
              let delivered = 0;
              for (const sub of subs) {
                const r = await sendWebPush(sub, {
                  title: "Still time to move 💪",
                  body: "No workout logged yet today. A 10-minute session counts.",
                  tag: `nudge-missed-workout-${date}`,
                  url: "/client/workouts",
                  data: { kind: "nudge", nudge: "missed_workout" },
                });
                if (r.ok) { delivered++; sent++; }
                else {
                  failed++;
                  if (r.expired) await recordExpiredSubscription(supabase, {
                    subscription_id: sub.id,
                    user_id: s.client_id,
                    endpoint: sub.endpoint,
                    user_agent: (sub as any).user_agent,
                    status: r.status,
                    removed_by: "dispatch-smart-nudges",
                  });
                }
              }
              await supabase.from("notification_log").insert({
                user_id: s.client_id, kind: "nudge", reference_id: refId,
                title: "Still time to move 💪",
                body: "No workout logged yet today.",
                status: delivered > 0 ? "sent" : "failed",
                subscription_count: subs.length, delivered_count: delivered,
              });
              fired++;
            }
          }
        }
      }

      // ----- Sleep wind-down nudge -----
      if (s.nudge_sleep && hour === 21) {
        const refId = `sleep_winddown:${date}`;
        const { data: existing } = await supabase
          .from("notification_log").select("id")
          .eq("user_id", s.client_id).eq("kind", "nudge")
          .eq("reference_id", refId).eq("status", "sent").maybeSingle();
        if (!existing) {
          const { data: subs } = await supabase
            .from("push_subscriptions").select("id, endpoint, p256dh, auth, user_agent")
            .eq("user_id", s.client_id);
          if (subs?.length) {
            let delivered = 0;
            for (const sub of subs) {
              const r = await sendWebPush(sub, {
                title: "Wind-down time 🌙",
                body: "Dim the lights, hydrate, and aim for 7+ hours tonight.",
                tag: `nudge-sleep-${date}`,
                url: "/client/dashboard",
                data: { kind: "nudge", nudge: "sleep_winddown" },
              });
              if (r.ok) { delivered++; sent++; }
              else {
                failed++;
                if (r.expired) await recordExpiredSubscription(supabase, {
                  subscription_id: sub.id,
                  user_id: s.client_id,
                  endpoint: sub.endpoint,
                  user_agent: (sub as any).user_agent,
                  status: r.status,
                  removed_by: "dispatch-smart-nudges",
                });
              }
            }
            await supabase.from("notification_log").insert({
              user_id: s.client_id, kind: "nudge", reference_id: refId,
              title: "Wind-down time 🌙",
              body: "Dim the lights, hydrate, aim for 7+ hours.",
              status: delivered > 0 ? "sent" : "failed",
              subscription_count: subs.length, delivered_count: delivered,
            });
            fired++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, fired, sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("dispatch-smart-nudges error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});