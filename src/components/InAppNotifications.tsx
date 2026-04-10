import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import logoSrc from "@/assets/logo.png";
import { notificationQueryKeys } from "@/lib/notification-query-keys";

interface DashboardNotification {
  id: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export function InAppNotifications() {
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const notificationsQueryKey = notificationQueryKeys.dashboardEvents(clientId);

  const { data: notifications } = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("in_app_notifications")
        .select("*")
        .eq("user_id", clientId!)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as DashboardNotification[];
    },
    enabled: !!clientId,
    refetchInterval: 60000,
  });

  const markOpenedMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("in_app_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });

      const previousNotifications =
        queryClient.getQueryData<DashboardNotification[]>(notificationsQueryKey) || [];

      queryClient.setQueryData<DashboardNotification[]>(
        notificationsQueryKey,
        (current = []) => current.filter((notification) => notification.id !== id)
      );

      return { previousNotifications };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(
        notificationsQueryKey,
        context?.previousNotifications || []
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey, exact: true });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("in_app_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });

      const previousNotifications =
        queryClient.getQueryData<DashboardNotification[]>(notificationsQueryKey) || [];

      queryClient.setQueryData<DashboardNotification[]>(
        notificationsQueryKey,
        (current = []) => current.filter((notification) => notification.id !== id)
      );

      return { previousNotifications };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(
        notificationsQueryKey,
        context?.previousNotifications || []
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey, exact: true });
    },
  });

  if (!notifications || notifications.length === 0) return null;

  const formatTime = (dateStr: string | null) => {
    if (!dateStr || isNaN(new Date(dateStr).getTime())) return "Just now";
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <img
          src={logoSrc}
          alt="KSOM-360"
          className="h-8 w-8 rounded-lg object-contain"
        />
        <h2 className="text-lg font-heading font-bold text-foreground tracking-tight">
          Notifications
        </h2>
        <span className="text-xs font-semibold bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">
          {notifications.length}
        </span>
      </div>

      {/* Notification cards */}
      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="relative rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              {/* Accent bar */}
              <div className="w-1 self-stretch rounded-full bg-primary shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                  {n.title}
                </p>
                {n.body && (
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">
                    {n.body}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground/70 mt-2 font-medium">
                  {formatTime(n.created_at)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary"
                  onClick={() => markOpenedMutation.mutate(n.id)}
                  title="Mark as read"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => dismissMutation.mutate(n.id)}
                  title="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
