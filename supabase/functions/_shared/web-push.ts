// Shared Web Push helper for all reminder dispatchers.
// Uses the npm `web-push` package via Deno's npm specifier for proper
// payload encryption (aes128gcm) — required by Chrome/Edge/Safari.

import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = "mailto:notifications@ksom-360.app";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
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

export async function sendWebPush(
  sub: PushSubRow,
  payload: PushPayload,
): Promise<SendResult> {
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