// Cron-driven habit reminder dispatcher (runs every minute).
// For each active habit with reminder_enabled=true, fires a push when the
// current minute (in the client's timezone) matches `reminder_time`.
// Skips habits already completed today.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWebPush } from "../_shared/web-push.ts";
import { nowInZone, getClientTimezone } from "../_shared/push-time.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: habits, error } = await supabase
      .from("client_habits")
      .select("id, client_id, name, reminder_time, frequency, end_date")
      .eq("is_active", true)
      .eq("reminder_enabled", true);
    if (error) throw error;

    let sent = 0;
    let failed = 0;
    let fired = 0;

    // Cache timezone per client across multiple habits.
    const tzCache: Record<string, string> = {};

    for (const h of habits ?? []) {
      if (!h.reminder_time) continue;
      if (h.end_date && new Date(h.end_date) < new Date()) continue;

      let tz = tzCache[h.client_id];
      if (!tz) {
        tz = await getClientTimezone(supabase, h.client_id);
        tzCache[h.client_id] = tz;
      }
      const { hhmm, date } = nowInZone(tz);
      const targetHHmm = String(h.reminder_time).slice(0, 5);
      if (hhmm !== targetHHmm) continue;

      // Skip if already completed today
      const { data: completion } = await supabase
        .from("habit_completions")
        .select("id")
        .eq("habit_id", h.id)
        .eq("completion_date", date)
        .maybeSingle();
      if (completion) continue;

      const refId = `${h.id}:${date}`;
      const { data: existing } = await supabase
        .from("notification_log")
        .select("id")
        .eq("user_id", h.client_id)
        .eq("kind", "habit")
        .eq("reference_id", refId)
        .eq("status", "sent")
        .maybeSingle();
      if (existing) continue;

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", h.client_id);
      if (!subs?.length) continue;

      let delivered = 0;
      for (const sub of subs) {
        const r = await sendWebPush(sub, {
          title: `Habit reminder: ${h.name}`,
          body: "Don't break the chain — log it now.",
          tag: `habit-${refId}`,
          url: "/client/habits",
          data: { kind: "habit", habit_id: h.id },
        });
        if (r.ok) { delivered++; sent++; }
        else {
          failed++;
          if (r.expired) await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }

      await supabase.from("notification_log").insert({
        user_id: h.client_id,
        kind: "habit",
        reference_id: refId,
        title: `Habit reminder: ${h.name}`,
        body: "Don't break the chain — log it now.",
        status: delivered > 0 ? "sent" : "failed",
        subscription_count: subs.length,
        delivered_count: delivered,
      });
      fired++;
    }

    return new Response(JSON.stringify({ ok: true, fired, sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("dispatch-habit-reminders error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});