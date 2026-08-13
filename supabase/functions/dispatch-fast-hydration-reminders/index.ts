// Hydration + electrolyte reminders during LONG regular fasts (>= min hours).
// Runs every 5 minutes. Only fires for clients with an active fast whose
// target duration meets their fast_hydration_min_hours threshold (default 24h),
// inside their local reminder window, spaced by their interval.

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

const TIPS: { title: string; body: string }[] = [
  { title: "💧 Water check", body: "Sip 12–16 oz now. Steady water keeps a long fast comfortable." },
  { title: "⚡ Electrolyte top-up", body: "Sodium, potassium and magnesium — that's what stops the headache and fatigue." },
  { title: "🧂 Pinch of salt", body: "Plain water with a pinch of salt beats plain water on an extended fast." },
  { title: "⚡ Minerals matter", body: "A cup of broth or an electrolyte packet keeps energy level instead of crashing." },
  { title: "💧 Stay ahead of thirst", body: "If you're thirsty you're already behind. 12 oz water, then back to it." },
];

function toMinutes(hhmm: string | null, fallback: number): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || "");
  if (!m) return fallback;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

async function deliver(supabase: any, clientId: string, title: string, body: string, refId: string) {
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_agent")
    .eq("user_id", clientId);

  let delivered = 0;
  for (const sub of subs ?? []) {
    const r = await sendWebPush(sub, {
      title,
      body,
      tag: `fast-hydration-${clientId}`,
      url: "/client/dashboard",
      data: { kind: "fast_hydration" },
    });
    if (r.ok) delivered++;
    else if (r.expired) {
      await recordExpiredSubscription(supabase, {
        subscription_id: sub.id,
        user_id: clientId,
        endpoint: sub.endpoint,
        user_agent: (sub as any).user_agent,
        status: r.status,
        removed_by: "dispatch-fast-hydration-reminders",
      });
    }
  }

  await supabase.from("in_app_notifications").insert({
    user_id: clientId,
    type: "fast_hydration_reminder",
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

  // ---- Test mode ----
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
      const tip = TIPS[0];
      const res = await deliver(supabase, userId, `Test — ${tip.title}`, tip.body, `fast-hydration-test-${Date.now()}`);
      return new Response(
        JSON.stringify({ ok: true, test: true, pushed: res.delivered, subscriptions: res.subscriptions }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err?.message || String(err) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const { data: rows, error } = await supabase
      .from("client_feature_settings")
      .select(
        "client_id, active_fast_start_at, active_fast_target_hours, fast_hydration_reminder_enabled, fast_hydration_interval_hours, fast_hydration_window_start, fast_hydration_window_end, fast_hydration_min_hours, fast_hydration_last_sent_at",
      )
      .eq("fast_hydration_reminder_enabled", true)
      .not("active_fast_start_at", "is", null);
    if (error) throw error;

    let fired = 0, pushed = 0, skipped = 0;

    for (const s of rows ?? []) {
      const minHours = s.fast_hydration_min_hours ?? 24;
      const targetH = s.active_fast_target_hours ?? 0;
      // Long fasts only — a 16:8 day never triggers this.
      if (!targetH || targetH < minHours) { skipped++; continue; }

      const startedMs = Date.parse(s.active_fast_start_at);
      if (Number.isNaN(startedMs)) { skipped++; continue; }
      const elapsedH = (Date.now() - startedMs) / 3_600_000;
      // Don't nag past the target — the fast is done or ending.
      if (elapsedH < 1 || elapsedH > targetH) { skipped++; continue; }

      const tz = await getClientTimezone(supabase, s.client_id);
      const { hour, minute } = nowInZone(tz);
      const nowMin = hour * 60 + minute;
      const startMin = toMinutes(s.fast_hydration_window_start, 8 * 60);
      const endMin = toMinutes(s.fast_hydration_window_end, 20 * 60);
      if (nowMin < startMin || nowMin > endMin) { skipped++; continue; }

      const intervalMs = Math.max(1, s.fast_hydration_interval_hours ?? 3) * 3_600_000;
      const last = s.fast_hydration_last_sent_at ? Date.parse(s.fast_hydration_last_sent_at) : null;
      if (last && !Number.isNaN(last) && Date.now() - last < intervalMs - 150_000) { skipped++; continue; }

      const slot = Math.floor(Date.now() / intervalMs);
      const tip = TIPS[slot % TIPS.length];
      const refId = `${s.client_id}:fh${slot}`;
      const res = await deliver(
        supabase,
        s.client_id,
        tip.title,
        `${Math.floor(elapsedH)}h in — ${tip.body}`,
        refId,
      );
      pushed += res.delivered;

      await supabase
        .from("client_feature_settings")
        .update({ fast_hydration_last_sent_at: new Date().toISOString() })
        .eq("client_id", s.client_id);

      await supabase.from("notification_log").insert({
        user_id: s.client_id,
        kind: "fast_hydration",
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
    console.error("dispatch-fast-hydration-reminders error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
