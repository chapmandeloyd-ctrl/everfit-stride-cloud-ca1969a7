import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ClientHealth() {
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: weightMetricId } = useQuery({
    queryKey: ["weight-client-metric-id", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data: defs } = await supabase
        .from("metric_definitions")
        .select("id")
        .eq("name", "Weight")
        .limit(1);
      const defId = defs?.[0]?.id;
      if (!defId) return null;
      const { data: cm } = await supabase
        .from("client_metrics")
        .select("id")
        .eq("client_id", clientId)
        .eq("metric_definition_id", defId)
        .limit(1);
      return { defId, clientMetricId: cm?.[0]?.id ?? null };
    },
    enabled: !!clientId,
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["weight-entries", weightMetricId?.clientMetricId],
    queryFn: async () => {
      if (!weightMetricId?.clientMetricId) return [];
      const { data } = await supabase
        .from("metric_entries")
        .select("id, value, recorded_at")
        .eq("client_metric_id", weightMetricId.clientMetricId)
        .order("recorded_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
    enabled: !!weightMetricId?.clientMetricId,
  });

  const latest = entries[0];
  const previous = entries[1];
  const delta = latest && previous ? latest.value - previous.value : null;

  const handleSave = async () => {
    const num = Number(value);
    if (!value.trim() || isNaN(num) || num <= 0) {
      toast.error("Enter a valid weight");
      return;
    }
    if (!clientId) return;

    setSaving(true);
    try {
      let defId = weightMetricId?.defId;
      let clientMetricId = weightMetricId?.clientMetricId;

      if (!defId) {
        const { data: defs } = await supabase
          .from("metric_definitions")
          .select("id")
          .eq("name", "Weight")
          .limit(1);
        defId = defs?.[0]?.id;
      }
      if (!defId) throw new Error("Weight metric not configured");

      if (!clientMetricId) {
        const { data: settings } = await supabase
          .from("client_feature_settings")
          .select("trainer_id")
          .eq("client_id", clientId)
          .limit(1);
        const trainerId = settings?.[0]?.trainer_id;
        if (!trainerId) throw new Error("No trainer assigned");

        const { data: created, error: createErr } = await supabase
          .from("client_metrics")
          .insert({
            client_id: clientId,
            metric_definition_id: defId,
            trainer_id: trainerId,
            order_index: 0,
          })
          .select("id")
          .single();
        if (createErr) throw createErr;
        clientMetricId = created.id;
      }

      const { error } = await supabase.from("metric_entries").insert({
        client_id: clientId,
        client_metric_id: clientMetricId,
        value: num,
        recorded_at: new Date().toISOString(),
      });
      if (error) throw error;

      toast.success("Weight logged");
      setValue("");
      queryClient.invalidateQueries({ queryKey: ["weight-entries"] });
      queryClient.invalidateQueries({ queryKey: ["weight-client-metric-id"] });
      queryClient.invalidateQueries({ queryKey: ["latest-weight-minimal"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ClientLayout>
      <div className="p-4 space-y-6 pb-24 max-w-xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weight Tracker</h1>
          <p className="text-muted-foreground">Log and track your weight over time</p>
        </div>

        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="h-5 w-5 text-primary" />
              Current Weight
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold">
                {latest ? `${latest.value}` : "--"}
              </span>
              <span className="text-muted-foreground">lbs</span>
              {delta !== null && (
                <span
                  className={`text-sm font-medium ml-auto ${
                    delta < 0 ? "text-green-600" : delta > 0 ? "text-orange-600" : "text-muted-foreground"
                  }`}
                >
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(1)} lbs
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight-input">Log new weight</Label>
              <div className="flex gap-2">
                <Input
                  id="weight-input"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="e.g. 165.4"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={saving}
                />
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No entries yet. Log your first weigh-in above.
              </p>
            ) : (
              <ul className="divide-y">
                {entries.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between py-3 text-sm">
                    <span className="text-muted-foreground">
                      {format(new Date(entry.recorded_at), "MMM d, yyyy")}
                    </span>
                    <span className="font-semibold">{entry.value} lbs</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
