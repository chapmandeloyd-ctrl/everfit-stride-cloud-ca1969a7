import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, ArrowRight, Undo2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type HistoryRow = {
  id: string;
  created_at: string;
  protocol_name: string | null;
  previous_protocol_name: string | null;
  source: string;
  assigned_by: string | null;
};

export function ProtocolHistorySection({ clientId }: { clientId: string }) {
  const { data: rows, isLoading } = useQuery({
    queryKey: ["protocol-history", clientId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("protocol_assignment_history" as any) as any)
        .select("id, created_at, protocol_name, previous_protocol_name, source, assigned_by")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as HistoryRow[];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <History className="h-4 w-4 text-primary" />
          Protocol Assignment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !rows || rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No protocol assignments yet. Changes will be recorded here automatically.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const isUndo = r.source === "undo";
              return (
                <li
                  key={r.id}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/50 p-3"
                >
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      isUndo ? "bg-amber-500/15 text-amber-500" : "bg-primary/15 text-primary"
                    }`}
                  >
                    {isUndo ? <Undo2 className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-sm">
                      <span className="text-muted-foreground line-through decoration-muted-foreground/60">
                        {r.previous_protocol_name || "None"}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {r.protocol_name || "None"}
                      </span>
                      {isUndo && (
                        <Badge variant="outline" className="ml-1 h-5 border-amber-500/40 text-amber-500 text-[10px]">
                          Undo
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}