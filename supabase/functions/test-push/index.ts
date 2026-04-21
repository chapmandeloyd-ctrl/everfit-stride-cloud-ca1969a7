// Send a test push to the calling user's own subscriptions.
// Useful for the trainer "Send test push" button in Phase 7,
// and as a self-serve sanity check from the client dashboard.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWebPush, recordExpiredSubscription } from "../_shared/web-push.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let targetUserId = userId;
    try {
      const body = await req.json();
      if (body?.target_user_id && typeof body.target_user_id === "string") {
        // Allow trainers to test-push their own clients.
        const { data: isTrainer } = await supabase.rpc("is_trainer_of_client", {
          _trainer_id: userId,
          _client_id: body.target_user_id,
        });
        if (isTrainer) targetUserId = body.target_user_id;
      }
    } catch {
      // no body — that's fine
    }

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_agent")
      .eq("user_id", targetUserId);

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, message: "No push subscriptions on file" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let delivered = 0;
    let failed = 0;
    const deviceResults: Array<{
      id: string;
      device: string;
      endpoint_host: string;
      ok: boolean;
      status?: number;
      expired?: boolean;
      removed?: boolean;
      error?: string;
    }> = [];
    function describeDevice(ua?: string | null): string {
      if (!ua) return "Unknown device";
      if (/iPhone|iPad/.test(ua)) return "iOS device";
      if (/Android/.test(ua)) return "Android device";
      if (/Macintosh/.test(ua)) return "Mac";
      if (/Windows/.test(ua)) return "Windows";
      return "Browser";
    }
    for (const sub of subs) {
      const r = await sendWebPush(sub, {
        title: "KSOM-360 test push ✅",
        body: "If you see this, server-driven notifications are working.",
        tag: "test-push",
        url: "/client/dashboard",
        data: { kind: "test" },
      });
      let endpointHost = "";
      try { endpointHost = new URL(sub.endpoint).host; } catch { /* ignore */ }
      const subAny = sub as any;
      const removed = !r.ok && !!r.expired;
      if (r.ok) delivered++;
      else {
        failed++;
        if (r.expired) {
          await recordExpiredSubscription(supabase, {
            subscription_id: sub.id,
            user_id: targetUserId,
            endpoint: sub.endpoint,
            user_agent: subAny.user_agent,
            status: r.status,
            removed_by: "test-push",
          });
        }
      }
      deviceResults.push({
        id: sub.id,
        device: describeDevice(subAny.user_agent),
        endpoint_host: endpointHost,
        ok: r.ok,
        status: r.status,
        expired: r.expired,
        removed,
        error: r.error,
      });
    }

    await supabase.from("notification_log").insert({
      user_id: targetUserId,
      kind: "test",
      reference_id: new Date().toISOString(),
      title: "Test push",
      body: "Manual test",
      status: delivered > 0 ? "sent" : "failed",
      subscription_count: subs.length,
      delivered_count: delivered,
    });

    return new Response(
      JSON.stringify({
        ok: delivered > 0,
        delivered,
        failed,
        total: subs.length,
        devices: deviceResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});