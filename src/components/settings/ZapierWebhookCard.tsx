import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, ExternalLink, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

/**
 * Trainer-level Zapier webhook URL.
 * Fires for ALL fasting events across ALL clients of this trainer:
 * fast_started, milestones (12/16/18/20/24/36/48/72h), pre_end_1h,
 * fast_completed, fast_broken.
 */
export function ZapierWebhookCard() {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [initial, setInitial] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("zapier_webhook_url")
        .eq("id", user.id)
        .maybeSingle();
      const v = (data as any)?.zapier_webhook_url ?? "";
      setUrl(v);
      setInitial(v);
      setLoading(false);
    })();
  }, [user?.id]);

  const isValid = url === "" || /^https?:\/\/(hooks\.zapier\.com|hook\.eu\d?\.make\.com|.+)/.test(url);
  const dirty = url.trim() !== initial.trim();

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ zapier_webhook_url: url.trim() || null } as any)
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setInitial(url.trim());
    toast({ title: "Webhook saved", description: url ? "Fasting events will now fire to your Zap." : "Webhook removed." });
  };

  const handleTest = async () => {
    if (!user?.id) return;
    if (!url.trim()) {
      toast({ title: "Enter a webhook URL first", variant: "destructive" });
      return;
    }
    if (dirty) {
      toast({ title: "Save your changes first", description: "Click Save, then send the test." });
      return;
    }
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("fire-zapier-webhook", {
        body: {
          client_id: user.id,        // use trainer's own id; fn looks up client_feature_settings
          event_type: "test",
        },
      });
      if (error) throw error;
      const res = data as any;
      if (res?.skipped === "no trainer") {
        // Trainer doesn't have themselves as a client — fall back to a direct fetch
        const r = await fetch(url.trim(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          mode: "no-cors",
          body: JSON.stringify({
            event: "test",
            fired_at: new Date().toISOString(),
            client: { name: "KSOM-360 Test" },
            suggested_message: "Test event — your Zapier webhook is wired up correctly.",
          }),
        });
        toast({ title: "Test sent", description: "Check your Zap's task history to confirm." });
      } else {
        toast({ title: "Test sent", description: "Check your Zap's task history to confirm." });
      }
    } catch (e: any) {
      toast({ title: "Test failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Zapier Webhook (Fasting Events)
        </CardTitle>
        <CardDescription>
          Paste a Zapier "Catch Hook" URL to receive every fasting event across all your clients —
          fast started, milestones (12h–72h), 1 hour before end, fast completed, and fast broken early.
          Use this to trigger Trainerize push notifications, Slack messages, SMS, email, anything Zapier supports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="zap-url">Webhook URL</Label>
          <Input
            id="zap-url"
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
          {!isValid && url && (
            <p className="text-xs text-destructive">That doesn't look like a valid URL.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={!dirty || !isValid || saving || loading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing || !url || dirty || loading}>
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send test event
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href="https://zapier.com/apps/webhook/integrations" target="_blank" rel="noopener noreferrer">
              How to make a Zap <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </div>

        <details className="rounded-lg border bg-muted/30 p-3 text-sm">
          <summary className="cursor-pointer font-medium">What's in the payload?</summary>
          <pre className="mt-2 overflow-x-auto text-xs">
{`{
  "event": "milestone_24",         // or fast_started, pre_end_1h, milestone_12..72, fast_completed, fast_broken
  "fired_at": "2026-04-26T03:42Z",
  "client": { "id", "name", "email" },
  "fast":   { "start_at", "target_hours", "actual_hours", "last_ended_at" },
  "suggested_message": "...",      // pre-written push copy ready to paste
  "links":  { "client_view", "ksom_dashboard" }
}`}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}