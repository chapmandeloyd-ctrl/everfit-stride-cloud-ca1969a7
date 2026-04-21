import { supabase } from "@/integrations/supabase/client";

// Convert base64 URL to Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Get the VAPID public key from the server
export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-vapid-keys");
    if (error) throw error;
    return data?.publicKey || null;
  } catch (err) {
    console.error("Failed to get VAPID key:", err);
    return null;
  }
}

// Register the push service worker and get subscription
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push notifications not supported");
    return null;
  }

  try {
    // Register the push service worker
    const registration = await navigator.serviceWorker.register("/sw-push.js", {
      scope: "/",
    });

    await navigator.serviceWorker.ready;

    const reg = registration as any;

    // Check existing subscription
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      // Subscribe with the VAPID key
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    return subscription;
  } catch (err) {
    console.error("Failed to subscribe to push:", err);
    return null;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return true;

    const subscription = await (registration as any).pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    return true;
  } catch (err) {
    console.error("Failed to unsubscribe from push:", err);
    return false;
  }
}

// Save subscription to the database — writes one row per device into
// `push_subscriptions` (so the same user can receive pushes on multiple
// browsers/phones) and also flips `notification_preferences.push_enabled`
// for backwards compatibility with existing UI.
export async function savePushSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<boolean> {
  try {
    const json = subscription.toJSON() as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    const endpoint = json.endpoint || subscription.endpoint;
    const p256dhKey = subscription.getKey?.("p256dh");
    const authKey = subscription.getKey?.("auth");
    const p256dh = json.keys?.p256dh || arrayBufferToBase64Url(p256dhKey ?? null);
    const auth = json.keys?.auth || arrayBufferToBase64Url(authKey ?? null);

    if (!endpoint || !p256dh || !auth) {
      console.error("Push subscription missing required fields", { endpoint, p256dh, auth });
      return false;
    }

    const { error: subError } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "user_id,endpoint" }
      );
    if (subError) throw subError;

    // Keep the legacy preference flag in sync so existing UI lights up.
    await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: userId,
          push_enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    return true;
  } catch (err) {
    console.error("Failed to save push subscription:", err);
    return false;
  }
}

// Remove subscription(s) from the database. If `endpoint` is provided, only
// that device row is deleted; otherwise all subscriptions for the user are
// removed. Also flips the legacy `push_enabled` flag off when no devices
// remain.
export async function removePushSubscription(
  userId: string,
  endpoint?: string
): Promise<boolean> {
  try {
    const query = supabase.from("push_subscriptions").delete().eq("user_id", userId);
    if (endpoint) query.eq("endpoint", endpoint);
    const { error } = await query;
    if (error) throw error;

    const { count } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if ((count ?? 0) === 0) {
      await supabase
        .from("notification_preferences")
        .update({
          push_enabled: false,
          push_subscription: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }
    return true;
  } catch (err) {
    console.error("Failed to remove push subscription:", err);
    return false;
  }
}

// Per-device delivery result returned by the `test-push` edge function.
export interface PushDeviceResult {
  id: string;
  device: string;
  endpoint_host: string;
  ok: boolean;
  status?: number;
  expired?: boolean;
  removed?: boolean;
  error?: string;
}

// Send a test push to the current user (or, for trainers, a specific client).
export async function sendTestPush(targetUserId?: string): Promise<{
  ok: boolean;
  delivered?: number;
  failed?: number;
  total?: number;
  message?: string;
  devices?: PushDeviceResult[];
}> {
  try {
    const { data, error } = await supabase.functions.invoke("test-push", {
      body: targetUserId ? { target_user_id: targetUserId } : {},
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Failed to send test push:", err);
    return { ok: false, message: (err as Error).message };
  }
}

// Check if push is supported
export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// Get current permission status
export function getPushPermissionStatus(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}
