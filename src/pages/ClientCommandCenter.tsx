import { DashboardLayout } from "@/components/DashboardLayout";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Key, Trash2, Copy, Check, Loader2, Share2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClientOverviewTab } from "@/components/command-center/ClientOverviewTab";
import { ClientSettingsTab } from "@/components/command-center/ClientSettingsTab";
import { CoachCommandCenterTab } from "@/components/command-center/CoachCommandCenterTab";
import { GroupedTrainingTab } from "@/components/command-center/GroupedTrainingTab";
import { GroupedNutritionTab } from "@/components/command-center/GroupedNutritionTab";
import { GroupedProgressTab } from "@/components/command-center/GroupedProgressTab";
import { ClientWodsTab } from "@/components/command-center/ClientWodsTab";
import { ClientTasksTab } from "@/components/command-center/ClientTasksTab";
import { ClientCalendarTab } from "@/components/command-center/ClientCalendarTab";
import { Skeleton } from "@/components/ui/skeleton";
import { AUTH_URL } from "@/lib/appUrl";

export default function ClientCommandCenter() {
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [passwordChooserOpen, setPasswordChooserOpen] = useState(false);
  const [customPassword, setCustomPassword] = useState("");
  const [customPasswordError, setCustomPasswordError] = useState<string | null>(null);

  const { data: clientData, isLoading } = useQuery({
    queryKey: ["client-detail", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_clients")
        .select(`
          *,
          client:profiles!trainer_clients_client_id_fkey(*)
        `)
        .eq("trainer_id", user?.id)
        .eq("client_id", clientId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!clientId,
  });

  const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-700 dark:text-green-400",
    paused: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    pending: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  };

  const resetPasswordMutation = useMutation({
    mutationFn: async (overridePassword?: string) => {
      const newPassword =
        overridePassword ??
        Math.random().toString(36).slice(-8) +
          Math.random().toString(36).slice(-4).toUpperCase();
      const { data, error } = await supabase.functions.invoke("delete-users", {
        body: { action: "reset-password", userId: clientId, newPassword },
      });
      if (error) throw error;
      if (!data?.success) throw new Error("Failed to reset password");
      return newPassword;
    },
    onSuccess: (password) => {
      setGeneratedPassword(password);
      setPasswordChooserOpen(false);
      setCustomPassword("");
      setCustomPasswordError(null);
      setCredentialsOpen(true);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("delete-users", {
        body: { action: "delete", userId: clientId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error("Failed to delete client");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Client deleted", description: "All client data has been removed." });
      navigate("/clients");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCopyCredentials = async () => {
    if (!clientData?.client?.email || !generatedPassword) return;
    const text = `Login URL: ${AUTH_URL}\nEmail: ${clientData.client.email}\nPassword: ${generatedPassword}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!clientData) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Client not found</p>
          <Button variant="link" onClick={() => navigate("/clients")}>
            Back to Clients
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const client = clientData.client;
  const clientName = client?.full_name || client?.email || "Client";

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Client Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-14 w-14 ring-2 ring-border">
            <AvatarImage src={client?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
              {clientName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground truncate">{clientName}</h1>
              <Badge
                variant="secondary"
                className={`${statusColors[clientData.status] || ""} text-xs shrink-0`}
              >
                {clientData.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{client?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setPasswordChooserOpen(true)}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
              Credentials
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate("/messages")}
            >
              <MessageSquare className="h-4 w-4" />
              Message
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Tabbed Command Center */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="command">Command Center</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="client-wods">Client WODs</TabsTrigger>
            <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ClientOverviewTab clientId={clientId!} trainerId={user?.id!} />
          </TabsContent>
          <TabsContent value="command">
            <CoachCommandCenterTab clientId={clientId!} trainerId={user?.id!} />
          </TabsContent>
          <TabsContent value="training">
            <GroupedTrainingTab clientId={clientId!} trainerId={user?.id!} />
          </TabsContent>
          <TabsContent value="schedule">
            <ClientCalendarTab clientId={clientId!} trainerId={user?.id!} />
          </TabsContent>
          <TabsContent value="tasks">
            <ClientTasksTab clientId={clientId!} trainerId={user?.id!} />
          </TabsContent>
          <TabsContent value="client-wods">
            <ClientWodsTab clientId={clientId!} trainerId={user?.id!} />
          </TabsContent>
          <TabsContent value="nutrition">
            <GroupedNutritionTab clientId={clientId!} trainerId={user?.id!} />
          </TabsContent>
          <TabsContent value="progress">
            <GroupedProgressTab clientId={clientId!} trainerId={user?.id!} clientName={clientData?.client?.full_name} />
          </TabsContent>
          <TabsContent value="settings">
            <ClientSettingsTab clientId={clientId!} trainerId={user?.id!} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Credentials Dialog */}
      <Dialog open={credentialsOpen} onOpenChange={(open) => { setCredentialsOpen(open); if (!open) { setGeneratedPassword(null); setCopied(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Client Login Credentials</DialogTitle>
            <DialogDescription>
              A new password has been generated for <strong>{clientName}</strong>. Share these with your client.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2 text-sm font-mono">
            <div><span className="text-muted-foreground">Login URL:</span> {AUTH_URL}</div>
            <div><span className="text-muted-foreground">Email:</span> {clientData?.client?.email}</div>
            <div><span className="text-muted-foreground">Password:</span> {generatedPassword}</div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleCopyCredentials} className="gap-2 flex-1">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button variant="outline" onClick={async () => {
              const text = `Here are your login details:\n\nLogin URL: ${AUTH_URL}\nEmail: ${clientData?.client?.email}\nPassword: ${generatedPassword}`;
              if (navigator.share) {
                try { await navigator.share({ title: "Login Credentials", text }); } catch {}
              } else {
                window.open(`sms:?body=${encodeURIComponent(text)}`);
              }
            }} className="gap-2 flex-1">
              <Share2 className="h-4 w-4" />
              Share via Text
            </Button>
            <Button onClick={() => setCredentialsOpen(false)} className="flex-1">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Chooser Dialog */}
      <Dialog
        open={passwordChooserOpen}
        onOpenChange={(open) => {
          setPasswordChooserOpen(open);
          if (!open) {
            setCustomPassword("");
            setCustomPasswordError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password for {clientName}</DialogTitle>
            <DialogDescription>
              Auto-generate a secure password or set your own. The new password will replace the client's current one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              className="w-full"
              onClick={() => resetPasswordMutation.mutate(undefined)}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Key className="mr-2 h-4 w-4" />
              )}
              Auto-Generate Secure Password
            </Button>
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-border" />
              <span className="mx-4 text-xs uppercase text-muted-foreground">or</span>
              <div className="flex-grow border-t border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-password">Set Custom Password</Label>
              <Input
                id="custom-password"
                type="text"
                placeholder="Min 8 characters"
                value={customPassword}
                onChange={(e) => {
                  setCustomPassword(e.target.value);
                  setCustomPasswordError(null);
                }}
                maxLength={72}
              />
              {customPasswordError && (
                <p className="text-xs text-destructive">{customPasswordError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordChooserOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const trimmed = customPassword.trim();
                if (trimmed.length < 8) {
                  setCustomPasswordError("Password must be at least 8 characters.");
                  return;
                }
                if (trimmed.length > 72) {
                  setCustomPasswordError("Password must be 72 characters or fewer.");
                  return;
                }
                resetPasswordMutation.mutate(trimmed);
              }}
              disabled={resetPasswordMutation.isPending || customPassword.trim().length === 0}
            >
              {resetPasswordMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Set Custom Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {clientName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this client and all their data (workouts, tasks, nutrition logs, messages, etc.) from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteClientMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteClientMutation.isPending}
            >
              {deleteClientMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete Client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
