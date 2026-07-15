import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HeartPulse, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Result = {
  clientId: string;
  name: string;
  nutritionImported: number;
  weightImported: number;
  weightSkippedApex: number;
  bodyFatImported: number;
  error?: string;
};

export function TrainerizeImportHealthStatsCard() {
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [totals, setTotals] = useState<{ nutrition: number; weight: number; weightSkippedApex: number; bodyFat: number } | null>(null);

  async function run(days: number) {
    setBusy(true);
    setResults(null);
    setTotals(null);
    try {
      const { data, error } = await supabase.functions.invoke("trainerize-import-health-stats", {
        body: { days },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Import failed");
      setResults(data.results ?? []);
      setTotals(data.totals ?? null);
      const t = data.totals;
      toast.success("Trainerize health stats imported", {
        description: `${t?.nutrition ?? 0} meals • ${t?.weight ?? 0} weigh-ins • ${t?.bodyFat ?? 0} body fat`,
      });
    } catch (e) {
      toast.error("Import failed", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5" />
          Import Trainerize Nutrition & Body Stats
        </CardTitle>
        <CardDescription>
          Pulls caloric intake (per meal) and body weight / body fat from Trainerize. APEX weigh-ins remain the source of truth — any date with a manual APEX weigh-in is skipped.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run(90)} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartPulse className="h-4 w-4" />}
            Sync last 90 days
          </Button>
          <Button onClick={() => run(7)} disabled={busy} variant="outline">
            Sync last 7 days
          </Button>
          <Button onClick={() => run(365)} disabled={busy} variant="outline">
            Full backfill (1 year)
          </Button>
        </div>

        {totals && (
          <div className="rounded-md border p-3 text-sm space-y-1">
            <div className="font-semibold">Import summary</div>
            <div>Meals imported: {totals.nutrition}</div>
            <div>Weight entries imported: {totals.weight} (skipped {totals.weightSkippedApex} where APEX already logged)</div>
            <div>Body fat entries imported: {totals.bodyFat}</div>
          </div>
        )}

        {results && results.length > 0 && (
          <div className="max-h-72 overflow-y-auto rounded-md border divide-y text-sm">
            {results.map((r) => (
              <div key={r.clientId} className="flex items-center justify-between p-2">
                <div className="truncate">
                  <div className="font-medium truncate">{r.name}</div>
                  {r.error && <div className="text-destructive text-xs">{r.error}</div>}
                </div>
                <div className="text-xs text-muted-foreground shrink-0 ml-3 text-right">
                  <div>{r.nutritionImported} meals</div>
                  <div>{r.weightImported} wt • {r.bodyFatImported} bf</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {results && results.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No linked Trainerize clients. Link them under "Sync Trainerize Clients" first.
          </div>
        )}
      </CardContent>
    </Card>
  );
}