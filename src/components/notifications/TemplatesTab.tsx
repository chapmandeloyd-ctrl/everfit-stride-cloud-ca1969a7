import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NotificationTemplate, EmailBlock } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Copy, Trash2, Mail, Bell, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function TemplatesTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["notification-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("trainer_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as NotificationTemplate[];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notification_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template deleted");
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
    },
    onError: () => toast.error("Failed to delete template"),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (template: NotificationTemplate) => {
      const { error } = await supabase.from("notification_templates").insert({
        trainer_id: user!.id,
        name: `${template.name} (Copy)`,
        subject: template.subject,
        body_html: template.body_html,
        body_json: template.body_json as any,
        channel: template.channel,
        category: template.category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template duplicated");
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
    },
    onError: () => toast.error("Failed to duplicate template"),
  });

  const channelIcon = (channel: string) => {
    switch (channel) {
      case "email": return <Mail className="h-3 w-3" />;
      case "in_app": return <Bell className="h-3 w-3" />;
      case "both": return <Send className="h-3 w-3" />;
      default: return null;
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Loading templates...</div>;
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-sm">No templates yet. Create one from the Compose tab.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <Card key={template.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{template.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{template.subject || "No subject"}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => duplicateMutation.mutate(template)}>
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => deleteMutation.mutate(template.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs gap-1">
                {channelIcon(template.channel)}
                {template.channel === "both" ? "Email + In-App" : template.channel === "in_app" ? "In-App" : "Email"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {template.category}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              Updated {format(new Date(template.updated_at), "MMM d, yyyy")}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
