import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Globe, Info, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Curated list — extend anytime. "System default" leaves the field null.
const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu", "America/Toronto",
  "America/Mexico_City", "America/Sao_Paulo", "Europe/London", "Europe/Berlin",
  "Europe/Paris", "Europe/Madrid", "Europe/Rome", "Europe/Athens", "Africa/Cairo",
  "Africa/Johannesburg", "Asia/Dubai", "Asia/Kolkata", "Asia/Bangkok",
  "Asia/Singapore", "Asia/Hong_Kong", "Asia/Tokyo", "Asia/Seoul",
  "Australia/Sydney", "Australia/Perth", "Pacific/Auckland",
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const fmtHour = (h: number) => {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", hour12: true });
};

interface Props {
  clientId: string;
}

export function ScheduleAlignmentPanel({ clientId }: Props) {
  const qc = useQueryClient();
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { data, isLoading } = useQuery({
    queryKey: ["schedule-alignment", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("schedule_timezone, day_start_hour, enforce_scheduled_start" as any)
        .eq("client_id", clientId)
        .maybeSingle();
      return data;
    },
  });

  const [tz, setTz] = useState<string>("");
  const [dayStart, setDayStart] = useState<number>(0);
  const [enforce, setEnforce] = useState<boolean>(false);

  useEffect(() => {
    if (data) {
      setTz((data as any).schedule_timezone ?? "");
      setDayStart(Number((data as any).day_start_hour ?? 0));
      setEnforce(Boolean((data as any).enforce_scheduled_start ?? false));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase
        .from("client_feature_settings")
        .select("id")
        .eq("client_id", clientId)
        .maybeSingle();
      const payload = {
        schedule_timezone: tz || null,
        day_start_hour: dayStart,
        enforce_scheduled_start: enforce,
      };
      if (existing?.id) {
        const { error } = await supabase
          .from("client_feature_settings")
          .update(payload as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_feature_settings")
          .insert([{ client_id: clientId, ...payload }] as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule-alignment", clientId] });
      qc.invalidateQueries({ queryKey: ["ccp-settings"] });
      qc.invalidateQueries({ queryKey: ["ccp-enforce"] });
      toast.success("Schedule alignment saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  const effectiveTz = tz || browserTz;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Schedule Alignment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Timezone</Label>
          <Select value={tz || "__system"} onValueChange={(v) => setTz(v === "__system" ? "" : v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="__system">System default ({browserTz})</SelectItem>
              {TIMEZONES.map((z) => (
                <SelectItem key={z} value={z}>{z.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Controls which date the schedule uses. Currently: <Badge variant="outline" className="ml-1">{effectiveTz}</Badge>
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Start of day
          </Label>
          <Select value={String(dayStart)} onValueChange={(v) => setDayStart(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {HOURS.map((h) => (
                <SelectItem key={h} value={String(h)}>{fmtHour(h)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/20 p-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-snug">
              A meal or fast happening before this hour still counts as the previous day.
              Example: night-shift clients often set this to 4:00 AM so a 2 AM meal logs to
              yesterday's macros.
            </p>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={() => save.mutate()}
          disabled={save.isPending || isLoading}
        >
          {save.isPending ? "Saving…" : "Save alignment"}
        </Button>

        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Label className="text-xs flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" />
                Enforce scheduled start
              </Label>
              <p className="text-[11px] text-muted-foreground leading-snug mt-1">
                Locks the client's <strong>Start Fast</strong> button until 30 min
                before their scheduled fast start (when today's eating window closes).
                Late starts &gt; 60 min are flagged.
              </p>
            </div>
            <Switch
              checked={enforce}
              onCheckedChange={setEnforce}
              aria-label="Enforce scheduled start"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}