import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy, Check, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

type Row = {
  id: string;
  protocol_name: string | null;
  keto_name: string | null;
  start_date: string;
  end_date: string;
  duration_days: number;
  completed_count: number;
  partial_count: number;
  missed_count: number;
  total_hours: number;
  target_hours: number;
  success_rate: number;
  created_at: string;
};

export default function ClientPlanHistory() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["plan-completions", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("plan_completions" as any) as any)
        .select("*")
        .eq("client_id", clientId)
        .order("end_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Plan History</h1>
            <p className="text-xs text-muted-foreground">Completed fasting programs</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-3 px-4 py-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !rows || rows.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card/40 p-8 text-center">
            <Trophy className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-semibold">No completed plans yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Finish an assigned fasting plan and its results will show up here.
            </p>
          </div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-border/60 bg-card/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-primary">
                    {r.duration_days}-day plan complete
                  </p>
                  <p className="text-sm font-bold truncate">
                    {r.protocol_name ?? "Fasting plan"}
                    {r.keto_name ? ` · ${r.keto_name}` : ""}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(r.start_date), "MMM d, yyyy")} –{" "}
                    {format(new Date(r.end_date), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold tabular-nums text-primary leading-none">
                    {r.success_rate}%
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
                    success
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <Stat icon={<Check className="h-3.5 w-3.5" />} label="Completed" value={r.completed_count} color="#22c55e" />
                <Stat icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Partial" value={r.partial_count} color="#f59e0b" />
                <Stat icon={<X className="h-3.5 w-3.5" />} label="Missed" value={r.missed_count} color="#ef4444" />
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Fasted <span className="font-semibold text-foreground tabular-nums">{Math.round(r.total_hours)}h</span> of{" "}
                  <span className="tabular-nums">{Math.round(r.target_hours)}h</span>
                </span>
                <span>Saved {format(new Date(r.created_at), "MMM d")}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div
      className="rounded-lg border p-2 flex items-center gap-2"
      style={{ borderColor: `${color}40`, background: `${color}10` }}
    >
      <span style={{ color }}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-bold tabular-nums leading-none" style={{ color }}>{value}</p>
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      </div>
    </div>
  );
}