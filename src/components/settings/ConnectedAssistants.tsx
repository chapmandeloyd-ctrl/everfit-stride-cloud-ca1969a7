import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plug, Loader2, Trash2, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ConnectedClient = {
  consent_id: string;
  client_id: string;
  client_name: string;
  client_uri: string | null;
  logo_uri: string | null;
  scopes: string | null;
  granted_at: string;
  last_active_at: string | null;
};

function formatLastActive(iso: string | null): string {
  if (!iso) return "Never used";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Active now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

async function callManage(action: "list" | "revoke", extra?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("manage-mcp-connections", {
    body: { action, ...(extra ?? {}) },
  });
  if (error) throw error;
  return data;
}

export function ConnectedAssistants() {
  const qc = useQueryClient();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["mcp-connected-assistants"],
    queryFn: async () => (await callManage("list")) as { items: ConnectedClient[] },
  });

  const revoke = useMutation({
    mutationFn: async (client_id: string) => callManage("revoke", { client_id }),
    onMutate: (id) => setRevokingId(id),
    onSuccess: () => {
      toast.success("Access revoked", {
        description: "Any active token will fail within ~1 hour.",
      });
      qc.invalidateQueries({ queryKey: ["mcp-connected-assistants"] });
    },
    onError: (e: any) => toast.error(e?.message || "Revoke failed"),
    onSettled: () => setRevokingId(null),
  });

  const items = data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-5 w-5" />
          Connected Assistants
          <Badge variant="outline" className="text-[10px]">MCP</Badge>
        </CardTitle>
        <CardDescription>
          AI clients (ChatGPT, Claude, Cursor, etc.) that you've connected to your Apex360-IF account.
          Revoking a client immediately blocks new tokens; any active token expires within ~1 hour.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Couldn't load connections: {(error as Error).message}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No assistants connected. Connect one from ChatGPT / Claude by adding the MCP server URL{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              {import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp
            </code>.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((c) => (
              <li
                key={c.consent_id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20"
              >
                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {c.logo_uri ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logo_uri} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Plug className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{c.client_name}</p>
                    {c.client_uri && (
                      <a
                        href={c.client_uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Open client site"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Connected {new Date(c.granted_at).toLocaleDateString()} · Last active {formatLastActive(c.last_active_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={revokingId === c.client_id}
                  onClick={() => revoke.mutate(c.client_id)}
                >
                  {revokingId === c.client_id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Revoke
                    </>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}