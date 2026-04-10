import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmailBlock, RecipientMode, RecipientFilter } from "./types";
import { EmailBlockEditor } from "./EmailBlockEditor";
import { EmailPreview } from "./EmailPreview";
import { RecipientPicker } from "./RecipientPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, Save, Monitor, Smartphone, CalendarIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { blocksToHtml } from "./emailRenderer";

export function ComposeTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState("");
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [channel, setChannel] = useState<"email" | "in_app" | "both">("email");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("individual");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  // Get all clients count for "all" mode
  const { data: allClients = [] } = useQuery({
    queryKey: ["all-clients-count", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "client");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Get filtered clients for "group" mode
  const { data: filteredGroupClients = [] } = useQuery({
    queryKey: ["filtered-group-clients", user?.id, recipientFilter],
    queryFn: async () => {
      let query = supabase.from("profiles").select("id").eq("role", "client");

      if (recipientFilter.engine_mode || recipientFilter.subscription_tier) {
        const { data: settings, error: settingsError } = await supabase
          .from("client_feature_settings")
          .select("client_id, engine_mode, subscription_tier");
        if (settingsError) throw settingsError;

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

      const { data, error } = query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && recipientMode === "group",
  });

  const recipientCount = useMemo(() => {
    switch (recipientMode) {
      case "individual": return selectedClientIds.length;
      case "all": return allClients.length;
      case "group": return filteredGroupClients.length;
      default: return 0;
    }
  }, [recipientMode, selectedClientIds, allClients, filteredGroupClients]);

  const getRecipientIds = (): string[] => {
    switch (recipientMode) {
      case "individual": return selectedClientIds;
      case "all": return allClients.map(c => c.id);
      case "group": return filteredGroupClients.map(c => c.id);
      default: return [];
    }
  };

  const sendMutation = useMutation({
    mutationFn: async (scheduledAt?: string) => {
      const recipientIds = getRecipientIds();
      if (recipientIds.length === 0) throw new Error("No recipients selected");
      if (!subject.trim()) throw new Error("Subject is required");

      const bodyHtml = blocksToHtml(blocks);

      // Create the send record
      const { data: send, error: sendError } = await supabase
        .from("notification_sends")
        .insert({
          trainer_id: user!.id,
          subject,
          body_html: bodyHtml,
          channel,
          recipient_type: recipientMode,
          recipient_filter: recipientMode === "group" ? recipientFilter : null,
          total_recipients: recipientIds.length,
          status: scheduledAt ? "scheduled" : "sending",
          scheduled_at: scheduledAt || null,
        })
        .select()
        .single();
      if (sendError) throw sendError;

      // Create recipient records
      const recipientRecords = recipientIds.flatMap(clientId => {
        const channels: ("email" | "in_app")[] = channel === "both" ? ["email", "in_app"] : [channel === "email" ? "email" : "in_app"];
        return channels.map(ch => ({
          send_id: send.id,
          client_id: clientId,
          channel: ch,
          status: scheduledAt ? "pending" : "pending",
        }));
      });

      const { error: recipError } = await supabase
        .from("notification_send_recipients")
        .insert(recipientRecords);
      if (recipError) throw recipError;

      // If not scheduled, send immediately
      if (!scheduledAt) {
        // Send in-app notifications
        if (channel === "in_app" || channel === "both") {
          const inAppRecords = recipientIds.map(clientId => ({
            user_id: clientId,
            title: subject,
            body: blocks.map(b => b.content).filter(Boolean).join(" ").slice(0, 200),
            send_id: send.id,
          }));

          const { error: inAppError } = await supabase
            .from("in_app_notifications")
            .insert(inAppRecords);
          if (inAppError) throw inAppError;
        }

        // Send emails via transactional email system
        if (channel === "email" || channel === "both") {
          // Get client emails
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
                    idempotencyKey: `admin-notif-${send.id}-${client.id}`,
                    templateData: {
                      subject,
                      bodyHtml: bodyHtml,
                    },
                  },
                });
              } catch (err) {
                console.error(`Failed to send email to ${client.email}:`, err);
              }
            }
          }
        }

        // Update send status
        await supabase
          .from("notification_sends")
          .update({ status: "sent", sent_at: new Date().toISOString(), sent_count: recipientIds.length })
          .eq("id", send.id);
      }

      return send;
    },
    onSuccess: (_, scheduledAt) => {
      toast.success(scheduledAt ? "Notification scheduled!" : "Notification sent!");
      queryClient.invalidateQueries({ queryKey: ["notification-sends"] });
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!templateName.trim()) throw new Error("Template name is required");
      const { error } = await supabase.from("notification_templates").insert({
        trainer_id: user!.id,
        name: templateName,
        subject,
        body_html: blocksToHtml(blocks),
        body_json: blocks as any,
        channel,
        category: "custom",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template saved!");
      setShowSaveTemplate(false);
      setTemplateName("");
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setSubject("");
    setBlocks([]);
    setSelectedClientIds([]);
    setRecipientFilter({});
    setShowConfirm(false);
    setShowSchedule(false);
  };

  const handleSend = () => {
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    if (recipientCount === 0) { toast.error("Select at least one recipient"); return; }
    setShowConfirm(true);
  };

  const handleSchedule = () => {
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    if (recipientCount === 0) { toast.error("Select at least one recipient"); return; }
    setShowSchedule(true);
  };

  const confirmSchedule = () => {
    if (!scheduleDate) { toast.error("Select a date"); return; }
    const [hours, minutes] = scheduleTime.split(":").map(Number);
    const scheduledAt = new Date(scheduleDate);
    scheduledAt.setHours(hours, minutes, 0, 0);
    sendMutation.mutate(scheduledAt.toISOString());
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Editor panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Compose Notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Channel</Label>
              <Select value={channel} onValueChange={(v: any) => setChannel(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="in_app">In-App Only</SelectItem>
                  <SelectItem value="both">Email + In-App</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Notification subject..."
                className="h-9"
              />
            </div>

            {(channel === "email" || channel === "both") && (
              <div className="space-y-2">
                <Label className="text-sm">Email Body</Label>
                <EmailBlockEditor blocks={blocks} onChange={setBlocks} />
              </div>
            )}
          </CardContent>
        </Card>

        <RecipientPicker
          mode={recipientMode}
          onModeChange={setRecipientMode}
          selectedClientIds={selectedClientIds}
          onSelectedClientsChange={setSelectedClientIds}
          filter={recipientFilter}
          onFilterChange={setRecipientFilter}
          recipientCount={recipientCount}
        />

        <div className="flex gap-2">
          <Button onClick={handleSend} className="flex-1 gap-1.5" disabled={sendMutation.isPending}>
            <Send className="h-4 w-4" />
            Send Now
          </Button>
          <Button variant="outline" onClick={handleSchedule} className="gap-1.5">
            <CalendarIcon className="h-4 w-4" />
            Schedule
          </Button>
          <Button variant="outline" onClick={() => setShowSaveTemplate(true)} className="gap-1.5">
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Preview panel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Preview</Label>
          <div className="flex gap-1">
            <Button
              variant={previewMode === "desktop" ? "default" : "outline"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewMode("desktop")}
            >
              <Monitor className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={previewMode === "mobile" ? "default" : "outline"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewMode("mobile")}
            >
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <EmailPreview subject={subject} blocks={blocks} previewMode={previewMode} />
      </div>

      {/* Send confirmation dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Send</DialogTitle>
            <DialogDescription>
              You are about to send "{subject}" to {recipientCount} recipient{recipientCount !== 1 ? "s" : ""} via {channel === "both" ? "email and in-app" : channel}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button onClick={() => { setShowConfirm(false); sendMutation.mutate(undefined); }} disabled={sendMutation.isPending}>
              <Send className="h-4 w-4 mr-1.5" />
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Notification</DialogTitle>
            <DialogDescription>Choose when to send this notification.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Calendar
              mode="single"
              selected={scheduleDate}
              onSelect={setScheduleDate}
              disabled={(date) => date < new Date()}
              className="rounded-md border mx-auto"
            />
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="h-9 w-32"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSchedule(false)}>Cancel</Button>
            <Button onClick={confirmSchedule} disabled={sendMutation.isPending}>
              <CalendarIcon className="h-4 w-4 mr-1.5" />
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save template dialog */}
      <Dialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>Give your template a name so you can reuse it later.</DialogDescription>
          </DialogHeader>
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name..."
            className="h-9"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveTemplate(false)}>Cancel</Button>
            <Button onClick={() => saveTemplateMutation.mutate()} disabled={saveTemplateMutation.isPending}>
              <Save className="h-4 w-4 mr-1.5" />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
