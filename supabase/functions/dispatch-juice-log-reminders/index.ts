// Cron-driven daily juice-log reminder dispatcher (runs every 5 minutes).
//
// For every ACTIVE juice fast with log_reminder_enabled = true, checks whether
// the client's local time has reached their configured reminder time today.
// If today's juice_fast_daily_logs row already exists, nothing is sent.
// Delivery: Web Push to every registered device; falls back to email when the
// client has no push subscriptions. Deduped through notification_log.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWebPush, recordExpiredSubscription } from "../_shared/web-push.ts";
import { nowInZone, getClientTimezone } from "../_shared/push-time.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MODE_LABEL: Record<string, string> = {
  juice_only: "Juice Only",
  juice_plus_light: "Juice + Light",
};

/** Minutes since local midnight for an "HH:MM" string. */
function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || "");
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** Day number (1-based) of a session on a given local date. */
function dayNumberFor(startedAt: string, tz: string): number {
  const startLocal = nowInZoneDate(startedAt, tz);
  const today = nowInZone(tz).date;
  const diff = Math.floor(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${startLocal}T00:00:00Z`)) / 86_400_000,
  );
  return diff + 1;
}

function nowInZoneDate(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { data: sessions, error } = await supabase
      .from("juice_fast_sessions")
      .select("id, client_id, mode, planned_days, started_at, log_reminder_enabled, log_reminder_time")
      .eq("status", "active")
      .eq("log_reminder_enabled", true);
    if (error) throw error;

    let fired = 0, pushed = 0, emailed = 0, failed = 0, skipped = 0;

    for (const s of sessions ?? []) {
      const tz = await getClientTimezone(supabase, s.client_id);
      const { date: localDate, hour, minute } = nowInZone(tz);

      const target = toMinutes(s.log_reminder_time || "19:00");
      if (target === null) { skipped++; continue; }
      const nowMin = hour * 60 + minute;
      // 5-minute cron window: fire once the local clock has reached the target.
      if (nowMin < target || nowMin >= target + 5) { skipped++; continue; }

      // Already logged today? Nothing to nag about.
      const { data: log } = await supabase
        .from("juice_fast_daily_logs")
        .select("id")
        .eq("session_id", s.id)
        .eq("log_date", localDate)
        .maybeSingle();
      if (log) { skipped++; continue; }

      const refId = `${s.id}:${localDate}`;
      const { data: already } = await supabase
        .from("notification_log")
        .select("id")
        .eq("user_id", s.client_id)
        .eq("kind", "juice_log")
        .eq("reference_id", refId)
        .maybeSingle();
      if (already) { skipped++; continue; }

      const dayNumber = Math.max(1, dayNumberFor(s.started_at, tz));
      const modeLabel = MODE_LABEL[s.mode] || "Juice fast";
      const title = `Log day ${dayNumber} of ${s.planned_days} 🥤`;
      const body = "Twenty seconds — juices, water, energy and how you felt.";

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth, user_agent")
        .eq("user_id", s.client_id);

      let delivered = 0;
      for (const sub of subs ?? []) {
        const r = await sendWebPush(sub, {
          title,
          body,
          tag: `juice-log-${s.id}`,
          url: "/client/dashboard",
          data: { kind: "juice_log", session_id: s.id, day_number: dayNumber },
        });
        if (r.ok) { delivered++; pushed++; }
        else {
          failed++;
          if (r.expired) {
            await recordExpiredSubscription(supabase, {
              subscription_id: sub.id,
              user_id: s.client_id,
              endpoint: sub.endpoint,
              user_agent: (sub as any).user_agent,
              status: r.status,
              removed_by: "dispatch-juice-log-reminders",
            });
          }
        }
      }

      // Email fallback when no device could be reached.
      let emailSent = false;
      if (delivered === 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", s.client_id)
          .maybeSingle();
        const recipient = (profile as any)?.email;
        if (recipient) {
          const firstName = ((profile as any)?.full_name || "").trim().split(/\s+/)[0] || undefined;
          const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
            body: JSON.stringify({
              templateName: "juice-log-reminder",
              recipientEmail: recipient,
              idempotencyKey: `juice-log-${refId}`,
              templateData: {
                name: firstName,
                dayNumber,
                plannedDays: s.planned_days,
                modeLabel,
              },
            }),
          });
          emailSent = res.ok;
          if (emailSent) emailed++;
          else console.error("juice log email failed", await res.text());
        }
      }

      // In-app notification so the reminder is visible even without push/email.
      await supabase.from("in_app_notifications").insert({
        user_id: s.client_id,
        kind: "juice_log",
        title,
        body,
        link: "/client/dashboard",
      });

      await supabase.from("notification_log").insert({
        user_id: s.client_id,
        kind: "juice_log",
        reference_id: refId,
        title,
        body,
        status: delivered > 0 || emailSent ? "sent" : "failed",
        subscription_count: subs?.length ?? 0,
        delivered_count: delivered,
      });
      fired++;
    }

    return new Response(JSON.stringify({ ok: true, fired, pushed, emailed, failed, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("dispatch-juice-log-reminders error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
