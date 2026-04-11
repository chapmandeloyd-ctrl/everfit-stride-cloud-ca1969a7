import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  Search,
  ChevronRight,
  Clock,
  Users,
} from "lucide-react";

interface CoachIntelligenceTabProps {
  trainerId: string;
}

export function CoachIntelligenceTab({ trainerId }: CoachIntelligenceTabProps) {
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: clientsData, isLoading } = useQuery({
    queryKey: ["coach-intelligence", trainerId],
    queryFn: async () => {
      const { data: clients, error: clientsErr } = await supabase
        .from("trainer_clients")
        .select(`
          client_id,
          status,
          client:profiles!trainer_clients_client_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq("trainer_id", trainerId)
        .eq("status", "active");

      if (clientsErr) throw clientsErr;
      if (!clients || clients.length === 0) return [];

      const clientIds = clients.map((c) => c.client_id);

      const [summariesRes, ketoRes] = await Promise.all([
        supabase.from("client_weekly_summaries").select("*").in("client_id", clientIds),
        supabase
          .from("client_keto_assignments")
          .select("client_id, keto_types(name)")
          .in("client_id", clientIds)
          .eq("is_active", true),
      ]);

      const summaryMap = new Map((summariesRes.data || []).map((s) => [s.client_id, s]));
      const ketoMap = new Map(
        (ketoRes.data || []).map((k) => [k.client_id, (k.keto_types as any)?.name || null])
      );

      // Get pending suggestions
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: events } = await supabase
        .from("recommendation_events")
        .select("client_id, status, plan_suggestion_type, plan_suggestion_text, created_at, dismissed, coach_approved")
        .in("client_id", clientIds)
        .gte("created_at", fourteenDaysAgo)
        .order("created_at", { ascending: false });

      const eventsMap = new Map<string, typeof events>();
      (events || []).forEach((e) => {
        if (!eventsMap.has(e.client_id)) eventsMap.set(e.client_id, []);
        eventsMap.get(e.client_id)!.push(e);
      });

      return clients.map((c) => {
        const summary = summaryMap.get(c.client_id);
        const ketoType = ketoMap.get(c.client_id) || null;
        const clientEvents = eventsMap.get(c.client_id) || [];

        const completion7d = summary?.completion_7d ? Number(summary.completion_7d) : null;
        const trend = (summary?.trend_direction as "up" | "down" | "flat") || "flat";
        const scoreStatus = summary?.score_status || "moderate";
        const lowestFactor = summary?.lowest_factor_mode || null;
        const adherence = summary?.adherence_score ? Number(summary.adherence_score) : null;

        const needsSupportDays = summary?.needs_support_days_14d || 0;

        const pendingSuggestion = clientEvents.find(
          (e) => e.plan_suggestion_type && !e.dismissed && !e.coach_approved
        );

        return {
          clientId: c.client_id,
          name: c.client?.full_name || c.client?.email || "Client",
          avatarUrl: c.client?.avatar_url,
          ketoType,
          scoreStatus,
          lowestFactor,
          completion7d,
          adherence,
          trend,
          needsSupportDays14d: needsSupportDays,
          pendingSuggestion,
        };
      });
    },
    enabled: !!trainerId,
  });

  const filteredClients = useMemo(() => {
    if (!clientsData) return [];
    return clientsData.filter((c) => {
      if (statusFilter !== "all") {
        const status = (c.scoreStatus || "").toLowerCase();
        if (statusFilter === "strong" && !status.includes("strong")) return false;
        if (statusFilter === "moderate" && !status.includes("moderate")) return false;
        if (statusFilter === "needs_support" && !status.includes("needs")) return false;
      }
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [clientsData, statusFilter, search]);

  const priorityClients = useMemo(() => {
    if (!filteredClients) return [];
    return filteredClients
      .filter(
        (c) =>
          (c.scoreStatus || "").toLowerCase().includes("needs") ||
          c.needsSupportDays14d >= 3 ||
          (c.trend === "down" && (c.completion7d ?? 100) < 70)
      )
      .sort((a, b) => (a.adherence ?? 100) - (b.adherence ?? 100));
  }, [filteredClients]);

  const pendingReviewClients = useMemo(() => {
    return (filteredClients || []).filter((c) => c.pendingSuggestion);
  }, [filteredClients]);

  // Summary stats
  const summaryStats = useMemo(() => {
    if (!clientsData || clientsData.length === 0) return null;
    const total = clientsData.length;
    const withKeto = clientsData.filter((c) => c.ketoType).length;
    const trendingUp = clientsData.filter((c) => c.trend === "up").length;
    const trendingDown = clientsData.filter((c) => c.trend === "down").length;
    const withCompletion = clientsData.filter((c) => c.completion7d !== null);
    const avgCompletion = withCompletion.length > 0
      ? Math.round(withCompletion.reduce((s, c) => s + (c.completion7d || 0), 0) / withCompletion.length)
      : null;
    return { total, withKeto, trendingUp, trendingDown, avgCompletion };
  }, [clientsData]);

  const statusBadgeClass = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("strong")) return "bg-green-500/10 text-green-700 dark:text-green-400";
    if (s.includes("needs")) return "bg-red-500/10 text-red-700 dark:text-red-400";
    return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
  };

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "up") return <ArrowUp className="h-3.5 w-3.5 text-green-600" />;
    if (trend === "down") return <ArrowDown className="h-3.5 w-3.5 text-red-600" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const ClientRow = ({ client }: { client: (typeof filteredClients)[0] }) => (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => navigate(`/clients/${client.clientId}`)}
    >
      <Avatar className="h-9 w-9">
        <AvatarImage src={client.avatarUrl || undefined} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
          {client.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{client.name}</span>
          {client.ketoType && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
              {client.ketoType}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          {client.completion7d !== null && <span>{client.completion7d}% complete</span>}
          {client.lowestFactor && <span className="capitalize">{client.lowestFactor}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="secondary" className={`text-[10px] ${statusBadgeClass(client.scoreStatus)}`}>
          {client.scoreStatus}
        </Badge>
        <TrendIcon trend={client.trend} />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="strong">Strong</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="needs_support">Needs Support</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Active Clients</p>
                  <p className="text-2xl font-bold">{summaryStats.total}</p>
                </div>
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Keto Assigned</p>
                  <p className="text-2xl font-bold">{summaryStats.withKeto}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">of {summaryStats.total}</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Completion</p>
                  <p className="text-2xl font-bold">{summaryStats.avgCompletion ?? "—"}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Trending</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <ArrowUp className="h-3.5 w-3.5" /> {summaryStats.trendingUp}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-red-600">
                      <ArrowDown className="h-3.5 w-3.5" /> {summaryStats.trendingDown}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Priority Queue */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Priority Queue
            {priorityClients.length > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {priorityClients.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Clients requiring immediate attention</CardDescription>
        </CardHeader>
        <CardContent>
          {priorityClients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No clients require immediate attention.
            </p>
          ) : (
            <div className="space-y-2">
              {priorityClients.map((c) => (
                <ClientRow key={c.clientId} client={c} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Coach Review */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            Pending Coach Review
            {pendingReviewClients.length > 0 && (
              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px]">
                {pendingReviewClients.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Plan suggestions awaiting your approval</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingReviewClients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pending reviews.
            </p>
          ) : (
            <div className="space-y-2">
              {pendingReviewClients.map((c) => (
                <div
                  key={c.clientId}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/clients/${c.clientId}`)}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={c.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                      {c.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{c.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {c.pendingSuggestion?.plan_suggestion_type}
                      </Badge>
                      {c.pendingSuggestion?.plan_suggestion_text && (
                        <span className="text-xs text-muted-foreground truncate">
                          {c.pendingSuggestion.plan_suggestion_text}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Clients Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Clients ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No clients match your filters.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredClients
                .sort((a, b) => (a.adherence ?? 100) - (b.adherence ?? 100))
                .map((c) => (
                  <ClientRow key={c.clientId} client={c} />
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
