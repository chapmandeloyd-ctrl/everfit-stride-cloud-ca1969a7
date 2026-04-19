import { useState } from "react";
import { Loader2, PencilLine, Save } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

const METRICS = [
  { key: "Weight", label: "Weight", unit: "lbs", step: "0.1" },
  { key: "Steps", label: "Steps", unit: "steps", step: "1" },
  { key: "Sleep", label: "Sleep", unit: "hrs", step: "0.1" },
  { key: "Caloric Intake", label: "Caloric Intake", unit: "cal", step: "1" },
  { key: "Caloric Burn", label: "Caloric Burn", unit: "cal", step: "1" },
] as const;

type ValuesState = Record<string, string>;

export function ManualTrackingSheet({ open, onOpenChange, clientId }: Props) {
  const [values, setValues] = useState<ValuesState>({});
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const reset = () => setValues({});

  const handleSave = async () => {
    const entries = METRICS
      .map((m) => ({ name: m.key, raw: values[m.key]?.trim() }))
      .filter((e) => e.raw && !isNaN(Number(e.raw)))
      .map((e) => ({ name: e.name, value: Number(e.raw) }));

    if (entries.length === 0) {
      toast.error("Enter at least one value");
      return;
    }

    setSubmitting(true);
    try {
      // Look up metric_definition ids
      const { data: metricDefs, error: defErr } = await supabase
        .from("metric_definitions")
        .select("id, name")
        .in("name", entries.map((e) => e.name));
      if (defErr) throw defErr;

      const defMap: Record<string, string> = {};
      (metricDefs ?? []).forEach((d: any) => { defMap[d.name] = d.id; });

      // Get trainer_id for this client (needed to create client_metrics row if missing)
      const { data: settings } = await supabase
        .from("client_feature_settings")
        .select("trainer_id")
        .eq("client_id", clientId)
        .limit(1);
      const trainerId = settings?.[0]?.trainer_id;

      const recordedAt = new Date().toISOString();
      let saved = 0;

      for (const entry of entries) {
        const metricDefId = defMap[entry.name];
        if (!metricDefId) continue;

        // Find or create client_metrics row
        const { data: existing } = await supabase
          .from("client_metrics")
          .select("id")
          .eq("client_id", clientId)
          .eq("metric_definition_id", metricDefId)
          .limit(1);

        let clientMetricId: string | undefined = existing?.[0]?.id;

        if (!clientMetricId) {
          if (!trainerId) {
            console.error("[ManualTracking] No trainer_id for client", clientId);
            continue;
          }
          const { data: created, error: createErr } = await supabase
            .from("client_metrics")
            .insert({
              client_id: clientId,
              metric_definition_id: metricDefId,
              trainer_id: trainerId,
              order_index: 0,
            })
            .select("id")
            .single();
          if (createErr) {
            console.error("[ManualTracking] create client_metrics error:", createErr);
            continue;
          }
          clientMetricId = created.id;
        }

        const { error: entryErr } = await supabase
          .from("metric_entries")
          .insert({
            client_id: clientId,
            client_metric_id: clientMetricId,
            value: entry.value,
            recorded_at: recordedAt,
          });

        if (entryErr) {
          console.error("[ManualTracking] insert metric_entry error:", entryErr);
        } else {
          saved++;
        }
      }

      if (saved > 0) {
        toast.success(`Saved ${saved} metric${saved === 1 ? "" : "s"}`);
        queryClient.invalidateQueries({ queryKey: ["health-activity-metrics"] });
        queryClient.invalidateQueries({ queryKey: ["activity-summary"] });
        reset();
        onOpenChange(false);
      } else {
        toast.error("Couldn't save metrics");
      }
    } catch (err: any) {
      console.error("[ManualTracking] error:", err);
      toast.error(err?.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <PencilLine className="h-5 w-5" />
            Manual Tracking
          </SheetTitle>
          <SheetDescription>
            Enter today's values for any metrics you'd like to log.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {METRICS.map((m) => (
            <div key={m.key} className="space-y-1.5">
              <Label htmlFor={`metric-${m.key}`}>{m.label}</Label>
              <div className="relative">
                <Input
                  id={`metric-${m.key}`}
                  type="number"
                  inputMode="decimal"
                  step={m.step}
                  placeholder="--"
                  value={values[m.key] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [m.key]: e.target.value }))
                  }
                  className="pr-16 h-11"
                  disabled={submitting}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {m.unit}
                </span>
              </div>
            </div>
          ))}

          <Button
            className="w-full h-12 text-base font-semibold"
            disabled={submitting}
            onClick={handleSave}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save entries
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
