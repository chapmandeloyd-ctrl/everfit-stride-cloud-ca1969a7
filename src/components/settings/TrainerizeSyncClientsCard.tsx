import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Users, CheckCircle2, AlertCircle, UserPlus, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

interface NewClient {
  trainerize_user_id: number;
  name: string;
  email: string | null;
}
interface SyncResult {
  ok: boolean;
  totalTrainerize?: number;
  linked?: number;
  alreadySynced?: number;
  newCount?: number;
  newClients?: NewClient[];
  error?: string;
}

export function TrainerizeSyncClientsCard() {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const runSync = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("trainerize-sync-clients", { body: {} });
      if (error) {
        const details = error instanceof FunctionsHttpError
          ? await error.context.text()
          : error.message;
        setResult({ ok: false, error: details });
      } else {
        setResult(data as SyncResult);
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
      setOpen(true);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Sync Clients from Trainerize
          </CardTitle>
          <CardDescription>
            Matches your Trainerize roster to APEX360-IF clients by email and links them.
            New Trainerize clients are listed so you can invite them manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runSync} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing…</> : "Sync Now"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {result?.ok ? (
                <><CheckCircle2 className="w-5 h-5 text-green-500" /> Sync complete</>
              ) : (
                <><AlertCircle className="w-5 h-5 text-destructive" /> Sync failed</>
              )}
            </DialogTitle>
            {result?.ok && (
              <DialogDescription>
                Pulled {result.totalTrainerize} Trainerize clients.
              </DialogDescription>
            )}
          </DialogHeader>

          {result?.ok ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-2xl font-bold text-green-500 flex items-center justify-center gap-1">
                    <Link2 className="w-5 h-5" />{result.linked ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Newly linked</div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-2xl font-bold">{result.alreadySynced ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">Already synced</div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                    <UserPlus className="w-5 h-5" />{result.newCount ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Not in APEX yet</div>
                </div>
              </div>

              {result.newClients && result.newClients.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Trainerize clients not in APEX360-IF</h4>
                  <div className="border rounded-md divide-y max-h-80 overflow-auto">
                    {result.newClients.map((c) => (
                      <div key={c.trainerize_user_id} className="p-3 flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.email ?? "No email on file"}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">TZ #{c.trainerize_user_id}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Invite these clients via your normal client invite flow. Once they sign up with the same email, run Sync Now again to link them automatically.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-96 whitespace-pre-wrap">
              {result?.error}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}