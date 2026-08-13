import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Smartphone, Monitor, Tablet, Trash2, RefreshCw, AlertTriangle, Send } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isPushSupported } from "@/lib/pushNotifications";

/**
 * ManagePushDevicesCard
 *
 * Lists every push endpoint registered to the signed-in user so stale
 * devices (old phones, one-off browsers) can be removed. Stale rows are
 * the usual reason a "test reminder" reports partial delivery.
 */

const STALE_DAYS = 30;

type DeviceRow = {
  id: string;
  endpoint: string;
  device_label: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
};

function deviceIcon(ua: string | null) {
  const s = (ua ?? "").toLowerCase();
  if (/ipad|tablet/.test(s)) return Tablet;
  if (/iphone|android|mobile/.test(s)) return Smartphone;
  return Monitor;
}

function describeDevice(row: DeviceRow) {
  if (row.device_label) return row.device_label;
  const ua = row.user_agent ?? "";
  const os =
    /iPhone/i.test(ua) ? "iPhone" :
    /iPad/i.test(ua) ? "iPad" :
    /Android/i.test(ua) ? "Android" :
    /Mac OS X|Macintosh/i.test(ua) ? "Mac" :
    /Windows/i.test(ua) ? "Windows" :
    /Linux/i.test(ua) ? "Linux" : "Unknown device";
  const browser =
    /CriOS|Chrome/i.test(ua) ? "Chrome" :
    /Firefox/i.test(ua) ? "Firefox" :
    /Edg/i.test(ua) ? "Edge" :
    /Safari/i.test(ua) ? "Safari" : null;
  return browser ? `${os} · ${browser}` : os;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"} ago`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const mins = Math.floor(diff / 60_000);
  return mins >= 1 ? `${mins} min ago` : "just now";
}

export function ManagePushDevicesCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<DeviceRow | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Identify which row belongs to the browser we're looking at right now.
  useEffect(() => {
    let cancelled = false;
    if (!isPushSupported()) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/");
        const sub = await (reg as any)?.pushManager?.getSubscription();
        if (!cancelled) setCurrentEndpoint(sub?.endpoint ?? null);
      } catch {
        if (!cancelled) setCurrentEndpoint(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { data: devices, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["push-devices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, device_label, user_agent, created_at, last_seen_at")
        .eq("user_id", user!.id)
        .order("last_seen_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DeviceRow[];
    },
    enabled: !!user?.id,
  });

  const isStale = (row: DeviceRow) =>
    Date.now() - new Date(row.last_seen_at).getTime() > STALE_DAYS * 86_400_000;

  const staleCount = (devices ?? []).filter(isStale).length;

  const removeDevice = async (row: DeviceRow) => {
    setRemovingId(row.id);
    try {
      const { error } = await supabase.from("push_subscriptions").delete().eq("id", row.id);
      if (error) throw error;

      // If we just removed THIS browser, drop the local subscription too so the
      // UI doesn't claim it's still registered.
      if (currentEndpoint && row.endpoint === currentEndpoint) {
        try {
          const reg = await navigator.serviceWorker.getRegistration("/");
          const sub = await (reg as any)?.pushManager?.getSubscription();
          await sub?.unsubscribe();
        } catch {
          /* best effort */
        }
        setCurrentEndpoint(null);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["push-devices"] }),
        queryClient.invalidateQueries({ queryKey: ["push-subscription-device"] }),
      ]);
      toast({ title: "Device removed", description: "It will no longer receive reminders." });
    } catch (err) {
      toast({
        title: "Couldn't remove device",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
      setPendingRemoval(null);
    }
  };

  const removeAllStale = async () => {
    const ids = (devices ?? []).filter(isStale).map((d) => d.id);
    if (!ids.length) return;
    setRemovingId("stale");
    try {
      const { error } = await supabase.from("push_subscriptions").delete().in("id", ids);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["push-devices"] });
      toast({
        title: `Removed ${ids.length} stale device${ids.length === 1 ? "" : "s"}`,
        description: "Test reminders will now only target active devices.",
      });
    } catch (err) {
      toast({
        title: "Cleanup failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
    }
  };

  /** Fire a push at exactly one registered endpoint (no email / in-app copy). */
  const sendTestToDevice = async (row: DeviceRow) => {
    setTestingId(row.id);
    try {
      const { data, error } = await supabase.functions.invoke("dispatch-juice-log-reminders", {
        body: { test: true, subscriptionId: row.id },
      });
      if (error) throw error;
      const pushed = (data as any)?.pushed ?? 0;
      toast({
        title: pushed > 0 ? "Test sent to this device" : "Delivery failed",
        description:
          pushed > 0
            ? `${describeDevice(row)} should show a notification within a few seconds.`
            : `${describeDevice(row)} rejected the push. It may need reminders re-enabled.`,
        variant: pushed > 0 ? undefined : "destructive",
      });
    } catch (err) {
      toast({
        title: "Couldn't send test",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Manage devices
              </CardTitle>
              <CardDescription>
                Every browser and phone you've enabled reminders on. Remove old ones so test
                reminders only go where you'll see them.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Refresh device list"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading devices…
            </div>
          ) : !devices?.length ? (
            <p className="text-sm text-muted-foreground py-4">
              No devices registered yet. Enable lock-screen reminders above to add this one.
            </p>
          ) : (
            <>
              {staleCount > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">
                      {staleCount} device{staleCount === 1 ? " hasn't" : "s haven't"} been seen in
                      over {STALE_DAYS} days.
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={removeAllStale}
                    disabled={removingId === "stale"}
                  >
                    {removingId === "stale" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Clean up"
                    )}
                  </Button>
                </div>
              )}

              <ul className="space-y-2">
                {devices.map((row) => {
                  const Icon = deviceIcon(row.user_agent);
                  const current = !!currentEndpoint && row.endpoint === currentEndpoint;
                  const stale = isStale(row);
                  return (
                    <li
                      key={row.id}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {describeDevice(row)}
                          </span>
                          {current && (
                            <Badge variant="outline" className="text-primary border-primary">
                              This device
                            </Badge>
                          )}
                          {stale && !current && (
                            <Badge variant="outline" className="text-muted-foreground">
                              Stale
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Last active {relativeTime(row.last_seen_at)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => sendTestToDevice(row)}
                        disabled={testingId === row.id || removingId === row.id}
                        aria-label={`Send test to ${describeDevice(row)}`}
                        title="Send test to this device"
                      >
                        {testingId === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => setPendingRemoval(row)}
                        disabled={removingId === row.id}
                        aria-label={`Remove ${describeDevice(row)}`}
                      >
                        {removingId === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!pendingRemoval}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this device?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemoval && describeDevice(pendingRemoval)} will stop receiving lock-screen
              reminders.
              {pendingRemoval && currentEndpoint === pendingRemoval.endpoint
                ? " This is the device you're using right now — you'll need to re-enable reminders here."
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingRemoval && removeDevice(pendingRemoval)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
