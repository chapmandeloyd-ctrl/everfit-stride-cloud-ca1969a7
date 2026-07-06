// Runs hourly. For each client with an assigned protocol_start_date, fires:
//   - day_before  @ 18:00 client local time on start_date - 1
//   - morning_of  @ 08:00 client local time on start_date
//   - missed_d1   @ 20:00 client local time on start_date (if no fasting_log)
//   - missed_d2   @ 20:00 client local time on start_date + 1 (if still none)
//   - missed_d3   @ 20:00 client local time on start_date + 2 (if still none)
// A client is "started" once ANY fasting_log row exists with start_time >=
// protocol_start_date. Dedup via notification_log (kind='plan_start_reminder').

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWebPush, recordExpiredSubscription } from "../_shared/web-push.ts";
import { nowInZone, getClientTimezone } from "../_shared/push-time.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Kind = "day_before" | "morning_of" | "missed_d1" | "missed_d2" | "missed_d3";

const COPY: Record<Kind, { title: string; body: string }> = {
  day_before: {
    title: "Your plan starts tomorrow 🎯",
    body: "Get ready — your 14-day protocol kicks off in the morning.",
  },
  morning_of: {
    title: "Today's the day 🔥",
    body: "Your protocol starts today. Tap to begin your first fast.",
  },
  missed_d1: {
    title: "You haven't started yet",
    body: "Your plan began today. Tap to log your first fast and stay on track.",
  },
  missed_d2: {
    title: "Day 2 — still time to start",
    body: "You're one tap away from getting back on plan.",
  },
  missed_d3: {
    title: "Last nudge — let's begin",
    body: "Start today so your coach knows you're in. We're rooting for you.",
  },
};

function daysBetween(startISO: string, todayISO: string): number {
  const s = new Date(startISO + "T00:00:00Z").getTime();
  const t = new Date(todayISO + "T00:00:00Z").getTime();
  return Math.round((t - s) / 86_400_000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results = { checked: 0, fired: 0, sent: 0, failed: 0, skipped: 0 };

  try {
    const { data: settings, error } = await supabase
      .from("client_feature_settings")
      .select("client_id, protocol_start_date, assigned_protocol_duration_days, fasting_enabled")
      .not("protocol_start_date", "is", null);
    if (error) throw error;

    for (const s of settings ?? []) {
      results.checked++;
      if (s.fasting_enabled === false) { results.skipped++; continue; }

      const tz = await getClientTimezone(supabase, s.client_id);
      const { date: today, hour } = nowInZone(tz);
      const startDate = String(s.protocol_start_date).slice(0, 10);
      const offset = daysBetween(startDate, today); // -1 = day before, 0 = start day

      let kind: Kind | null = null;
      if (offset === -1 && hour === 18) kind = "day_before";
      else if (offset === 0 && hour === 8) kind = "morning_of";
      else if (offset === 0 && hour === 20) kind = "missed_d1";
      else if (offset === 1 && hour === 20) kind = "missed_d2";
      else if (offset === 2 && hour === 20) kind = "missed_d3";
      if (!kind) continue;

      // For "missed" kinds, confirm no fast has been logged since start_date
      if (kind.startsWith("missed")) {
        const { data: logs } = await supabase
          .from("fasting_log")
          .select("id")
          .eq("client_id", s.client_id)
          .gte("started_at", startDate + "T00:00:00Z")
          .limit(1);
        if (logs && logs.length > 0) { results.skipped++; continue; }
      }

      const refId = `${startDate}:${kind}`;
      const { data: existing } = await supabase
        .from("notification_log").select("id")
        .eq("user_id", s.client_id).eq("kind", "plan_start_reminder")
        .eq("reference_id", refId).eq("status", "sent").maybeSingle();
      if (existing) { results.skipped++; continue; }

      const copy = COPY[kind];

      // In-app notification (schema: type, action_url — no kind/url/metadata)
      await supabase.from("in_app_notifications").insert({
        user_id: s.client_id,
        type: "plan_start_reminder",
        title: copy.title,
        body: copy.body,
        action_url: "/client/dashboard",
        reference_id: refId,
      });

      // Push
      const { data: subs } = await supabase
        .from("push_subscriptions").select("id, endpoint, p256dh, auth, user_agent")
        .eq("user_id", s.client_id);

      let delivered = 0;
      for (const sub of subs ?? []) {
        const r = await sendWebPush(sub, {
          title: copy.title,
          body: copy.body,
          tag: `plan-start-${kind}`,
          url: "/client/dashboard",
          data: { kind: "plan_start_reminder", offset },
        });
        if (r.ok) { delivered++; results.sent++; }
        else {
          results.failed++;
          if (r.expired) await recordExpiredSubscription(supabase, {
            subscription_id: sub.id,
            user_id: s.client_id,
            endpoint: sub.endpoint,
            user_agent: (sub as any).user_agent,
            status: r.status,
            removed_by: "dispatch-plan-start-reminders",
          });
        }
      }

      await supabase.from("notification_log").insert({
        user_id: s.client_id,
        kind: "plan_start_reminder",
        reference_id: refId,
        title: copy.title,
        body: copy.body,
        status: delivered > 0 || (subs?.length ?? 0) === 0 ? "sent" : "failed",
        subscription_count: subs?.length ?? 0,
        delivered_count: delivered,
      });
      results.fired++;
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("dispatch-plan-start-reminders error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});