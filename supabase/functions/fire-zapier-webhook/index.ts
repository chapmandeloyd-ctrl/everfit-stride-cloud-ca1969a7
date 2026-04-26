// Fires a fasting event to the trainer's Zapier webhook.
// Called by:
//   - dispatch-fasting-milestones (cron, every 5 min) for milestones, fast_started, pre_end_1h
//   - the client app directly when a fast is completed or broken
//
// Body: { client_id, event_type, reference_id?, suggested_message? }
// event_type:
//   fast_started | pre_end_1h | milestone_12 | milestone_16 | milestone_18
//   | milestone_20 | milestone_24 | milestone_36 | milestone_48 | milestone_72
//   | fast_completed | fast_broken | test

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = Deno.env.get("VITE_APP_URL") || "https://ksom-360.app";

const SUGGESTED_MESSAGES: Record<string, (name: string, hours?: number) => string> = {
  fast_started:    (n) => `${n} just started a fast. Cheer them on in Trainerize!`,
  pre_end_1h:      (n) => `${n}'s fast ends in 1 hour. Send a finish-strong push from Trainerize.`,
  milestone_12:    (n) => `${n} hit 12 hours fasting 🔥 Send a quick "stay hydrated" push.`,
  milestone_16:    (n) => `${n} hit 16h — autophagy mode 🧬 Send a celebratory push.`,
  milestone_18:    (n) => `${n} hit 18h ⚡ Deep fat-burn zone — push a hydration reminder.`,
  milestone_20:    (n) => `${n} hit 20h 💪 Elite territory — push some encouragement.`,
  milestone_24:    (n) => `${n} hit 24 hours 🏆 Big win — send a celebratory push.`,
  milestone_36:    (n) => `${n} hit 36h 🧠 Ketones flowing — check in via Trainerize.`,
  milestone_48:    (n) => `${n} hit 48h 🎯 Two full days — coach the refeed.`,
  milestone_72:    (n) => `${n} hit 72h 👑 Extended fast — push refeed guidance.`,
  fast_completed:  (n, h) => `${n} completed their ${h}h fast! Send a congrats push from Trainerize.`,
  fast_broken:     (n, h) => `${n} broke their fast early at ${h}h. Send a supportive nudge.`,
  test:            (n) => `Test event for ${n} — Zapier webhook is wired up correctly.`,
};

interface FireBody {
  client_id: string;
  event_type: string;
  reference_id?: string;
  // optional metadata for completed/broken
  actual_hours?: number;
  target_hours?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = (await req.json()) as FireBody;
    const { client_id, event_type } = body;
    if (!client_id || !event_type) {
      return new Response(JSON.stringify({ error: "client_id and event_type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up client + trainer + fast info
    const { data: settings, error: sErr } = await supabase
      .from("client_feature_settings")
      .select("client_id, trainer_id, active_fast_start_at, active_fast_target_hours, last_fast_ended_at")
      .eq("client_id", client_id)
      .maybeSingle();
    if (sErr || !settings) {
      return new Response(JSON.stringify({ error: "client not found", details: sErr?.message }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const trainerId = settings.trainer_id;
    if (!trainerId) {
      return new Response(JSON.stringify({ ok: true, skipped: "no trainer" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up trainer's webhook URL + name
    const { data: trainer } = await supabase
      .from("profiles").select("zapier_webhook_url, full_name").eq("id", trainerId).maybeSingle();
    const webhookUrl = (trainer as any)?.zapier_webhook_url as string | null | undefined;
    if (!webhookUrl) {
      return new Response(JSON.stringify({ ok: true, skipped: "no webhook url" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up client name + email
    const { data: clientProfile } = await supabase
      .from("profiles").select("full_name, email").eq("id", client_id).maybeSingle();
    const clientName = (clientProfile as any)?.full_name || "Your client";
    const clientEmail = (clientProfile as any)?.email || null;

    // Dedup
    const refId = body.reference_id
      || `${settings.active_fast_start_at || settings.last_fast_ended_at || "unknown"}:${event_type}`;

    if (event_type !== "test") {
      const { data: existing } = await supabase
        .from("fasting_webhook_log").select("id")
        .eq("client_id", client_id).eq("event_type", event_type).eq("reference_id", refId)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ ok: true, skipped: "duplicate" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const targetH = body.target_hours ?? settings.active_fast_target_hours ?? null;
    const actualH = body.actual_hours ?? null;
    const suggestedFn = SUGGESTED_MESSAGES[event_type] || ((n: string) => `Fasting event for ${n}: ${event_type}`);
    const suggestedMessage = suggestedFn(clientName, actualH ?? targetH ?? undefined);

    const payload = {
      event: event_type,
      fired_at: new Date().toISOString(),
      client: {
        id: client_id,
        name: clientName,
        email: clientEmail,
      },
      fast: {
        start_at: settings.active_fast_start_at,
        target_hours: targetH,
        actual_hours: actualH,
        last_ended_at: settings.last_fast_ended_at,
      },
      suggested_message: suggestedMessage,
      links: {
        client_view: `${APP_URL}/clients/${client_id}`,
        ksom_dashboard: `${APP_URL}/dashboard`,
      },
    };

    let status = 0;
    let errMsg: string | null = null;
    try {
      const r = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      status = r.status;
      if (!r.ok) errMsg = await r.text().catch(() => `HTTP ${r.status}`);
    } catch (err: any) {
      errMsg = err?.message || String(err);
    }

    if (event_type !== "test") {
      await supabase.from("fasting_webhook_log").insert({
        client_id,
        trainer_id: trainerId,
        event_type,
        reference_id: refId,
        webhook_url: webhookUrl,
        status: errMsg ? "failed" : "sent",
        response_status: status || null,
        error: errMsg,
      } as any);
    }

    return new Response(JSON.stringify({
      ok: !errMsg, status, error: errMsg, payload,
    }), {
      status: errMsg ? 502 : 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("fire-zapier-webhook error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});