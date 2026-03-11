import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface EngineStatusMiniCardProps {
  clientId: string;
  engineMode: string;
}

export function EngineStatusMiniCard({ clientId, engineMode }: EngineStatusMiniCardProps) {
  const [score, setScore] = useState<any>(null);

  useEffect(() => {
    if (!clientId) return;
    supabase
      .from("engine_scores")
      .select("*")
      .eq("client_id", clientId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setScore(data));
  }, [clientId]);

  const statusColor = score?.status === "green"
    ? "text-emerald-500"
    : score?.status === "yellow"
      ? "text-amber-500"
      : score?.status === "red"
        ? "text-red-500"
        : "text-muted-foreground";

  const TrendIcon = score?.score > 70 ? TrendingUp : score?.score < 40 ? TrendingDown : Minus;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {engineMode} Engine
            </p>
          </div>
        </div>
        <TrendIcon className={cn("h-4 w-4", statusColor)} />
      </div>

      <div className="flex items-end gap-3">
        <span className={cn("text-4xl font-bold font-heading", statusColor)}>
          {score?.score ?? "—"}
        </span>
        <div className="pb-1">
          <p className="text-xs text-muted-foreground">
            {score?.streak_days ? `${score.streak_days} day streak` : "No data yet"}
          </p>
        </div>
      </div>

      {score?.recommendation && (
        <p className="text-xs text-muted-foreground border-t border-border pt-2">
          {score.recommendation}
        </p>
      )}
    </div>
  );
}
