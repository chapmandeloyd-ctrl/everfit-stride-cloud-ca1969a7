import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MessageSquare, TrendingUp, Plus, Settings, CheckSquare, Mail, Heart, CheckSquare2, Square, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { AddClientDialog } from "@/components/AddClientDialog";
import { ClientListItem } from "@/components/ClientListItem";
import { useIsMobile } from "@/hooks/use-mobile";
import * as React from "react";
import { ClientStatusDialog } from "@/components/ClientStatusDialog";
import { AssignTaskDialog } from "@/components/AssignTaskDialog";
import { useToast } from "@/hooks/use-toast";
import { useClientHealthScores } from "@/hooks/useClientHealthScores";
import { ClientHealthScorecard } from "@/components/clients/ClientHealthScorecard";
import { QuickControlPanel } from "@/components/clients/QuickControlPanel";
import { BulkActionsSheet } from "@/components/clients/BulkActionsSheet";
import { AUTH_URL } from "@/lib/appUrl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Clients() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const sidebarIsMobile = useIsMobile();
  // Local breakpoint for the Clients grid: show simple list only on true phones (<768px),
  // so tablets and narrow desktops still get the rich client cards with quick controls.
  const [isMobile, setIsMobile] = React.useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const [addClientDialogOpen, setAddClientDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [assignTaskDialogOpen, setAssignTaskDialogOpen] = useState(false);
  const [selectedClientForTask, setSelectedClientForTask] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<{
    id: string;
    status: "active" | "paused" | "pending";
    name: string;
  } | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);

  const toggleSelect = (clientId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  // Health scores
  const { data: healthScores } = useClientHealthScores(user?.id);

  const resendEmailMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await supabase.functions.invoke("resend-client-welcome-email", {
        body: { clientId, loginUrl: AUTH_URL },
      });
      if (error) throw error;
      if (!data?.success) throw new Error("Failed to send email");
      return data;
    },
    onSuccess: (_, clientId) => {
      const client = clients?.find(c => c.client_id === clientId);
      toast({
        title: "Email sent",
        description: `Welcome email has been resent to ${client?.client?.full_name || "client"}`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to send welcome email", variant: "destructive" });
    },
  });

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_clients")
        .select(`*, client:profiles!trainer_clients_client_id_fkey(*)`)
        .eq("trainer_id", user?.id)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filteredClients = clients?.filter((client) =>
    client.client?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.client?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeClients = filteredClients?.filter(c => c.status === "active") || [];
  const pausedClients = filteredClients?.filter(c => c.status === "paused") || [];
  const allClients = filteredClients || [];

  const statusColors = {
    active: "bg-green-500/10 text-green-700 dark:text-green-400",
    paused: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    pending: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  };

  const ClientCard = ({ client }: any) => {
    const score = healthScores?.[client.client_id];
    const isSelected = selectedIds.has(client.client_id);

    return (
      <Card
        className={`hover:shadow-lg transition-all group border-border/60 cursor-pointer ${isSelected ? "ring-2 ring-primary" : ""}`}
        onClick={() => selectMode ? toggleSelect(client.client_id) : navigate(`/clients/${client.client_id}`)}
      >
        <CardContent className="p-0">
          {/* Header with avatar and status */}
          <div className="flex items-center gap-4 p-5 pb-4">
            {selectMode && (
              <button onClick={(e) => { e.stopPropagation(); toggleSelect(client.client_id); }} className="shrink-0">
                {isSelected ? (
                  <CheckSquare2 className="h-5 w-5 text-primary" />
                ) : (
                  <Square className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            )}
            <Avatar className="h-12 w-12 ring-2 ring-border">
              <AvatarImage src={client.client?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {client.client?.full_name?.charAt(0) || "C"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">
                {client.client?.full_name || "New Client"}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  variant="secondary"
                  className={`${statusColors[client.status as keyof typeof statusColors]} text-xs px-2 py-0 shrink-0`}
                >
                  {client.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground break-all mt-0.5">
                {client.client?.email}
              </p>
            </div>
          </div>

          {/* Health Scorecard */}
          {score && client.status === "active" && (
            <div className="px-5 pb-2">
              <ClientHealthScorecard score={score} />
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border/60 mx-5" />

          {/* Actions row */}
          <div className="p-4 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                title="Message"
                onClick={() => navigate(`/messages?client=${client.client_id}`)}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                title="Assign Task"
                onClick={() => { setSelectedClientForTask(client.client_id); setAssignTaskDialogOpen(true); }}
              >
                <CheckSquare className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                title="Workout History"
                onClick={() => navigate(`/clients/${client.client_id}/workout-history`)}
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                title="Health"
                onClick={() => navigate(`/clients/${client.client_id}/health`)}
              >
                <Heart className="h-4 w-4" />
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:bg-primary hover:text-primary-foreground">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[100] bg-background border-border w-56">
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedClient({ id: client.id, status: client.status, name: client.client?.full_name || "Client" });
                    setStatusDialogOpen(true);
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Change Status
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => resendEmailMutation.mutate(client.client_id)}
                  disabled={resendEmailMutation.isPending}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Resend Welcome Email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Quick Control Panel */}
          {client.status === "active" && (
            <div className="px-5 pb-4" onClick={(e) => e.stopPropagation()}>
              <QuickControlPanel clientId={client.client_id} trainerId={user?.id || ""} />
            </div>
          )}

          {/* Footer */}
          <div className="px-5 pb-4 pt-0">
            <p className="text-xs text-muted-foreground">
              Joined {new Date(client.assigned_at).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderClientList = (clientList: any[]) => {
    if (clientList.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No clients found</p>
          </CardContent>
        </Card>
      );
    }

    if (isMobile) {
      return (
        <Card>
          <CardContent className="p-1 divide-y divide-border">
            {clientList.map((client) => (
              <ClientListItem key={client.id} client={client} />
            ))}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {clientList.map((client) => (
          <ClientCard key={client.id} client={client} />
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Clients</h1>
            <p className="text-muted-foreground mt-1">Manage your client relationships</p>
          </div>
          <div className="flex items-center gap-2">
            {!isMobile && (
              <Button
                variant={selectMode ? "default" : "outline"}
                size="sm"
                className="gap-1"
                onClick={() => { setSelectMode(!selectMode); if (selectMode) { setSelectedIds(new Set()); } }}
              >
                <CheckSquare2 className="h-4 w-4" />
                {selectMode ? "Cancel" : "Select"}
              </Button>
            )}
            <Button className="gap-2" onClick={() => setAddClientDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </div>
        </div>

        {/* Bulk action bar */}
        {selectMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              {selectedIds.size} selected
            </Badge>
            <Button size="sm" className="gap-1" onClick={() => setBulkOpen(true)}>
              <Zap className="h-3.5 w-3.5" />
              Bulk Actions
            </Button>
            <Button size="sm" variant="ghost" onClick={() => {
              // Select all active
              const all = new Set(activeClients.map(c => c.client_id));
              setSelectedIds(all);
            }}>
              Select All Active
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Clients ({allClients.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeClients.length})</TabsTrigger>
            <TabsTrigger value="paused">Paused ({pausedClients.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">Loading clients...</p>
              </div>
            ) : renderClientList(allClients)}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {renderClientList(activeClients)}
          </TabsContent>

          <TabsContent value="paused" className="space-y-4">
            {renderClientList(pausedClients)}
          </TabsContent>
        </Tabs>
      </div>

      <AddClientDialog open={addClientDialogOpen} onOpenChange={setAddClientDialogOpen} />

      {selectedClient && (
        <ClientStatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          clientRelationId={selectedClient.id}
          currentStatus={selectedClient.status}
          clientName={selectedClient.name}
        />
      )}

      {selectedClientForTask && (
        <AssignTaskDialog
          clientId={selectedClientForTask}
          open={assignTaskDialogOpen}
          onOpenChange={setAssignTaskDialogOpen}
        />
      )}

      <BulkActionsSheet
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        selectedClientIds={Array.from(selectedIds)}
        trainerId={user?.id || ""}
        onClearSelection={() => { setSelectedIds(new Set()); setSelectMode(false); }}
      />
    </DashboardLayout>
  );
}
