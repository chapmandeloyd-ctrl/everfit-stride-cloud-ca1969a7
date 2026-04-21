// Event-based fasting milestone dispatcher (runs every 5 minutes).
// For each client with an active fast (active_fast_start_at set), fires a
// push when the elapsed-hours crosses one of the milestone thresholds.
// Milestones: 12h, 16h, 18h, 20h, 24h, 36h, 48h, 72h.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWebPush } from "../_shared/web-push.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MILESTONES: { hours: number; title: string; body: string }[] = [
  { hours: 12, title: "12 hours in 🔥", body: "Glycogen tapping in. Stay hydrated and keep moving." },
  { hours: 16, title: "16 hours — autophagy mode 🧬", body: "Cellular cleanup is ramping up. Strong work." },
  { hours: 18, title: "18 hours unlocked ⚡", body: "Deep fat-burning zone. Sip water and electrolytes." },
  { hours: 20, title: "20 hours 💪", body: "You're in elite territory. Listen to your body." },
  { hours: 24, title: "24 hours — full day fast! 🏆", body: "Massive metabolic flexibility win." },
  { hours: 36, title: "36 hours 🧠", body: "Ketone production is in full swing." },
  { hours: 48, title: "48 hours 🎯", body: "Two full days. Break the fast mindfully when ready." },
  { hours: 72, title: "72 hours 👑", body: "Extended fast complete. Refeed slowly." },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: settings, error } = await supabase
      .from("client_feature_settings")
      .select("client_id, active_fast_start_at, active_fast_target_hours, fasting_enabled, nudge_fasting")
      .eq("fasting_enabled", true)
      .not("active_fast_start_at", "is", null);
    if (error) throw error;

    let sent = 0, failed = 0, fired = 0;
    const now = new Date();

    for (const s of settings ?? []) {
      if (s.nudge_fasting === false) continue;
      const start = new Date(s.active_fast_start_at);
      const elapsedH = (now.getTime() - start.getTime()) / 3_600_000;
      if (elapsedH < 12) continue;

      // Find largest milestone the user has crossed
      const crossed = MILESTONES.filter((m) => elapsedH >= m.hours);
      if (!crossed.length) continue;
      const target = crossed[crossed.length - 1];

      const refId = `${start.toISOString()}:${target.hours}`;
      const { data: existing } = await supabase
        .from("notification_log").select("id")
        .eq("user_id", s.client_id).eq("kind", "fasting_milestone")
        .eq("reference_id", refId).eq("status", "sent").maybeSingle();
      if (existing) continue;

      const { data: subs } = await supabase
        .from("push_subscriptions").select("id, endpoint, p256dh, auth")
        .eq("user_id", s.client_id);
      if (!subs?.length) continue;

      let delivered = 0;
      for (const sub of subs) {
        const r = await sendWebPush(sub, {
          title: target.title,
          body: target.body,
          tag: `fast-milestone-${target.hours}`,
          url: "/client/dashboard",
          data: { kind: "fasting_milestone", hours: target.hours },
        });
        if (r.ok) { delivered++; sent++; }
        else { failed++; if (r.expired) await supabase.from("push_subscriptions").delete().eq("id", sub.id); }
      }

      await supabase.from("notification_log").insert({
        user_id: s.client_id, kind: "fasting_milestone", reference_id: refId,
        title: target.title, body: target.body,
        status: delivered > 0 ? "sent" : "failed",
        subscription_count: subs.length, delivered_count: delivered,
      });
      fired++;
    }

    return new Response(JSON.stringify({ ok: true, fired, sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("dispatch-fasting-milestones error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});