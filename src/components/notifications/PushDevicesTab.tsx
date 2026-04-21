import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Send, Smartphone, BellRing, AlertTriangle, CheckCircle2, Search, XCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { sendTestPush, type PushDeviceResult } from "@/lib/pushNotifications";
import { formatDistanceToNow } from "date-fns";

/**
 * PushDevicesTab — trainer-facing roster of push subscription health.
 *
 * Surfaces the silent failure mode where a client toggled push at some point
 * but no longer has a device row in `push_subscriptions` (cleared cache,
 * uninstalled the PWA, switched browsers, or revoked OS-level permission).
 * Lets the trainer trigger a "re-subscribe" nudge that lands in the client's
 * existing in-app notification feed and deep-links them to settings.
 */

type ClientRow = {
  client_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  device_count: number;
  last_seen_at: string | null;
  prefers_push: boolean | null;
};

type FilterKey = "all" | "no_devices" | "stale" | "subscribed";

const STALE_DAYS = 14;
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;

type DeliveryResult = {
  ok: boolean;
  delivered: number;
  failed: number;
  total: number;
  message?: string;
  devices: PushDeviceResult[];
  ranAt: number;
};

export function PushDevicesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, DeliveryResult>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // 1) Roster of this trainer's clients.
  const { data: roster = [], isLoading: rosterLoading } = useQuery({
    queryKey: ["push-overview-roster", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_clients")
        .select(
          "client_id, status, client:profiles!trainer_clients_client_id_fkey(id, full_name, email, avatar_url)"
        )
        .eq("trainer_id", user?.id!)
        .eq("status", "active");
      if (error) throw error;
      return (data ?? [])
        .map((row: any) => ({
          client_id: row.client_id as string,
          profile: row.client,
        }))
        .filter((r) => !!r.profile);
    },
    enabled: !!user?.id,
  });

  const clientIds = useMemo(() => roster.map((r) => r.client_id), [roster]);

  // 2) All push subscriptions for those clients (one query, group in JS).
  const { data: subscriptions = [], isLoading: subsLoading } = useQuery({
    queryKey: ["push-overview-subs", clientIds.join(",")],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("user_id, last_seen_at")
        .in("user_id", clientIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: clientIds.length > 0,
  });

  // 3) Legacy push_enabled preference — tells us whether the client ever
  //    intended to be subscribed (so "no devices + push_enabled=true" is the
  //    high-priority "lost subscription" cohort).
  const { data: prefs = [] } = useQuery({
    queryKey: ["push-overview-prefs", clientIds.join(",")],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("user_id, push_enabled")
        .in("user_id", clientIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: clientIds.length > 0,
  });

  // Merge into denormalized rows.
  const rows: ClientRow[] = useMemo(() => {
    const subBy: Record<string, { count: number; latest: string | null }> = {};
    for (const s of subscriptions) {
      const cur = subBy[s.user_id] ?? { count: 0, latest: null };
      cur.count += 1;
      if (!cur.latest || (s.last_seen_at && s.last_seen_at > cur.latest)) {
        cur.latest = s.last_seen_at;
      }
      subBy[s.user_id] = cur;
    }
    const prefBy: Record<string, boolean | null> = {};
    for (const p of prefs) prefBy[p.user_id] = p.push_enabled ?? null;

    return roster.map((r) => ({
      client_id: r.client_id,
      full_name: r.profile?.full_name ?? null,
      email: r.profile?.email ?? null,
      avatar_url: r.profile?.avatar_url ?? null,
      device_count: subBy[r.client_id]?.count ?? 0,
      last_seen_at: subBy[r.client_id]?.latest ?? null,
      prefers_push: prefBy[r.client_id] ?? null,
    }));
  }, [roster, subscriptions, prefs]);

  // Status classification — deliberately three buckets, matching client UI.
  function classify(row: ClientRow): "subscribed" | "no_devices" | "stale" {
    if (row.device_count === 0) return "no_devices";
    const lastSeen = row.last_seen_at ? new Date(row.last_seen_at).getTime() : 0;
    if (lastSeen && Date.now() - lastSeen > STALE_MS) return "stale";
    return "subscribed";
  }

  const counts = useMemo(() => {
    const c = { all: rows.length, subscribed: 0, no_devices: 0, stale: 0 };
    for (const r of rows) c[classify(r)] += 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => filter === "all" || classify(r) === filter)
      .filter((r) =>
        !q
          ? true
          : (r.full_name ?? "").toLowerCase().includes(q) ||
            (r.email ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => {
        // Surface problems first: no_devices → stale → subscribed
        const order = { no_devices: 0, stale: 1, subscribed: 2 } as const;
        const sa = order[classify(a)];
        const sb = order[classify(b)];
        if (sa !== sb) return sa - sb;
        return (a.full_name ?? "").localeCompare(b.full_name ?? "");
      });
  }, [rows, filter, search]);

  // Re-subscribe nudge — writes to `in_app_notifications`, which the client
  // already polls via NotificationBell. Deep-links to /client/settings.
  const nudgeMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase.from("in_app_notifications").insert({
        user_id: clientId,
        type: "push_resubscribe",
        title: "Re-enable lock-screen reminders",
        body: "Your device isn't receiving reminders right now. Open Settings → Lock-screen reminders to fix it (one tap).",
        action_url: "/client/settings",
      });
      if (error) throw error;
    },
    onSuccess: (_data, clientId) => {
      toast({
        title: "Nudge sent",
        description: "The client will see it in their notification bell.",
      });
      queryClient.invalidateQueries({ queryKey: ["push-overview-subs"] });
      setPendingId(null);
      void clientId;
    },
    onError: (err: Error) => {
      toast({
        title: "Could not send nudge",
        description: err.message,
        variant: "destructive",
      });
      setPendingId(null);
    },
  });

  const handleNudge = (clientId: string) => {
    setPendingId(clientId);
    nudgeMutation.mutate(clientId);
  };

  const handleTestPush = async (clientId: string) => {
    setPendingId(clientId);
    try {
      const result = await sendTestPush(clientId);
      setResults((prev) => ({
        ...prev,
        [clientId]: {
          ok: !!result.ok,
          delivered: result.delivered ?? 0,
          failed: result.failed ?? 0,
          total: result.total ?? 0,
          message: result.message,
          devices: result.devices ?? [],
          ranAt: Date.now(),
        },
      }));
      setExpanded((prev) => ({ ...prev, [clientId]: true }));
      if (result.ok) {
        toast({
          title: "Test push sent",
          description: `Delivered to ${result.delivered ?? 0} of ${result.total ?? 0} device(s).`,
        });
      } else {
        toast({
          title: "Test push failed",
          description: result.message || "No devices on file.",
          variant: "destructive",
        });
      }
      // Refresh roster — expired endpoints may have been pruned server-side.
      queryClient.invalidateQueries({ queryKey: ["push-overview-subs"] });
    } finally {
      setPendingId(null);
    }
  };

  const loading = rosterLoading || subsLoading;

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="h-5 w-5" />
            Push notification overview
          </CardTitle>
          <CardDescription>
            Identifies clients whose lock-screen reminders are silently failing — no
            registered device, or last seen over {STALE_DAYS} days ago. Send a nudge to
            prompt them to re-enable from their device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <SummaryStat
              label="Subscribed"
              value={counts.subscribed}
              tone="positive"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <SummaryStat
              label="Not subscribed"
              value={counts.no_devices}
              tone="warn"
              icon={<BellOff className="h-4 w-4" />}
            />
            <SummaryStat
              label={`Stale (>${STALE_DAYS}d)`}
              value={counts.stale}
              tone="warn"
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Filter + search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="no_devices">Not subscribed ({counts.no_devices})</TabsTrigger>
            <TabsTrigger value="stale">Stale ({counts.stale})</TabsTrigger>
            <TabsTrigger value="subscribed">Subscribed ({counts.subscribed})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative md:w-64">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client…"
            className="pl-8"
          />
        </div>
      </div>

      {/* Roster table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading clients…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {rows.length === 0
                ? "No active clients yet."
                : "No clients match this filter."}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((r) => {
                const status = classify(r);
                const isPending = pendingId === r.client_id;
                return (
                  <li
                    key={r.client_id}
                    className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={r.avatar_url ?? undefined} />
                        <AvatarFallback>
                          {(r.full_name ?? r.email ?? "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {r.full_name || r.email || "Unnamed client"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <StatusBadge status={status} />
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Smartphone className="h-3 w-3" />
                            {r.device_count} device{r.device_count === 1 ? "" : "s"}
                          </span>
                          {r.last_seen_at && (
                            <>
                              <span>·</span>
                              <span>
                                last seen{" "}
                                {formatDistanceToNow(new Date(r.last_seen_at), {
                                  addSuffix: true,
                                })}
                              </span>
                            </>
                          )}
                          {r.prefers_push && r.device_count === 0 && (
                            <>
                              <span>·</span>
                              <span className="text-destructive">had push enabled</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {status === "subscribed" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestPush(r.client_id)}
                          disabled={isPending}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Test push
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleNudge(r.client_id)}
                          disabled={isPending}
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          {isPending ? "Sending…" : "Send re-subscribe nudge"}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "positive" | "warn";
  icon: React.ReactNode;
}) {
  const toneClass =
    tone === "positive"
      ? "text-primary"
      : "text-muted-foreground";
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className={`flex items-center gap-2 text-xs ${toneClass}`}>
        {icon}
        <span className="uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: "subscribed" | "no_devices" | "stale" }) {
  if (status === "subscribed") {
    return (
      <Badge variant="outline" className="text-primary border-primary">
        Subscribed
      </Badge>
    );
  }
  if (status === "stale") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Stale
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-destructive border-destructive">
      Not subscribed
    </Badge>
  );
}