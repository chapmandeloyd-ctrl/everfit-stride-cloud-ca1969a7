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

/** Append a delivery-history row. Never let logging break a send. */
async function recordAttempt(supabase: any, row: Record<string, unknown>) {
  try {
    await supabase.from("juice_fast_reminder_log").insert(row);
  } catch (e) {
    console.error("juice reminder log insert failed", e);
  }
}

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

  // ---- Test mode: caller-authenticated, immediate send, no time/dedupe gates ----
  let isTest = false;
  if (req.method === "POST") {
    try {
      const raw = await req.text();
      if (raw) isTest = !!JSON.parse(raw)?.test;
    } catch { /* cron sends {"time": ...} */ }
  }

  if (isTest) {
    try {
      const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      const { data: userData, error: authErr } = await supabase.auth.getUser(jwt);
      const userId = userData?.user?.id;
      if (authErr || !userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: s } = await supabase
        .from("juice_fast_sessions")
        .select("id, mode, planned_days, started_at")
        .eq("client_id", userId)
        .eq("status", "active")
        .maybeSingle();

      const tz = await getClientTimezone(supabase, userId);
      const plannedDays = s?.planned_days ?? 3;
      const dayNumber = s ? Math.max(1, dayNumberFor(s.started_at, tz)) : 1;
      const modeLabel = MODE_LABEL[s?.mode ?? ""] || "Juice fast";
      const title = `Test — log day ${dayNumber} of ${plannedDays} 🥤`;
      const body = "This is a test reminder. Delivery is working.";

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth, user_agent")
        .eq("user_id", userId);

      let delivered = 0, failedPush = 0;
      for (const sub of subs ?? []) {
        const r = await sendWebPush(sub, {
          title,
          body,
          tag: `juice-log-test`,
          url: "/client/dashboard",
          data: { kind: "juice_log_test" },
        });
        if (r.ok) delivered++;
        else {
          failedPush++;
          if (r.expired) {
            await recordExpiredSubscription(supabase, {
              subscription_id: sub.id,
              user_id: userId,
              endpoint: sub.endpoint,
              user_agent: (sub as any).user_agent,
              status: r.status,
              removed_by: "dispatch-juice-log-reminders",
            });
          }
        }
      }

      let emailSent = false;
      let emailError: string | null = null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", userId)
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
            idempotencyKey: `juice-log-test-${userId}-${Date.now()}`,
            templateData: { name: firstName, dayNumber, plannedDays, modeLabel },
          }),
        });
        emailSent = res.ok;
        if (!emailSent) emailError = await res.text();
      }

      const testRefId = `juice-log-test-${Date.now()}`;
      const { error: inAppErr } = await supabase.from("in_app_notifications").insert({
        user_id: userId,
        type: "juice_log_reminder",
        title,
        body,
        reference_id: testRefId,
        action_url: "/client/dashboard",
      });

      await recordAttempt(supabase, {
        client_id: userId,
        session_id: s?.id ?? null,
        trigger: "test",
        day_number: dayNumber,
        planned_days: plannedDays,
        title,
        body,
        subscription_count: subs?.length ?? 0,
        push_delivered_count: delivered,
        push_failed_count: failedPush,
        email_sent: emailSent,
        email_to: recipient ?? null,
        in_app_created: !inAppErr,
        status: delivered > 0 || emailSent ? "sent" : "failed",
        error: emailError ?? (delivered === 0 && !emailSent ? "No device or email reached" : null),
        reference_id: testRefId,
      });

      return new Response(
        JSON.stringify({
          ok: true,
          test: true,
          subscriptions: subs?.length ?? 0,
          pushed: delivered,
          pushFailed: failedPush,
          emailed: emailSent,
          emailTo: recipient ?? null,
          emailError,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err: any) {
      console.error("juice log test reminder error:", err);
      try {
        const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
        const { data: u } = await supabase.auth.getUser(jwt);
        if (u?.user?.id) {
          await recordAttempt(supabase, {
            client_id: u.user.id,
            trigger: "test",
            status: "error",
            error: err?.message || String(err),
          });
        }
      } catch { /* best effort */ }
      return new Response(JSON.stringify({ error: err?.message || String(err) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const { data: sessions, error } = await supabase
      .from("juice_fast_sessions")
      .select(
        "id, client_id, mode, planned_days, started_at, log_reminder_enabled, log_reminder_time, log_reminder_snoozed_until",
      )
      .eq("status", "active")
      .eq("log_reminder_enabled", true);
    if (error) throw error;

    let fired = 0, pushed = 0, emailed = 0, failed = 0, skipped = 0;

    for (const s of sessions ?? []) {
      const tz = await getClientTimezone(supabase, s.client_id);
      const { date: localDate, hour, minute } = nowInZone(tz);

      // Snooze wins over the saved time: silent until it elapses, then fires once.
      const snoozeMs = s.log_reminder_snoozed_until ? Date.parse(s.log_reminder_snoozed_until) : null;
      let dueBySnooze = false;
      if (snoozeMs && !Number.isNaN(snoozeMs)) {
        if (Date.now() < snoozeMs) { skipped++; continue; }
        dueBySnooze = true;
      }

      const target = toMinutes(s.log_reminder_time || "19:00");
      if (target === null) { skipped++; continue; }
      const nowMin = hour * 60 + minute;
      // 5-minute cron window: fire once the local clock has reached the target.
      if (!dueBySnooze && (nowMin < target || nowMin >= target + 5)) { skipped++; continue; }

      // Already logged today? Nothing to nag about.
      const { data: log } = await supabase
        .from("juice_fast_daily_logs")
        .select("id")
        .eq("session_id", s.id)
        .eq("log_date", localDate)
        .maybeSingle();
      if (log) { skipped++; continue; }

      const refId = dueBySnooze ? `${s.id}:${localDate}:s${snoozeMs}` : `${s.id}:${localDate}`;
      const { data: already } = await supabase
        .from("notification_log")
        .select("id")
        .eq("user_id", s.client_id)
        .eq("kind", "juice_log")
        .eq("reference_id", refId)
        .maybeSingle();
      if (already) { skipped++; continue; }

      // Consume the snooze so it can't re-fire on the next cron tick.
      if (dueBySnooze) {
        await supabase
          .from("juice_fast_sessions")
          .update({ log_reminder_snoozed_until: null })
          .eq("id", s.id);
      }

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
      let emailError: string | null = null;
      let emailRecipient: string | null = null;
      if (delivered === 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", s.client_id)
          .maybeSingle();
        const recipient = (profile as any)?.email;
        emailRecipient = recipient ?? null;
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
          else {
            emailError = await res.text();
            console.error("juice log email failed", emailError);
          }
        }
      }

      // In-app notification so the reminder is visible even without push/email.
      const { error: inAppErr } = await supabase.from("in_app_notifications").insert({
        user_id: s.client_id,
        type: "juice_log_reminder",
        title,
        body,
        reference_id: refId,
        action_url: "/client/dashboard",
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

      await recordAttempt(supabase, {
        client_id: s.client_id,
        session_id: s.id,
        trigger: dueBySnooze ? "snoozed" : "scheduled",
        day_number: dayNumber,
        planned_days: s.planned_days,
        title,
        body,
        subscription_count: subs?.length ?? 0,
        push_delivered_count: delivered,
        push_failed_count: Math.max(0, (subs?.length ?? 0) - delivered),
        email_sent: emailSent,
        email_to: emailRecipient,
        in_app_created: !inAppErr,
        status: delivered > 0 || emailSent ? "sent" : "failed",
        error: emailError ?? (delivered === 0 && !emailSent ? "No device or email reached" : null),
        reference_id: refId,
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
