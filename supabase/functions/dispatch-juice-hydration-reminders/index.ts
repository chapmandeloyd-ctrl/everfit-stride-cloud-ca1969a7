// Cron-driven hydration + electrolyte reminders during an active juice fast.
// Runs every 5 minutes. For each active session with hydration reminders on,
// fires when the client's local time is inside their window AND at least
// hydration_interval_hours have passed since the last hydration nudge.

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

/** Rotating hydration / electrolyte prompts so the nudge never feels canned. */
const TIPS: { title: string; body: string }[] = [
  { title: "💧 Water check", body: "Sip 12–16 oz now. Steady water keeps the stage transitions smooth." },
  { title: "⚡ Electrolyte top-up", body: "Add sodium, potassium and magnesium — that's what stops the headache and fatigue." },
  { title: "💧 Hydration break", body: "Between juices? Plain water with a pinch of salt is your friend right now." },
  { title: "⚡ Minerals matter", body: "A cup of broth or an electrolyte packet keeps energy flat-lining instead of crashing." },
  { title: "💧 Stay ahead of thirst", body: "If you're thirsty you're already behind. 12 oz water, then back to it." },
];

function toMinutes(hhmm: string | null, fallback: number): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || "");
  if (!m) return fallback;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function dayNumber(startedAt: string): number {
  return Math.max(1, Math.floor((Date.now() - Date.parse(startedAt)) / 86_400_000) + 1);
}

async function deliver(
  supabase: any,
  clientId: string,
  sessionId: string,
  title: string,
  body: string,
  refId: string,
) {
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_agent")
    .eq("user_id", clientId);

  let delivered = 0;
  for (const sub of subs ?? []) {
    const r = await sendWebPush(sub, {
      title,
      body,
      tag: `juice-hydration-${sessionId}`,
      url: "/client/dashboard",
      data: { kind: "juice_hydration", session_id: sessionId },
    });
    if (r.ok) delivered++;
    else if (r.expired) {
      await recordExpiredSubscription(supabase, {
        subscription_id: sub.id,
        user_id: clientId,
        endpoint: sub.endpoint,
        user_agent: (sub as any).user_agent,
        status: r.status,
        removed_by: "dispatch-juice-hydration-reminders",
      });
    }
  }

  await supabase.from("in_app_notifications").insert({
    user_id: clientId,
    type: "juice_hydration_reminder",
    title,
    body,
    reference_id: refId,
    action_url: "/client/dashboard",
  });

  return { delivered, subscriptions: subs?.length ?? 0 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // ---- Test mode: caller-authenticated, immediate send ----
  let isTest = false;
  if (req.method === "POST") {
    try {
      const raw = await req.text();
      if (raw) isTest = !!JSON.parse(raw)?.test;
    } catch { /* cron body */ }
  }

  if (isTest) {
    try {
      const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(jwt);
      const userId = userData?.user?.id;
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: s } = await supabase
        .from("juice_fast_sessions")
        .select("id")
        .eq("client_id", userId)
        .eq("status", "active")
        .maybeSingle();

      const tip = TIPS[0];
      const res = await deliver(
        supabase,
        userId,
        s?.id ?? "test",
        `Test — ${tip.title}`,
        tip.body,
        `juice-hydration-test-${Date.now()}`,
      );
      return new Response(JSON.stringify({ ok: true, test: true, pushed: res.delivered, subscriptions: res.subscriptions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
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
        "id, client_id, started_at, hydration_reminder_enabled, hydration_interval_hours, hydration_window_start, hydration_window_end, hydration_last_sent_at",
      )
      .eq("status", "active")
      .eq("hydration_reminder_enabled", true);
    if (error) throw error;

    let fired = 0, pushed = 0, skipped = 0;

    for (const s of sessions ?? []) {
      const tz = await getClientTimezone(supabase, s.client_id);
      const { hour, minute } = nowInZone(tz);
      const nowMin = hour * 60 + minute;
      const startMin = toMinutes(s.hydration_window_start, 8 * 60);
      const endMin = toMinutes(s.hydration_window_end, 20 * 60);
      if (nowMin < startMin || nowMin > endMin) { skipped++; continue; }

      const intervalMs = Math.max(1, s.hydration_interval_hours ?? 3) * 3_600_000;
      const last = s.hydration_last_sent_at ? Date.parse(s.hydration_last_sent_at) : null;
      // Slight tolerance so a 5-min cron never drifts a whole cycle late.
      if (last && !Number.isNaN(last) && Date.now() - last < intervalMs - 150_000) { skipped++; continue; }

      const slot = Math.floor(Date.now() / intervalMs);
      const tip = TIPS[slot % TIPS.length];
      const day = dayNumber(s.started_at);
      const refId = `${s.id}:h${slot}`;

      const res = await deliver(supabase, s.client_id, s.id, tip.title, `Day ${day} — ${tip.body}`, refId);
      pushed += res.delivered;

      await supabase
        .from("juice_fast_sessions")
        .update({ hydration_last_sent_at: new Date().toISOString() })
        .eq("id", s.id);

      await supabase.from("notification_log").insert({
        user_id: s.client_id,
        kind: "juice_hydration",
        reference_id: refId,
        title: tip.title,
        body: tip.body,
        status: res.delivered > 0 ? "sent" : "failed",
        subscription_count: res.subscriptions,
        delivered_count: res.delivered,
      });

      fired++;
    }

    return new Response(JSON.stringify({ ok: true, fired, pushed, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("dispatch-juice-hydration-reminders error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
