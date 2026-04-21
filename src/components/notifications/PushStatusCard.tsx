import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BellRing, BellOff, ShieldAlert, CheckCircle2, Loader2, Send, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  isPushSupported,
  getPushPermissionStatus,
  getVapidPublicKey,
  subscribeToPush,
  savePushSubscription,
  sendTestPush,
} from "@/lib/pushNotifications";

/**
 * PushStatusCard
 *
 * Per-device status surface for the server-driven Web Push system.
 * Detects the three states that actually matter for delivery:
 *  - "subscribed"   → permission granted AND this device's endpoint exists
 *                     in `push_subscriptions`. Reminders will fire.
 *  - "missing"      → permission granted (or default) but no row for this
 *                     device. The silent killer — user thinks they're set
 *                     up but cron jobs have nowhere to deliver.
 *  - "denied"       → browser-level block. Cannot re-prompt; show OS-level
 *                     instructions instead.
 *  - "unsupported"  → no service worker / PushManager available.
 */

type DeviceStatus = "loading" | "unsupported" | "denied" | "missing" | "subscribed";

export function PushStatusCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [endpointReady, setEndpointReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [testing, setTesting] = useState(false);

  const supported = isPushSupported();
  const permission = getPushPermissionStatus();

  // Read the current device's push endpoint (if any) from the live SW
  // registration. This is what we match against `push_subscriptions.endpoint`
  // to know whether THIS browser is actually registered.
  useEffect(() => {
    let cancelled = false;
    if (!supported) {
      setEndpointReady(true);
      return;
    }
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/");
        const sub = await (reg as any)?.pushManager?.getSubscription();
        if (!cancelled) setEndpoint(sub?.endpoint ?? null);
      } catch {
        if (!cancelled) setEndpoint(null);
      } finally {
        if (!cancelled) setEndpointReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported]);

  // Look up this device's row in push_subscriptions (by endpoint).
  const { data: deviceRow, isLoading: deviceLoading } = useQuery({
    queryKey: ["push-subscription-device", user?.id, endpoint],
    queryFn: async () => {
      if (!user?.id || !endpoint) return null;
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, last_seen_at")
        .eq("user_id", user.id)
        .eq("endpoint", endpoint)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && endpointReady,
  });

  // Resolve the effective status the UI should display.
  let status: DeviceStatus = "loading";
  if (!supported) status = "unsupported";
  else if (!endpointReady || deviceLoading) status = "loading";
  else if (permission === "denied") status = "denied";
  else if (endpoint && deviceRow) status = "subscribed";
  else status = "missing";

  const handleEnable = async () => {
    if (!user?.id) return;
    setWorking(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast({
          title: "Notifications blocked",
          description:
            perm === "denied"
              ? "You'll need to allow notifications in your browser/system settings."
              : "Permission was not granted.",
          variant: "destructive",
        });
        return;
      }
      const vapid = await getVapidPublicKey();
      if (!vapid) {
        toast({
          title: "Setup incomplete",
          description: "Push keys are not configured. Contact support.",
          variant: "destructive",
        });
        return;
      }
      const sub = await subscribeToPush(vapid);
      if (!sub) {
        toast({
          title: "Could not subscribe",
          description: "Your browser refused the subscription. Try again or use a different browser.",
          variant: "destructive",
        });
        return;
      }
      const ok = await savePushSubscription(user.id, sub);
      if (!ok) {
        toast({
          title: "Saved on device only",
          description: "We couldn't store the subscription on the server.",
          variant: "destructive",
        });
        return;
      }
      setEndpoint(sub.endpoint);
      await queryClient.invalidateQueries({ queryKey: ["push-subscription-device"] });
      toast({
        title: "This device is now subscribed",
        description: "Reminders will fire even when the app is closed.",
      });
    } catch (err) {
      console.error("Push enable failed", err);
      toast({
        title: "Something went wrong",
        description: (err as Error).message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setWorking(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await sendTestPush();
      if (result.ok) {
        toast({
          title: "Test sent",
          description: `Delivered to ${result.delivered ?? 0} of ${result.total ?? 0} device(s). It should arrive within a few seconds.`,
        });
      } else {
        toast({
          title: "Test failed",
          description: result.message || "The server rejected the test push.",
          variant: "destructive",
        });
      }
    } finally {
      setTesting(false);
    }
  };

  // ---- Status pill ----------------------------------------------------------
  const pill = (() => {
    switch (status) {
      case "subscribed":
        return (
          <Badge variant="outline" className="text-primary border-primary">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Subscribed on this device
          </Badge>
        );
      case "missing":
        return (
          <Badge variant="outline" className="text-muted-foreground border-border">
            <BellOff className="h-3 w-3 mr-1" />
            Not subscribed on this device
          </Badge>
        );
      case "denied":
        return (
          <Badge variant="outline" className="text-destructive border-destructive">
            <ShieldAlert className="h-3 w-3 mr-1" />
            Permission denied
          </Badge>
        );
      case "unsupported":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <BellOff className="h-3 w-3 mr-1" />
            Not supported
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Checking…
          </Badge>
        );
    }
  })();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5" />
              Lock-screen reminders
            </CardTitle>
            <CardDescription>
              For reminders to reach you when the app is closed, this specific device must be
              subscribed. Each phone, tablet, and browser registers separately.
            </CardDescription>
          </div>
          <div className="shrink-0">{pill}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "subscribed" && (
          <>
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>You're all set on this device</AlertTitle>
              <AlertDescription>
                Health reminders, habit prompts, task due dates, smart nudges, and fasting
                milestones will arrive here even when the app is closed.
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send test to my devices
                </>
              )}
            </Button>
          </>
        )}

        {status === "missing" && (
          <>
            <Alert variant="default">
              <BellOff className="h-4 w-4" />
              <AlertTitle>This device isn't registered yet</AlertTitle>
              <AlertDescription>
                Reminders won't pop up on your lock screen here until you subscribe. One tap
                fixes it.
              </AlertDescription>
            </Alert>
            <Button className="w-full" onClick={handleEnable} disabled={working}>
              {working ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enabling…
                </>
              ) : (
                <>
                  <BellRing className="h-4 w-4 mr-2" />
                  Enable on this device
                </>
              )}
            </Button>
          </>
        )}

        {status === "denied" && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Notifications are blocked</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>We can't ask again from inside the app. To re-enable:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>
                  <strong>iPhone (installed app):</strong> open iOS Settings → Notifications →
                  KSOM-360 → Allow Notifications.
                </li>
                <li>
                  <strong>iPhone Safari:</strong> install the app to your Home Screen first
                  (Share → Add to Home Screen), then enable in iOS Settings.
                </li>
                <li>
                  <strong>Chrome / Edge / Android:</strong> tap the lock icon next to the URL →
                  Site settings → Notifications → Allow.
                </li>
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                I changed it — recheck
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {status === "unsupported" && (
          <Alert>
            <BellOff className="h-4 w-4" />
            <AlertTitle>Push isn't available in this browser</AlertTitle>
            <AlertDescription>
              Try Chrome, Edge, or Firefox on desktop, or install the app to your iPhone /
              Android home screen.
            </AlertDescription>
          </Alert>
        )}

        {status === "loading" && (
          <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Checking this device…
          </div>
        )}
      </CardContent>
    </Card>
  );
}