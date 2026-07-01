import { useEffect, useMemo, useRef } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { ArrowRight, Check, Flame, Inbox, TrendingUp } from "lucide-react";
import { toast } from "sonner";

type PhaseFilter = "all" | "adjustment" | "maintenance";

const PAGE_SIZE = 20;

interface KetoNotification {
  id: string;
  title: string;
  body: string | null;
  reference_id: string | null;
  read_at: string | null;
  created_at: string;
}

function detectPhase(n: KetoNotification): "adjustment" | "maintenance" | "other" {
  const t = `${n.title} ${n.body ?? ""}`.toLowerCase();
  if (t.includes("maintenance")) return "maintenance";
  if (t.includes("adjustment")) return "adjustment";
  return "other";
}

export function InboxTab() {
  const qc = useQueryClient();

  const { data: userId } = useQuery({
    queryKey: ["auth-user-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["trainer-keto-inbox", userId],
    enabled: !!userId,
    initialPageParam: 0,
    refetchInterval: 60000,
    queryFn: async ({ pageParam }) => {
      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("in_app_notifications")
        .select("id, title, body, reference_id, read_at, created_at")
        .eq("user_id", userId!)
        .eq("type", "keto_phase_transition")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as KetoNotification[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length,
  });

  const notifications = useMemo(
    () => (data?.pages.flat() ?? []) as KetoNotification[],
    [data],
  );

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Realtime: refresh inbox instantly when a keto reminder is inserted/updated
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`keto-inbox-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "in_app_notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row: any = payload.new ?? payload.old;
          if (row?.type !== "keto_phase_transition") return;
          qc.invalidateQueries({ queryKey: ["trainer-keto-inbox", userId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const clientIds = useMemo(
    () => Array.from(new Set(notifications.map((n) => n.reference_id).filter(Boolean))) as string[],
    [notifications],
  );

  const { data: clientMap = {} } = useQuery({
    queryKey: ["trainer-keto-inbox-clients", clientIds],
    queryFn: async () => {
      if (!clientIds.length) return {};
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", clientIds);
      if (error) throw error;
      const map: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      (data ?? []).forEach((p: any) => (map[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }));
      return map;
    },
    enabled: clientIds.length > 0,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("in_app_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trainer-keto-inbox"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const ids = notifications.filter((n) => !n.read_at).map((n) => n.id);
      if (!ids.length) return;
      const { error } = await supabase
        .from("in_app_notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All reminders marked as read");
      qc.invalidateQueries({ queryKey: ["trainer-keto-inbox"] });
    },
  });

  const groups: Record<PhaseFilter, KetoNotification[]> = {
    all: notifications,
    adjustment: notifications.filter((n) => detectPhase(n) === "adjustment"),
    maintenance: notifications.filter((n) => detectPhase(n) === "maintenance"),
  };
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Keto phase reminders</h2>
          <p className="text-sm text-muted-foreground">
            Automated alerts when your clients enter Adjustment (Day 8) or Maintenance (Day 22).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllRead.mutate()}
          disabled={!unreadCount || markAllRead.isPending}
        >
          <Check className="h-4 w-4 mr-1.5" />
          Mark all read
        </Button>
      </div>

      <div className="flex gap-2 text-xs">
        <Badge variant="secondary">Total {groups.all.length}</Badge>
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
          Adjustment {groups.adjustment.length}
        </Badge>
        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          Maintenance {groups.maintenance.length}
        </Badge>
        {unreadCount > 0 && (
          <Badge className="bg-destructive text-destructive-foreground">{unreadCount} unread</Badge>
        )}
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : notifications.length === 0 ? (
        <Card className="p-10 text-center">
          <Inbox className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No reminders yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            You'll see alerts here when your keto clients hit Day 8 and Day 22.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const phase = detectPhase(n);
            const client = n.reference_id ? clientMap[n.reference_id] : null;
            const isAdjustment = phase === "adjustment";
            const Icon = isAdjustment ? Flame : TrendingUp;
            const accent = isAdjustment
              ? "text-amber-500 bg-amber-500/10"
              : "text-emerald-500 bg-emerald-500/10";

            return (
              <Card
                key={n.id}
                className={`p-4 flex gap-3 items-start transition-colors ${
                  n.read_at ? "opacity-70" : "border-primary/40"
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug">{n.title}</p>
                    {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </div>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.body}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <p
                      className="text-[11px] text-muted-foreground"
                      title={format(new Date(n.created_at), "PPpp")}
                    >
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      {client?.full_name ? ` · ${client.full_name}` : ""}
                    </p>
                    <div className="flex gap-1">
                      {!n.read_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => markRead.mutate(n.id)}
                        >
                          Mark read
                        </Button>
                      )}
                      {n.reference_id && (
                        <Button asChild size="sm" className="h-7 text-xs">
                          <Link
                            to={`/clients/${n.reference_id}`}
                            onClick={() => !n.read_at && markRead.mutate(n.id)}
                          >
                            Open client
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          <div ref={sentinelRef} />
          {isFetchingNextPage && (
            <p className="text-center text-xs text-muted-foreground py-3">Loading more…</p>
          )}
          {!hasNextPage && notifications.length > PAGE_SIZE && (
            <p className="text-center text-xs text-muted-foreground py-3">You're all caught up.</p>
          )}
        </div>
      )}
    </div>
  );
}