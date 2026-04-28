import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Notify a trainer that their client cancelled / ended a fast within
 * the just-started window (≤15min) and is asking for a reschedule.
 *
 * Fires three channels in parallel (best-effort):
 *   1. In-app notification (in_app_notifications)
 *   2. Web push (send-push-notification)
 *   3. Branded email (send-transactional-email -> admin-notification template)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id, kind, elapsed_minutes, target_hours, note } = await req.json();

    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Look up client + trainer
    const { data: settings } = await admin
      .from("client_feature_settings")
      .select("trainer_id")
      .eq("client_id", client_id)
      .maybeSingle();

    const trainerId = settings?.trainer_id;
    if (!trainerId) {
      return new Response(JSON.stringify({ error: "no trainer assigned" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: client }, { data: trainer }] = await Promise.all([
      admin.from("profiles").select("full_name, email").eq("id", client_id).maybeSingle(),
      admin.from("profiles").select("full_name, email").eq("id", trainerId).maybeSingle(),
    ]);

    const clientName = client?.full_name || client?.email || "Your client";
    const isCancel = kind === "cancel";
    const headline = isCancel
      ? `${clientName} cancelled a fast they just started`
      : `${clientName} ended a fast early — wants to reschedule`;
    const bodyLine = isCancel
      ? `They tapped start by mistake (within ${elapsed_minutes ?? "<15"} min) and need a fresh start whenever they're ready.`
      : `They were ${elapsed_minutes ?? "a few"} min into their ${target_hours ?? ""}h fast and asked you to schedule a new one.`;

    // 1) In-app notification
    const inAppPromise = admin.from("in_app_notifications").insert({
      user_id: trainerId,
      title: headline,
      body: note ? `${bodyLine}\n\nNote: ${note}` : bodyLine,
      type: "fast_cancelled_early",
      reference_id: `${client_id}:${Date.now()}`,
      action_url: `/clients`,
    });

    // 2) Push notification
    const pushPromise = admin.functions.invoke("send-push-notification", {
      body: {
        user_ids: [trainerId],
        title: headline,
        body: bodyLine,
        url: "/clients",
      },
    });

    // 3) Email (branded admin-notification template)
    const emailPromise = trainer?.email
      ? admin.functions.invoke("send-transactional-email", {
          body: {
            to: trainer.email,
            template_name: "admin-notification",
            template_data: {
              subject: headline,
              bodyHtml: `<p>${bodyLine}</p>${note ? `<p><em>Client note:</em> ${escapeHtml(note)}</p>` : ""}<p>Open KSOM-360 to schedule a new fast for them.</p>`,
            },
            purpose: "transactional",
            idempotency_key: `fast-cancel:${client_id}:${Date.now()}`,
          },
        })
      : Promise.resolve({ data: null, error: null });

    const results = await Promise.allSettled([inAppPromise, pushPromise, emailPromise]);
    const errors = results
      .map((r, i) => (r.status === "rejected" ? { ch: ["in_app", "push", "email"][i], err: String(r.reason) } : null))
      .filter(Boolean);

    if (errors.length) console.warn("notify-trainer-fast-cancelled partial failures:", errors);

    return new Response(
      JSON.stringify({ ok: true, channels: { in_app: true, push: true, email: !!trainer?.email }, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("notify-trainer-fast-cancelled error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}