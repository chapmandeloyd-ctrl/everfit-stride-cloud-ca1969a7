import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Users,
  Dumbbell,
  Calendar,
  TrendingUp,
  Search,
  Plus,
  ChevronRight,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type ClientWithFeatures = Tables<"profiles"> & {
  client_feature_settings?: Tables<"client_feature_settings">[];
};

export default function TrainerDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientWithFeatures[]>([]);
  const [search, setSearch] = useState("");
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notStartedIds, setNotStartedIds] = useState<Set<string>>(new Set());
  const [notStartedDetails, setNotStartedDetails] = useState<
    Record<string, { startDate: string; daysOverdue: number }>
  >({});

  useEffect(() => {
    if (!profile?.id) return;

    const fetchData = async () => {
      // Fetch clients assigned to this trainer
      const { data: featureSettings } = await supabase
        .from("client_feature_settings")
        .select("client_id, protocol_start_date")
        .eq("trainer_id", profile.id);

      if (featureSettings && featureSettings.length > 0) {
        const clientIds = featureSettings.map((fs) => fs.client_id);
        const { data: clientProfiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", clientIds)
          .eq("role", "client");

        setClients(clientProfiles || []);

        // Compute "hasn't started": start_date is today or past AND no fasting_log since then
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const candidates = (featureSettings ?? []).filter(
          (fs) =>
            fs.protocol_start_date &&
            new Date(fs.protocol_start_date as string) <= today,
        );
        if (candidates.length > 0) {
          const candidateIds = candidates.map((c) => c.client_id);
          const earliest = candidates.reduce(
            (min, c) =>
              !min || (c.protocol_start_date as string) < min
                ? (c.protocol_start_date as string)
                : min,
            "" as string,
          );
          const { data: logs } = await supabase
            .from("fasting_log")
            .select("client_id")
            .in("client_id", candidateIds)
            .gte("start_time", earliest + "T00:00:00Z");
          const startedSet = new Set((logs ?? []).map((l) => l.client_id));
          const missing = new Set<string>();
          const details: Record<string, { startDate: string; daysOverdue: number }> = {};
          for (const c of candidates) {
            if (!startedSet.has(c.client_id)) {
              missing.add(c.client_id);
              const sd = String(c.protocol_start_date).slice(0, 10);
              const overdue = Math.max(
                0,
                Math.round(
                  (today.getTime() - new Date(sd + "T00:00:00Z").getTime()) /
                    86_400_000,
                ),
              );
              details[c.client_id] = { startDate: sd, daysOverdue: overdue };
            }
          }
          setNotStartedIds(missing);
          setNotStartedDetails(details);
        }
      }

      // Today's appointments count
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const { count } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("trainer_id", profile.id)
        .gte("start_time", startOfDay)
        .lte("start_time", endOfDay)
        .neq("status", "cancelled");

      setTodayAppointments(count || 0);
      setLoading(false);
    };

    fetchData();
  }, [profile?.id]);

  const filteredClients = clients.filter(
    (c) =>
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {profile?.full_name?.split(" ")[0] || "Coach"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your clients today.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Clients</p>
                <p className="text-3xl font-bold mt-1">{clients.length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Today's Sessions</p>
                <p className="text-3xl font-bold mt-1">{todayAppointments}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Active Programs</p>
                <p className="text-3xl font-bold mt-1">—</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Dumbbell className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Unread Messages</p>
                <p className="text-3xl font-bold mt-1">—</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Not started card */}
      {notStartedIds.size > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-base">
                {notStartedIds.size} client{notStartedIds.size === 1 ? "" : "s"} haven't started their plan
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {clients
                .filter((c) => notStartedIds.has(c.id))
                .map((c) => {
                  const d = notStartedDetails[c.id];
                  return (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/clients/${c.id}`)}
                      className="flex w-full items-center gap-3 rounded-lg bg-background/60 hover:bg-background transition-colors px-3 py-2 text-left"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={c.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(c.full_name, c.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {c.full_name || c.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d?.daysOverdue === 0
                            ? `Starts today · not logged yet`
                            : `${d?.daysOverdue}d overdue · started ${d?.startDate}`}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-[10px]">
                        Not started
                      </Badge>
                    </button>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client list */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Your Clients</CardTitle>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Add Client
            </Button>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground mt-3 text-sm">
                {clients.length === 0
                  ? "No clients yet. Add your first client to get started."
                  : "No clients match your search."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="flex w-full items-center gap-4 py-4 px-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                >
                  <Avatar className="h-11 w-11 border-2 border-muted">
                    <AvatarImage src={client.avatar_url || undefined} />
                    <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                      {getInitials(client.full_name, client.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {client.full_name || client.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                  </div>
                  {notStartedIds.has(client.id) && (
                    <Badge variant="destructive" className="text-[10px] gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Not started
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs capitalize">
                    {client.subscription_tier}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
