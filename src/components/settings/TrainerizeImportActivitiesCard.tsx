import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

type ImportResult = {
  clientId: string;
  name: string;
  fetched: number;
  imported: number;
  skipped: number;
  error?: string;
};

export function TrainerizeImportActivitiesCard() {
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [totals, setTotals] = useState<{ fetched: number; imported: number; skipped: number } | null>(null);

  async function runImport(days: number) {
    setBusy(true);
    setResults(null);
    setTotals(null);
    try {
      const { data, error } = await supabase.functions.invoke("trainerize-import-activities", {
        body: { days },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Import failed");
      setResults(data.results ?? []);
      setTotals(data.totals ?? null);
      toast.success(
        `Imported ${data.totals?.imported ?? 0} activities from Trainerize`,
        { description: `${data.results?.length ?? 0} clients • last ${days} days` },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Import failed", { description: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Import Trainerize Activities
        </CardTitle>
        <CardDescription>
          Pull completed workouts and cardio from Trainerize into Apex360-IF. Imported activities show in each client's history alongside APEX sessions, tagged as "Trainerize". Re-runs are safe — duplicates are skipped.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => runImport(90)} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Sync last 90 days
          </Button>
          <Button onClick={() => runImport(7)} disabled={busy} variant="outline" className="gap-2">
            Sync last 7 days
          </Button>
          <Button onClick={() => runImport(365)} disabled={busy} variant="outline" className="gap-2">
            Full backfill (1 year)
          </Button>
        </div>

        {totals && (
          <div className="rounded-md border p-3 text-sm">
            <div className="font-semibold">
              Imported {totals.imported} • Fetched {totals.fetched} • Skipped {totals.skipped}
            </div>
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
                <div className="text-xs text-muted-foreground shrink-0 ml-3">
                  {r.imported} imported / {r.fetched} found
                </div>
              </div>
            ))}
          </div>
        )}

        {results && results.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No linked Trainerize clients found. Use "Sync Trainerize Clients" first to link accounts.
          </div>
        )}
      </CardContent>
    </Card>
  );
}