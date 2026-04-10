import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RecipientPicker } from "./RecipientPicker";
import { RecipientMode, RecipientFilter, EmailBlock } from "./types";
import { blocksToHtml } from "./emailRenderer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Zap, Trophy, Dumbbell, Heart, Flame, Star, CalendarCheck, MessageCircle } from "lucide-react";
import { toast } from "sonner";



interface QuickTemplate {
  id: string;
  name: string;
  subject: string;
  icon: React.ReactNode;
  color: string;
  blocks: EmailBlock[];
  channel: "email" | "in_app" | "both";
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: "motivation",
    name: "Motivational Boost",
    subject: "Keep Pushing — You're Doing Amazing! 💪",
    icon: <Flame className="h-5 w-5" />,
    color: "bg-orange-500/10 text-orange-500",
    channel: "both",
    blocks: [
      { id: "1", type: "heading", content: "Keep Pushing! 💪", level: 1, alignment: "center" },
      { id: "2", type: "text", content: "Hey there! Just a quick reminder — every rep, every meal, every choice you make is building a stronger you. Your consistency is what separates good from great. Keep going, the results are coming!", alignment: "left" },
      { id: "3", type: "divider", content: "" },
      { id: "4", type: "text", content: "Your coach believes in you. Let's finish this week strong! 🔥", alignment: "center" },
    ],
  },
  {
    id: "checkin-reminder",
    name: "Check-In Reminder",
    subject: "Time for Your Weekly Check-In ✅",
    icon: <CalendarCheck className="h-5 w-5" />,
    color: "bg-blue-500/10 text-blue-500",
    channel: "both",
    blocks: [
      { id: "1", type: "heading", content: "Weekly Check-In Time ✅", level: 1, alignment: "center" },
      { id: "2", type: "text", content: "It's time for your weekly check-in! Take a moment to log your progress — weigh in, update your measurements, and reflect on the week. Tracking is key to staying on pace.", alignment: "left" },
      { id: "3", type: "button", content: "Open Dashboard", url: "https://everfit-stride-cloud.lovable.app/client/dashboard", alignment: "center" },
    ],
  },
  {
    id: "workout-reminder",
    name: "Workout Reminder",
    subject: "Don't Forget Today's Workout! 🏋️",
    icon: <Dumbbell className="h-5 w-5" />,
    color: "bg-primary/10 text-primary",
    channel: "both",
    blocks: [
      { id: "1", type: "heading", content: "Workout Time! 🏋️", level: 1, alignment: "center" },
      { id: "2", type: "text", content: "Your workout is waiting for you! Remember — showing up is half the battle. Let's get moving and crush this session!", alignment: "left" },
      { id: "3", type: "button", content: "Start Workout", url: "https://everfit-stride-cloud.lovable.app/client/dashboard", alignment: "center" },
    ],
  },
  {
    id: "milestone",
    name: "Milestone Celebration",
    subject: "🏆 Amazing Achievement — Celebrate Your Win!",
    icon: <Trophy className="h-5 w-5" />,
    color: "bg-yellow-500/10 text-yellow-500",
    channel: "both",
    blocks: [
      { id: "1", type: "heading", content: "Congratulations! 🏆", level: 1, alignment: "center" },
      { id: "2", type: "text", content: "You've hit an incredible milestone! Your hard work, dedication, and consistency have paid off. Take a moment to celebrate this win — you've earned it!", alignment: "left" },
      { id: "3", type: "divider", content: "" },
      { id: "4", type: "text", content: "Keep the momentum going. The best is yet to come! ⭐", alignment: "center" },
    ],
  },
  {
    id: "nutrition-tip",
    name: "Nutrition Tip",
    subject: "Quick Nutrition Tip for Better Results 🥗",
    icon: <Heart className="h-5 w-5" />,
    color: "bg-green-500/10 text-green-500",
    channel: "both",
    blocks: [
      { id: "1", type: "heading", content: "Nutrition Tip of the Day 🥗", level: 1, alignment: "center" },
      { id: "2", type: "text", content: "Remember: nutrition is the foundation of your results. Focus on getting enough protein with every meal, staying hydrated, and keeping your meals balanced. Small changes add up to big results!", alignment: "left" },
      { id: "3", type: "button", content: "View Meal Plan", url: "https://everfit-stride-cloud.lovable.app/client/dashboard", alignment: "center" },
    ],
  },
  {
    id: "welcome-back",
    name: "Welcome Back",
    subject: "We Missed You — Let's Get Back On Track! 🚀",
    icon: <Star className="h-5 w-5" />,
    color: "bg-purple-500/10 text-purple-500",
    channel: "both",
    blocks: [
      { id: "1", type: "heading", content: "Welcome Back! 🚀", level: 1, alignment: "center" },
      { id: "2", type: "text", content: "We noticed you've been away for a bit — and that's okay! Life happens. What matters is that you're here now. Let's get back into the routine and pick up right where you left off.", alignment: "left" },
      { id: "3", type: "button", content: "Open Dashboard", url: "https://everfit-stride-cloud.lovable.app/client/dashboard", alignment: "center" },
    ],
  },
  {
    id: "coach-message",
    name: "Coach Note",
    subject: "A Quick Message From Your Coach 📝",
    icon: <MessageCircle className="h-5 w-5" />,
    color: "bg-teal-500/10 text-teal-500",
    channel: "both",
    blocks: [
      { id: "1", type: "heading", content: "Message From Your Coach 📝", level: 1, alignment: "center" },
      { id: "2", type: "text", content: "Just wanted to check in and see how things are going. Remember, I'm here to help you every step of the way. If you have questions or need adjustments to your plan, don't hesitate to reach out!", alignment: "left" },
      { id: "3", type: "button", content: "Reply to Coach", url: "https://everfit-stride-cloud.lovable.app/client/messages", alignment: "center" },
    ],
  },
];

export function QuickSendTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedTemplate, setSelectedTemplate] = useState<QuickTemplate | null>(null);
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("all");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>({});
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: allClients = [] } = useQuery({
    queryKey: ["all-clients-count", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id").eq("role", "client");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: filteredGroupClients = [] } = useQuery({
    queryKey: ["filtered-group-clients", user?.id, recipientFilter],
    queryFn: async () => {
      let query = supabase.from("profiles").select("id").eq("role", "client");
      if (recipientFilter.engine_mode || recipientFilter.subscription_tier) {
        const { data: settings } = await supabase
          .from("client_feature_settings")
          .select("client_id, engine_mode, subscription_tier");
        let filteredIds = (settings || [])
          .filter(s => {
            if (recipientFilter.engine_mode && s.engine_mode !== recipientFilter.engine_mode) return false;
            if (recipientFilter.subscription_tier && s.subscription_tier !== recipientFilter.subscription_tier) return false;
            return true;
          })
          .map(s => s.client_id);
        if (filteredIds.length === 0) return [];
        const { data, error } = await supabase.from("profiles").select("id").in("id", filteredIds);
        if (error) throw error;
        return data || [];
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && recipientMode === "group",
  });

  const recipientCount = (() => {
    switch (recipientMode) {
      case "individual": return selectedClientIds.length;
      case "all": return allClients.length;
      case "group": return filteredGroupClients.length;
      default: return 0;
    }
  })();

  const getRecipientIds = (): string[] => {
    switch (recipientMode) {
      case "individual": return selectedClientIds;
      case "all": return allClients.map(c => c.id);
      case "group": return filteredGroupClients.map(c => c.id);
      default: return [];
    }
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error("No template selected");
      const recipientIds = getRecipientIds();
      if (recipientIds.length === 0) throw new Error("No recipients selected");

      const bodyHtml = blocksToHtml(selectedTemplate.blocks);
      const { subject, channel } = selectedTemplate;

      const { data: send, error: sendError } = await supabase
        .from("notification_sends")
        .insert([{
          trainer_id: user!.id,
          subject,
          body_html: bodyHtml,
          channel,
          recipient_type: recipientMode,
          recipient_filter: recipientMode === "group" ? (recipientFilter as any) : null,
          total_recipients: recipientIds.length,
          status: "sending",
        }])
        .select()
        .single();
      if (sendError) throw sendError;

      const recipientRecords = recipientIds.flatMap(clientId => {
        const channels: ("email" | "in_app")[] = channel === "both" ? ["email", "in_app"] : [channel === "email" ? "email" : "in_app"];
        return channels.map(ch => ({
          send_id: send.id,
          client_id: clientId,
          channel: ch,
          status: "pending",
        }));
      });

      await supabase.from("notification_send_recipients").insert(recipientRecords);

      // In-app notifications
      if (channel === "in_app" || channel === "both") {
        const inAppRecords = recipientIds.map(clientId => ({
          user_id: clientId,
          title: subject,
          body: selectedTemplate.blocks.map(b => b.content).filter(Boolean).join(" ").slice(0, 200),
          send_id: send.id,
        }));
        await supabase.from("in_app_notifications").insert(inAppRecords);
      }

      // Email
      if (channel === "email" || channel === "both") {
        const { data: clientProfiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", recipientIds);

        if (clientProfiles) {
          for (const client of clientProfiles) {
            if (!client.email) continue;
            try {
              await supabase.functions.invoke("send-transactional-email", {
                body: {
                  templateName: "admin-notification",
                  recipientEmail: client.email,
                  idempotencyKey: `quick-${send.id}-${client.id}`,
                  templateData: { subject, bodyHtml },
                },
              });
            } catch (err) {
              console.error(`Failed to send email to ${client.email}:`, err);
            }
          }
        }
      }

      await supabase
        .from("notification_sends")
        .update({ status: "sent", sent_at: new Date().toISOString(), sent_count: recipientIds.length })
        .eq("id", send.id);

      return send;
    },
    onSuccess: () => {
      toast.success("Quick notification sent!");
      queryClient.invalidateQueries({ queryKey: ["notification-sends"] });
      setSelectedTemplate(null);
      setShowConfirm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleQuickSend = (template: QuickTemplate) => {
    setSelectedTemplate(template);
    setShowConfirm(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {QUICK_TEMPLATES.map((template) => (
          <Card
            key={template.id}
            className="overflow-hidden hover:shadow-md transition-all cursor-pointer group border-border hover:border-primary/30"
            onClick={() => handleQuickSend(template)}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg shrink-0 ${template.color}`}>
                  {template.icon}
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground">{template.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{template.subject}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {template.channel === "both" ? "Email + In-App" : template.channel === "in_app" ? "In-App" : "Email"}
                </Badge>
                <Badge variant="outline" className="text-xs gap-1">
                  <Zap className="h-3 w-3" />
                  Quick Send
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Send Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Quick Send: {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Choose recipients and send "{selectedTemplate?.subject}"
            </DialogDescription>
          </DialogHeader>

          <RecipientPicker
            mode={recipientMode}
            onModeChange={setRecipientMode}
            selectedClientIds={selectedClientIds}
            onSelectedClientsChange={setSelectedClientIds}
            filter={recipientFilter}
            onFilterChange={setRecipientFilter}
            recipientCount={recipientCount}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || recipientCount === 0}
              className="gap-1.5"
            >
              <Send className="h-4 w-4" />
              Send to {recipientCount} {recipientCount === 1 ? "client" : "clients"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
