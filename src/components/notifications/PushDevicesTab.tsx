import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Send, Smartphone, BellRing, AlertTriangle, CheckCircle2, Search, XCircle, Loader2, ChevronDown, ChevronUp, ZapOff } from "lucide-react";
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
  recent_removal_count: number;
  last_removal_at: string | null;
  last_removal_reason: string | null;
};

type FilterKey = "all" | "no_devices" | "stale" | "subscribed" | "expired";

const STALE_DAYS = 14;
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;
const REMOVAL_LOOKBACK_DAYS = 7;

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

  // 4) Recent unresolved push subscription removals (auto-pruned 404/410
  //    endpoints). These are the "silent failure" clients — the dispatcher
  //    actually tried to deliver and the endpoint was dead.
  const { data: removals = [], refetch: refetchRemovals } = useQuery({
    queryKey: ["push-overview-removals", clientIds.join(",")],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const since = new Date(
        Date.now() - REMOVAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();
      const { data, error } = await supabase
        .from("push_subscription_removals")
        .select("user_id, removed_at, reason, removed_by, endpoint_host")
        .in("user_id", clientIds)
        .is("resolved_at", null)
        .gte("removed_at", since)
        .order("removed_at", { ascending: false });
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
    const remBy: Record<string, { count: number; latest: string | null; reason: string | null }> = {};
    for (const r of removals) {
      const cur = remBy[r.user_id] ?? { count: 0, latest: null, reason: null };
      cur.count += 1;
      if (!cur.latest || (r.removed_at && r.removed_at > cur.latest)) {
        cur.latest = r.removed_at;
        cur.reason = r.reason;
      }
      remBy[r.user_id] = cur;
    }

    return roster.map((r) => ({
      client_id: r.client_id,
      full_name: r.profile?.full_name ?? null,
      email: r.profile?.email ?? null,
      avatar_url: r.profile?.avatar_url ?? null,
      device_count: subBy[r.client_id]?.count ?? 0,
      last_seen_at: subBy[r.client_id]?.latest ?? null,
      prefers_push: prefBy[r.client_id] ?? null,
      recent_removal_count: remBy[r.client_id]?.count ?? 0,
      last_removal_at: remBy[r.client_id]?.latest ?? null,
      last_removal_reason: remBy[r.client_id]?.reason ?? null,
    }));
  }, [roster, subscriptions, prefs, removals]);

  // Status classification — deliberately three buckets, matching client UI.
  function classify(row: ClientRow): "subscribed" | "no_devices" | "stale" {
    if (row.device_count === 0) return "no_devices";
    const lastSeen = row.last_seen_at ? new Date(row.last_seen_at).getTime() : 0;
    if (lastSeen && Date.now() - lastSeen > STALE_MS) return "stale";
    return "subscribed";
  }

  const counts = useMemo(() => {
    const c = { all: rows.length, subscribed: 0, no_devices: 0, stale: 0, expired: 0 };
    for (const r of rows) c[classify(r)] += 1;
    c.expired = rows.filter((r) => r.recent_removal_count > 0).length;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filter === "all") return true;
        if (filter === "expired") return r.recent_removal_count > 0;
        return classify(r) === filter;
      })
      .filter((r) =>
        !q
          ? true
          : (r.full_name ?? "").toLowerCase().includes(q) ||
            (r.email ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => {
        // Surface problems first: expired removals → no_devices → stale → subscribed
        const expiredA = a.recent_removal_count > 0 ? -1 : 0;
        const expiredB = b.recent_removal_count > 0 ? -1 : 0;
        if (expiredA !== expiredB) return expiredA - expiredB;
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

  // Bulk nudge: send re-subscribe nudges to every client with recent
  // unresolved auto-removals. Inserted as a single batch.
  const [bulkSending, setBulkSending] = useState(false);
  const handleBulkNudge = async () => {
    const targets = rows.filter((r) => r.recent_removal_count > 0).map((r) => r.client_id);
    if (targets.length === 0) return;
    setBulkSending(true);
    try {
      const payload = targets.map((id) => ({
        user_id: id,
        type: "push_resubscribe",
        title: "Re-enable lock-screen reminders",
        body: "Your device stopped receiving reminders. Open Settings → Lock-screen reminders to fix it (one tap).",
        action_url: "/client/settings",
      }));
      const { error } = await supabase.from("in_app_notifications").insert(payload);
      if (error) throw error;
      toast({
        title: `Nudged ${targets.length} client${targets.length === 1 ? "" : "s"}`,
        description: "Each will see it in their notification bell.",
      });
    } catch (err) {
      toast({
        title: "Bulk nudge failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setBulkSending(false);
    }
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
      queryClient.invalidateQueries({ queryKey: ["push-overview-removals"] });
      void refetchRemovals;
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

      {/* Silent failure banner — recent unresolved auto-removals (404/410) */}
      {counts.expired > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <ZapOff className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">
                  {counts.expired} client{counts.expired === 1 ? "" : "s"} had push silently fail in the last {REMOVAL_LOOKBACK_DAYS} days
                </p>
                <p className="text-xs text-muted-foreground">
                  Their device endpoints returned 404/410 during a real reminder. Banner clears automatically when they re-subscribe.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => setFilter("expired")}>
                Show affected
              </Button>
              <Button size="sm" onClick={handleBulkNudge} disabled={bulkSending}>
                <Bell className="h-4 w-4 mr-2" />
                {bulkSending ? "Sending…" : "Prompt all to re-enable"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter + search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="no_devices">Not subscribed ({counts.no_devices})</TabsTrigger>
            <TabsTrigger value="stale">Stale ({counts.stale})</TabsTrigger>
            <TabsTrigger value="subscribed">Subscribed ({counts.subscribed})</TabsTrigger>
            {counts.expired > 0 && (
              <TabsTrigger value="expired" className="text-destructive">
                Expired ({counts.expired})
              </TabsTrigger>
            )}
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
                const result = results[r.client_id];
                const isExpanded = !!expanded[r.client_id];
                return (
                  <li
                    key={r.client_id}
                    className="flex flex-col gap-3 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
                          {r.recent_removal_count > 0 && (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1 text-destructive">
                                <ZapOff className="h-3 w-3" />
                                {r.recent_removal_count} expired endpoint
                                {r.recent_removal_count === 1 ? "" : "s"}
                                {r.last_removal_at && (
                                  <> · {formatDistanceToNow(new Date(r.last_removal_at), { addSuffix: true })}</>
                                )}
                              </span>
                            </>
                          )}
                        </div>
                        {result && (
                          <DeliverySummary
                            result={result}
                            expanded={isExpanded}
                            onToggle={() =>
                              setExpanded((p) => ({ ...p, [r.client_id]: !p[r.client_id] }))
                            }
                          />
                        )}
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
                          {isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          {isPending ? "Sending…" : "Test push"}
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
                    </div>
                    {result && isExpanded && <DeliveryDetails result={result} />}
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

function DeliverySummary({
  result,
  expanded,
  onToggle,
}: {
  result: DeliveryResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const noDevices = result.total === 0;
  const allOk = result.ok && result.failed === 0 && result.total > 0;
  const partial = result.delivered > 0 && result.failed > 0;
  const allFailed = !noDevices && result.delivered === 0;

  let tone = "text-muted-foreground";
  let Icon = AlertTriangle;
  let label = "";
  if (noDevices) {
    tone = "text-destructive";
    Icon = XCircle;
    label = "No devices found by edge function";
  } else if (allOk) {
    tone = "text-primary";
    Icon = CheckCircle2;
    label = `Delivered to all ${result.total} device${result.total === 1 ? "" : "s"}`;
  } else if (partial) {
    tone = "text-amber-600 dark:text-amber-400";
    Icon = AlertTriangle;
    label = `Delivered ${result.delivered}/${result.total} — ${result.failed} failed`;
  } else if (allFailed) {
    tone = "text-destructive";
    Icon = XCircle;
    label = `All ${result.total} device${result.total === 1 ? "" : "s"} failed`;
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`mt-1 inline-flex items-center gap-1 text-xs hover:underline ${tone}`}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
      <span className="text-muted-foreground">
        · {formatDistanceToNow(new Date(result.ranAt), { addSuffix: true })}
      </span>
      {result.devices.length > 0 &&
        (expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        ))}
    </button>
  );
}

function DeliveryDetails({ result }: { result: DeliveryResult }) {
  if (result.total === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        The edge function reported 0 push subscriptions for this client.
        {result.message ? <> Server message: <span className="font-mono">{result.message}</span></> : null}
      </div>
    );
  }
  return (
    <div className="rounded-md border bg-muted/30">
      <div className="border-b px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Per-device delivery
      </div>
      <ul className="divide-y divide-border">
        {result.devices.map((d) => (
          <li key={d.id} className="flex items-start justify-between gap-3 px-3 py-2 text-xs">
            <div className="min-w-0 flex items-start gap-2">
              {d.ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              ) : (
                <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
              )}
              <div className="min-w-0">
                <p className="font-medium">
                  {d.device}
                  {d.endpoint_host && (
                    <span className="ml-1 text-muted-foreground font-normal">
                      · {d.endpoint_host}
                    </span>
                  )}
                </p>
                {!d.ok && d.error && (
                  <p className="mt-0.5 break-all text-destructive/90 font-mono text-[11px]">
                    {d.error.length > 240 ? d.error.slice(0, 240) + "…" : d.error}
                  </p>
                )}
                {d.removed && (
                  <p className="mt-0.5 text-muted-foreground italic">
                    Endpoint expired — subscription removed.
                  </p>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right text-muted-foreground">
              {d.ok ? (
                <Badge variant="outline" className="text-primary border-primary">
                  {d.status ?? "ok"}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-destructive border-destructive">
                  {d.status ?? "error"}
                </Badge>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}