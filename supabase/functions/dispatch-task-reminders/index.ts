// Cron-driven task reminder dispatcher (runs every 5 minutes).
// For each open task with reminder_enabled=true, fires a push when the
// current time falls inside a 5-minute window of (due_date - reminder_hours_before).
// Tasks with no due_date are skipped. Completed tasks are skipped.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWebPush } from "../_shared/web-push.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const now = new Date();
    const horizonStart = new Date(now.getTime());
    const horizonEnd = new Date(now.getTime() + 5 * 60 * 1000); // next 5 min

    const { data: tasks, error } = await supabase
      .from("client_tasks")
      .select("id, client_id, name, due_date, reminder_hours_before, completed_at")
      .eq("reminder_enabled", true)
      .is("completed_at", null)
      .not("due_date", "is", null);
    if (error) throw error;

    let sent = 0, failed = 0, fired = 0;

    for (const t of tasks ?? []) {
      const due = new Date(`${t.due_date}T09:00:00Z`); // due_date is a date — interpret as 9am UTC
      const remindAt = new Date(due.getTime() - (t.reminder_hours_before || 24) * 3600 * 1000);
      if (remindAt < horizonStart || remindAt >= horizonEnd) continue;

      const refId = `${t.id}`;
      const { data: existing } = await supabase
        .from("notification_log")
        .select("id")
        .eq("user_id", t.client_id)
        .eq("kind", "task")
        .eq("reference_id", refId)
        .eq("status", "sent")
        .maybeSingle();
      if (existing) continue;

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", t.client_id);
      if (!subs?.length) continue;

      let delivered = 0;
      const title = `Task due soon: ${t.name}`;
      const body = `Due ${new Date(t.due_date).toLocaleDateString()}.`;
      for (const sub of subs) {
        const r = await sendWebPush(sub, {
          title, body,
          tag: `task-${refId}`,
          url: "/client/tasks",
          data: { kind: "task", task_id: t.id },
        });
        if (r.ok) { delivered++; sent++; }
        else {
          failed++;
          if (r.expired) await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }

      await supabase.from("notification_log").insert({
        user_id: t.client_id,
        kind: "task",
        reference_id: refId,
        title, body,
        status: delivered > 0 ? "sent" : "failed",
        subscription_count: subs.length,
        delivered_count: delivered,
      });
      fired++;
    }

    return new Response(JSON.stringify({ ok: true, fired, sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("dispatch-task-reminders error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});