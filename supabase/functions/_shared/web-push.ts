// Shared Web Push helper for all reminder dispatchers.
// Uses the npm `web-push` package via Deno's npm specifier for proper
// payload encryption (aes128gcm) — required by Chrome/Edge/Safari.

import webpush from "npm:web-push@3.6.7";

// Normalize a base64 string to URL-safe form without padding (what web-push wants).
function toUrlSafeNoPad(s: string): string {
  return (s || "").trim().replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

const VAPID_SUBJECT = "mailto:notifications@ksom-360.app";
let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const pub = toUrlSafeNoPad(Deno.env.get("VAPID_PUBLIC_KEY") || "");
  const priv = toUrlSafeNoPad(Deno.env.get("VAPID_PRIVATE_KEY") || "");
  if (!pub || !priv) {
    throw new Error("VAPID keys are not configured");
  }
  webpush.setVapidDetails(VAPID_SUBJECT, pub, priv);
  vapidConfigured = true;
}

export interface PushSubRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: Record<string, unknown>;
}

export interface SendResult {
  ok: boolean;
  status?: number;
  error?: string;
  expired?: boolean; // 404/410 — caller should delete the row
}

/**
 * Delete an expired push subscription and log it to
 * `push_subscription_removals` for trainer visibility.
 * Call this from any dispatcher after sendWebPush returns `expired: true`.
 * `supabase` must be a service-role client.
 */
export async function recordExpiredSubscription(
  supabase: any,
  args: {
    subscription_id: string;
    user_id: string;
    endpoint: string;
    user_agent?: string | null;
    status?: number;
    removed_by: string;
  },
): Promise<void> {
  let endpoint_host: string | null = null;
  try { endpoint_host = new URL(args.endpoint).host; } catch { /* ignore */ }
  const reason =
    args.status === 404 ? "expired_404"
    : args.status === 410 ? "expired_410"
    : "expired_other";
  try {
    await supabase.from("push_subscription_removals").insert({
      user_id: args.user_id,
      endpoint_host,
      user_agent: args.user_agent ?? null,
      reason,
      removed_by: args.removed_by,
    });
  } catch (err) {
    console.error("Failed to log push_subscription_removals row", err);
  }
  try {
    await supabase.from("push_subscriptions").delete().eq("id", args.subscription_id);
  } catch (err) {
    console.error("Failed to delete expired push_subscriptions row", err);
  }
}

export async function sendWebPush(
  sub: PushSubRow,
  payload: PushPayload,
): Promise<SendResult> {
  try {
    ensureVapid();
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/pwa-192x192.png",
    badge: payload.badge || "/pwa-192x192.png",
    tag: payload.tag,
    data: { url: payload.url || "/", ...(payload.data || {}) },
  });

  try {
    const result = await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      body,
      { TTL: 86400, urgency: "high" },
    );
    return { ok: true, status: result.statusCode };
  } catch (err: any) {
    const status = err?.statusCode;
    const expired = status === 404 || status === 410;
    return {
      ok: false,
      status,
      expired,
      error: err?.body || err?.message || String(err),
    };
  }
}