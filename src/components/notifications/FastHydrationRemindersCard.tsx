import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Droplets } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Settings = {
  fast_hydration_reminder_enabled: boolean;
  fast_hydration_interval_hours: number;
  fast_hydration_window_start: string;
  fast_hydration_window_end: string;
  fast_hydration_min_hours: number;
};

const DEFAULTS: Settings = {
  fast_hydration_reminder_enabled: true,
  fast_hydration_interval_hours: 3,
  fast_hydration_window_start: "08:00",
  fast_hydration_window_end: "20:00",
  fast_hydration_min_hours: 24,
};

const hhmm = (v: string | null | undefined, fallback: string) =>
  v ? v.slice(0, 5) : fallback;

export function FastHydrationRemindersCard() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return setLoading(false);
      const { data } = await supabase
        .from("client_feature_settings")
        .select(
          "fast_hydration_reminder_enabled, fast_hydration_interval_hours, fast_hydration_window_start, fast_hydration_window_end, fast_hydration_min_hours",
        )
        .eq("client_id", uid)
        .maybeSingle();
      if (data) {
        setSettings({
          fast_hydration_reminder_enabled: data.fast_hydration_reminder_enabled ?? true,
          fast_hydration_interval_hours: data.fast_hydration_interval_hours ?? 3,
          fast_hydration_window_start: hhmm(data.fast_hydration_window_start, "08:00"),
          fast_hydration_window_end: hhmm(data.fast_hydration_window_end, "20:00"),
          fast_hydration_min_hours: data.fast_hydration_min_hours ?? 24,
        });
      }
      setLoading(false);
    })();
  }, []);

  const save = async (next: Settings) => {
    setSettings(next);
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return setSaving(false);
    const { error } = await supabase
      .from("client_feature_settings")
      .update({
        fast_hydration_reminder_enabled: next.fast_hydration_reminder_enabled,
        fast_hydration_interval_hours: next.fast_hydration_interval_hours,
        fast_hydration_window_start: `${next.fast_hydration_window_start}:00`,
        fast_hydration_window_end: `${next.fast_hydration_window_end}:00`,
        fast_hydration_min_hours: next.fast_hydration_min_hours,
      })
      .eq("client_id", uid);
    setSaving(false);
    if (error) toast.error("Couldn't save hydration settings");
  };

  const sendTest = async () => {
    setTesting(true);
    const { error } = await supabase.functions.invoke("dispatch-fast-hydration-reminders", {
      body: { test: true },
    });
    setTesting(false);
    if (error) toast.error("Test reminder failed");
    else toast.success("Test reminder sent");
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Droplets className="h-4 w-4 text-primary" />
          Long-fast hydration reminders
        </CardTitle>
        <CardDescription>
          Water and electrolyte nudges during extended fasts only — short daily fasts stay quiet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="fast-hydration-toggle">Enabled</Label>
          <Switch
            id="fast-hydration-toggle"
            checked={settings.fast_hydration_reminder_enabled}
            onCheckedChange={(v) => save({ ...settings, fast_hydration_reminder_enabled: v })}
          />
        </div>

        {settings.fast_hydration_reminder_enabled && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Only for fasts of at least</Label>
                <Input
                  type="number"
                  min={12}
                  max={120}
                  value={settings.fast_hydration_min_hours}
                  onChange={(e) =>
                    save({ ...settings, fast_hydration_min_hours: Number(e.target.value) || 24 })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Every (hours)</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={settings.fast_hydration_interval_hours}
                  onChange={(e) =>
                    save({ ...settings, fast_hydration_interval_hours: Number(e.target.value) || 3 })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="time"
                  value={settings.fast_hydration_window_start}
                  onChange={(e) => save({ ...settings, fast_hydration_window_start: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Until</Label>
                <Input
                  type="time"
                  value={settings.fast_hydration_window_end}
                  onChange={(e) => save({ ...settings, fast_hydration_window_end: e.target.value })}
                />
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={sendTest} disabled={testing || saving}>
              {testing ? "Sending…" : "Send test reminder"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
