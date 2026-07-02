// Cron-driven protocol / check-in reminder dispatcher (runs hourly).
// For each client with an assigned protocol, computes the next due date:
//   - min( soonest upcoming recurring_checkin_schedules.next_trigger_at,
//          protocol_start_date + assigned_protocol_duration_days )
// If that date falls within a ±30-min window of (now + 48h) or (now + 24h),
// send in-app + email + push reminder to the client AND their trainer.
// Deduped via notification_log (kind='protocol_reminder').

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWebPush, recordExpiredSubscription } from "../_shared/web-push.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEAD_HOURS = [48, 24];
const WINDOW_MS = 60 * 60 * 1000; // 1h window (job runs hourly)

function fmtWhen(d: Date) {
  return d.toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results = { checked: 0, fired: 0, emails: 0, inApp: 0, push: 0, failed: 0 };

  try {
    const { data: settings, error } = await supabase
      .from("client_feature_settings")
      .select("client_id, trainer_id, selected_protocol_id, protocol_start_date, assigned_protocol_duration_days")
      .not("selected_protocol_id", "is", null);
    if (error) throw error;

    const now = Date.now();

    for (const s of settings ?? []) {
      results.checked++;

      // Next recurring check-in for this client
      const { data: checkins } = await supabase
        .from("recurring_checkin_schedules")
        .select("schedule_name, next_trigger_at")
        .eq("client_id", s.client_id)
        .gte("next_trigger_at", new Date(now).toISOString())
        .order("next_trigger_at", { ascending: true })
        .limit(1);
      const nextCheckin = checkins?.[0];

      // Protocol end date
      let protocolEnd: Date | null = null;
      if (s.protocol_start_date && s.assigned_protocol_duration_days) {
        const d = new Date(s.protocol_start_date as string);
        d.setDate(d.getDate() + Number(s.assigned_protocol_duration_days));
        d.setHours(9, 0, 0, 0);
        protocolEnd = d;
      }

      // Pick soonest upcoming event
      let dueAt: Date | null = null;
      let eventLabel = "Protocol review";
      const checkinAt = nextCheckin ? new Date(nextCheckin.next_trigger_at) : null;
      if (checkinAt && (!protocolEnd || checkinAt <= protocolEnd)) {
        dueAt = checkinAt;
        eventLabel = nextCheckin!.schedule_name || "Check-in";
      } else if (protocolEnd) {
        dueAt = protocolEnd;
      }
      if (!dueAt) continue;

      const msUntil = dueAt.getTime() - now;

      for (const lead of LEAD_HOURS) {
        const target = lead * 60 * 60 * 1000;
        if (Math.abs(msUntil - target) > WINDOW_MS / 2) continue;

        const refId = `${s.client_id}:${lead}:${dueAt.toISOString().slice(0, 13)}`;

        // Dedupe against notification_log
        const { data: existing } = await supabase
          .from("notification_log")
          .select("id")
          .eq("kind", "protocol_reminder")
          .eq("reference_id", refId)
          .maybeSingle();
        if (existing) continue;

        // Look up client + trainer profiles
        const ids = [s.client_id, s.trainer_id].filter(Boolean) as string[];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", ids);
        const clientProfile = profiles?.find((p) => p.id === s.client_id);
        const trainerProfile = profiles?.find((p) => p.id === s.trainer_id);

        const dueLabel = fmtWhen(dueAt);
        const title = lead === 24
          ? `${eventLabel} — tomorrow`
          : `${eventLabel} — in 2 days`;
        const body = `Due ${dueLabel}`;

        const recipients: Array<{
          userId: string;
          audience: "client" | "trainer";
          profile: any;
        }> = [];
        if (clientProfile) recipients.push({ userId: s.client_id, audience: "client", profile: clientProfile });
        if (trainerProfile) recipients.push({ userId: s.trainer_id!, audience: "trainer", profile: trainerProfile });

        let delivered = 0;

        for (const r of recipients) {
          // 1) In-app notification
          const { error: inAppErr } = await supabase.from("in_app_notifications").insert({
            user_id: r.userId,
            type: "protocol_reminder",
            title,
            body,
            reference_id: refId,
            action_url: r.audience === "client" ? "/client/dashboard" : `/clients/${s.client_id}`,
          });
          if (!inAppErr) results.inApp++;

          // 2) Email
          if (r.profile?.email) {
            const { error: emailErr } = await supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "protocol-reminder",
                recipientEmail: r.profile.email,
                idempotencyKey: `protocol-reminder-${refId}-${r.audience}`,
                templateData: {
                  name: (r.profile.full_name || "").split(" ")[0] || undefined,
                  eventLabel,
                  dueLabel,
                  hoursUntil: lead,
                  audience: r.audience,
                  clientName: clientProfile?.full_name,
                },
              },
            });
            if (!emailErr) results.emails++;
          }

          // 3) Web push
          const { data: subs } = await supabase
            .from("push_subscriptions")
            .select("id, endpoint, p256dh, auth, user_agent")
            .eq("user_id", r.userId);
          for (const sub of subs ?? []) {
            const res = await sendWebPush(sub, {
              title,
              body,
              tag: `protocol-${refId}`,
              url: r.audience === "client" ? "/client/dashboard" : `/clients/${s.client_id}`,
              data: { kind: "protocol_reminder", client_id: s.client_id },
            });
            if (res.ok) { delivered++; results.push++; }
            else {
              results.failed++;
              if (res.expired) {
                await recordExpiredSubscription(supabase, {
                  subscription_id: sub.id,
                  user_id: r.userId,
                  endpoint: sub.endpoint,
                  user_agent: (sub as any).user_agent,
                  status: res.status,
                  removed_by: "dispatch-protocol-reminders",
                });
              }
            }
          }
        }

        await supabase.from("notification_log").insert({
          user_id: s.client_id,
          kind: "protocol_reminder",
          reference_id: refId,
          title,
          body,
          status: delivered > 0 || results.emails > 0 || results.inApp > 0 ? "sent" : "failed",
          subscription_count: recipients.length,
          delivered_count: delivered,
        });
        results.fired++;
      }
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("dispatch-protocol-reminders error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err), ...results }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});