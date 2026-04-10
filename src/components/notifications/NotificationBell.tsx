import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { notificationQueryKeys } from "@/lib/notification-query-keys";

interface InAppNotification {
  id: string;
  title: string;
  body: string | null;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
}

export function NotificationBell() {
  const activeClientId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const notificationsQueryKey = notificationQueryKeys.bellNotifications(activeClientId);

  const { data: notifications = [] } = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("in_app_notifications")
        .select("*")
        .eq("user_id", activeClientId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as InAppNotification[];
    },
    enabled: !!activeClientId,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!activeClientId) return;

    const channel = supabase
      .channel(`in-app-notifications-${activeClientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "in_app_notifications",
          filter: `user_id=eq.${activeClientId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["in-app-notifications", activeClientId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeClientId, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("in_app_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey, exact: true });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications.filter((notification) => !notification.read_at).map((notification) => notification.id);
      if (unreadIds.length === 0) return;
      const { error } = await supabase
        .from("in_app_notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey, exact: true });
    },
  });

  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 text-[10px] bg-primary text-primary-foreground flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-2"
              onClick={() => markAllReadMutation.mutate()}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[320px]">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notifications yet</p>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                className={`w-full text-left px-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${!notification.read_at ? "bg-primary/5" : ""}`}
                onClick={() => {
                  if (!notification.read_at) markReadMutation.mutate(notification.id);
                  if (notification.action_url) window.location.href = notification.action_url;
                }}
              >
                <div className="flex items-start gap-2">
                  {!notification.read_at && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{notification.title}</p>
                    {notification.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.body}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
