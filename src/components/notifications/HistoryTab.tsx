import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NotificationSend } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Mail, Bell, Send, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function HistoryTab() {
  const { user } = useAuth();

  const { data: sends = [], isLoading } = useQuery({
    queryKey: ["notification-sends", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_sends")
        .select("*")
        .eq("trainer_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as NotificationSend[];
    },
    enabled: !!user,
  });

  const statusBadge = (status: string) => {
    const config: Record<string, { icon: any; variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      sent: { icon: CheckCircle, variant: "default", label: "Sent" },
      sending: { icon: Send, variant: "secondary", label: "Sending" },
      scheduled: { icon: Clock, variant: "outline", label: "Scheduled" },
      failed: { icon: XCircle, variant: "destructive", label: "Failed" },
      cancelled: { icon: AlertCircle, variant: "secondary", label: "Cancelled" },
      draft: { icon: Clock, variant: "outline", label: "Draft" },
    };
    const c = config[status] || config.draft;
    const Icon = c.icon;
    return (
      <Badge variant={c.variant} className="text-xs gap-1">
        <Icon className="h-3 w-3" />
        {c.label}
      </Badge>
    );
  };

  const channelLabel = (channel: string) => {
    switch (channel) {
      case "email": return <span className="flex items-center gap-1 text-xs"><Mail className="h-3 w-3" /> Email</span>;
      case "in_app": return <span className="flex items-center gap-1 text-xs"><Bell className="h-3 w-3" /> In-App</span>;
      case "both": return <span className="flex items-center gap-1 text-xs"><Send className="h-3 w-3" /> Both</span>;
      default: return channel;
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Loading history...</div>;
  }

  if (sends.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-sm">No notifications sent yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent/Scheduled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sends.map((send) => (
              <TableRow key={send.id}>
                <TableCell className="font-medium text-sm max-w-[200px] truncate">
                  {send.subject}
                </TableCell>
                <TableCell>{channelLabel(send.channel)}</TableCell>
                <TableCell>
                  <span className="text-sm">{send.sent_count}/{send.total_recipients}</span>
                </TableCell>
                <TableCell>{statusBadge(send.status)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {send.sent_at
                    ? format(new Date(send.sent_at), "MMM d, yyyy h:mm a")
                    : send.scheduled_at
                      ? format(new Date(send.scheduled_at), "MMM d, yyyy h:mm a")
                      : format(new Date(send.created_at), "MMM d, yyyy h:mm a")
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
