// Cron-driven stage-advance alerts during an active juice fast.
// Every run: compute the client's current stage from elapsed hours, compare it
// with last_stage_notified_hour, and fire a single push + in-app notification
// on each transition. Never fires for the opening stage (hour 0).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWebPush, recordExpiredSubscription } from "../_shared/web-push.ts";
import { currentStage, relevantStages } from "../_shared/juice-stages.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { data: sessions, error } = await supabase
      .from("juice_fast_sessions")
      .select("id, client_id, started_at, planned_days, mode, last_stage_notified_hour")
      .eq("status", "active");
    if (error) throw error;

    let fired = 0, pushed = 0, skipped = 0;

    for (const s of sessions ?? []) {
      const startedMs = Date.parse(s.started_at);
      if (Number.isNaN(startedMs)) { skipped++; continue; }

      const totalHours = (s.planned_days ?? 1) * 24;
      const elapsedHours = (Date.now() - startedMs) / 3_600_000;
      const stage = currentStage(s.mode, elapsedHours, totalHours);
      const list = relevantStages(s.mode, totalHours);
      const index = list.findIndex((x) => x.hour === stage.hour);
      const last = s.last_stage_notified_hour;

      // Nothing new, or still in the opening stage: just record where we are.
      if (stage.hour === 0 || (last !== null && last !== undefined && last >= stage.hour)) {
        if (last === null || last === undefined) {
          await supabase.from("juice_fast_sessions")
            .update({ last_stage_notified_hour: stage.hour })
            .eq("id", s.id);
        }
        skipped++;
        continue;
      }

      const title = `${stage.icon} Stage ${index + 1} unlocked — ${stage.label}`;
      const body = `Day ${Math.floor(stage.hour / 24) + 1} of your juice fast. ${stage.blurb}`;
      const refId = `${s.id}:stage${stage.hour}`;

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth, user_agent")
        .eq("user_id", s.client_id);

      let delivered = 0;
      for (const sub of subs ?? []) {
        const r = await sendWebPush(sub, {
          title,
          body,
          tag: `juice-stage-${s.id}-${stage.hour}`,
          url: "/client/dashboard",
          data: { kind: "juice_stage_advance", session_id: s.id, stage_hour: stage.hour },
        });
        if (r.ok) delivered++;
        else if (r.expired) {
          await recordExpiredSubscription(supabase, {
            subscription_id: sub.id,
            user_id: s.client_id,
            endpoint: sub.endpoint,
            user_agent: (sub as any).user_agent,
            status: r.status,
            removed_by: "dispatch-juice-stage-advances",
          });
        }
      }
      pushed += delivered;

      await supabase.from("in_app_notifications").insert({
        user_id: s.client_id,
        type: "juice_stage_advance",
        title,
        body,
        reference_id: refId,
        action_url: "/client/dashboard",
      });

      // Timeline entry so stage transitions show up in the client's activity feed.
      await supabase.from("activity_events").insert({
        client_id: s.client_id,
        event_type: "juice_stage_advanced",
        category: "juice",
        icon: "sparkles",
        title: `Juice stage ${index + 1} — ${stage.label}`,
        subtitle: stage.blurb,
        source: "system",
        metadata: { session_id: s.id, stage_hour: stage.hour, stage_index: index + 1, mode: s.mode },
      });

      await supabase.from("juice_fast_sessions")
        .update({ last_stage_notified_hour: stage.hour })
        .eq("id", s.id);

      await supabase.from("notification_log").insert({
        user_id: s.client_id,
        kind: "juice_stage_advance",
        reference_id: refId,
        title,
        body,
        status: delivered > 0 ? "sent" : "failed",
        subscription_count: subs?.length ?? 0,
        delivered_count: delivered,
      });

      fired++;
    }

    return new Response(JSON.stringify({ ok: true, fired, pushed, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("dispatch-juice-stage-advances error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
