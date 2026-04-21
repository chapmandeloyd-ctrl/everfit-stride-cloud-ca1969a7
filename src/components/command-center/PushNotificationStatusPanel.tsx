import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, BellOff, Send, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { sendTestPush } from "@/lib/pushNotifications";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Props {
  clientId: string;
  trainerId: string;
}

/**
 * Trainer-side panel showing whether a client's device(s) are subscribed to
 * server-driven push notifications, and a button to send a test push.
 */
export function PushNotificationStatusPanel({ clientId }: Props) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const { data: subs, isLoading, refetch } = useQuery({
    queryKey: ["push-subs", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("id, user_agent, last_seen_at, created_at")
        .eq("user_id", clientId)
        .order("last_seen_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: lastDeliveries } = useQuery({
    queryKey: ["push-log", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_log")
        .select("kind, status, delivered_count, subscription_count, created_at, title")
        .eq("user_id", clientId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleTest = async () => {
    setSending(true);
    try {
      const result = await sendTestPush(clientId);
      if (result.ok) {
        toast({
          title: "Test push sent ✅",
          description: `Delivered to ${result.delivered ?? 0} of ${result.total ?? 0} devices.`,
        });
      } else {
        toast({
          title: "Test push failed",
          description: result.message || "No devices on file or delivery failed.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Test push failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
      refetch();
    }
  };

  const deviceCount = subs?.length ?? 0;
  const hasDevices = deviceCount > 0;

  function describeDevice(ua?: string | null): string {
    if (!ua) return "Unknown device";
    if (/iPhone|iPad/.test(ua)) return "iOS device";
    if (/Android/.test(ua)) return "Android device";
    if (/Macintosh/.test(ua)) return "Mac";
    if (/Windows/.test(ua)) return "Windows";
    return "Browser";
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            {hasDevices ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
            Push notifications
          </CardTitle>
          <CardDescription>
            Server-driven reminders for health, habits, tasks, nudges, and fasting milestones — fire even when the app is closed.
          </CardDescription>
        </div>
        <Badge variant={hasDevices ? "default" : "outline"}>
          {hasDevices ? `${deviceCount} device${deviceCount === 1 ? "" : "s"}` : "Not enabled"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : hasDevices ? (
          <ul className="space-y-2">
            {subs!.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span>{describeDevice(s.user_agent)}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Active {formatDistanceToNow(new Date(s.last_seen_at), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            This client hasn't enabled push notifications yet. Ask them to toggle on push from their notification settings.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleTest} disabled={!hasDevices || sending} size="sm">
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Sending…" : "Send test push"}
          </Button>
          {!hasDevices && (
            <span className="text-xs text-muted-foreground">Test requires at least one subscribed device.</span>
          )}
        </div>

        {lastDeliveries && lastDeliveries.length > 0 && (
          <div className="space-y-1 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent deliveries</p>
            <ul className="space-y-1">
              {lastDeliveries.map((d, i) => (
                <li key={i} className="flex items-center justify-between text-xs">
                  <span className="truncate">
                    <span className="font-medium capitalize">{d.kind.replace(/_/g, " ")}</span>
                    {d.title ? ` — ${d.title}` : ""}
                  </span>
                  <span className="ml-2 shrink-0 text-muted-foreground">
                    {d.delivered_count}/{d.subscription_count} ·{" "}
                    {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}