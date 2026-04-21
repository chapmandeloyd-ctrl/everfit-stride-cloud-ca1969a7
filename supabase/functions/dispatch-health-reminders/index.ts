// Cron-driven health reminder dispatcher.
// Runs every minute. For each enabled `client_health_reminders` row, checks
// whether the current minute (in the client's timezone) matches one of the
// configured times. If so, sends a Web Push to all of that user's devices.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWebPush, recordExpiredSubscription } from "../_shared/web-push.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function nowInZone(tz: string): { hhmm: string; date: string } {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(new Date()).map((p) => [p.type, p.value]),
    );
    return {
      hhmm: `${parts.hour}:${parts.minute}`,
      date: `${parts.year}-${parts.month}-${parts.day}`,
    };
  } catch {
    const d = new Date();
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return {
      hhmm: `${hh}:${mm}`,
      date: d.toISOString().slice(0, 10),
    };
  }
}

const REMINDER_COPY = [
  { title: "Morning check-in 🌅", body: "Log how you're feeling, fueling, and moving today." },
  { title: "Midday check-in ☀️", body: "Quick pulse — water, energy, and meals so far?" },
  { title: "Evening check-in 🌙", body: "Wrap the day: log your last meal and how training felt." },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Pull every enabled reminder. (Volume is small — one row per client.)
    const { data: reminders, error } = await supabase
      .from("client_health_reminders")
      .select("client_id, times, timezone, enabled")
      .eq("enabled", true);

    if (error) throw error;

    let firedFor = 0;
    let totalSent = 0;
    let totalFailed = 0;

    for (const r of reminders ?? []) {
      const tz = r.timezone || "UTC";
      const { hhmm, date } = nowInZone(tz);
      const times: string[] = Array.isArray(r.times) ? r.times : [];
      const slotIndex = times.findIndex((t) => t === hhmm);
      if (slotIndex === -1) continue;

      const refId = `${date}T${hhmm}`;

      // Dedupe — skip if we already logged a send for this user/slot today.
      const { data: existing } = await supabase
        .from("notification_log")
        .select("id")
        .eq("user_id", r.client_id)
        .eq("kind", "health_reminder")
        .eq("reference_id", refId)
        .eq("status", "sent")
        .maybeSingle();
      if (existing) continue;

      // Look up subscriptions
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth, user_agent")
        .eq("user_id", r.client_id);

      if (!subs || subs.length === 0) continue;

      const copy = REMINDER_COPY[Math.min(slotIndex, REMINDER_COPY.length - 1)];
      let delivered = 0;

      for (const sub of subs) {
        const result = await sendWebPush(sub, {
          title: copy.title,
          body: copy.body,
          tag: `health-reminder-${refId}`,
          url: "/client/dashboard",
          data: { kind: "health_reminder", slot: hhmm },
        });
        if (result.ok) {
          delivered++;
          totalSent++;
        } else {
          totalFailed++;
          if (result.expired) {
            await recordExpiredSubscription(supabase, {
              subscription_id: sub.id,
              user_id: r.client_id,
              endpoint: sub.endpoint,
              user_agent: (sub as any).user_agent,
              status: result.status,
              removed_by: "dispatch-health-reminders",
            });
          }
          console.error(`Push failed for ${r.client_id}: ${result.status} ${result.error}`);
        }
      }

      await supabase.from("notification_log").insert({
        user_id: r.client_id,
        kind: "health_reminder",
        reference_id: refId,
        title: copy.title,
        body: copy.body,
        status: delivered > 0 ? "sent" : "failed",
        subscription_count: subs.length,
        delivered_count: delivered,
      });

      firedFor++;
    }

    return new Response(
      JSON.stringify({ ok: true, fired_for: firedFor, sent: totalSent, failed: totalFailed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("dispatch-health-reminders error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});