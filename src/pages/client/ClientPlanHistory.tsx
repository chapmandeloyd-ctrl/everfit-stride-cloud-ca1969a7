import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy, Check, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  const [selected, setSelected] = useState<Row | null>(null);

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
              role="button"
              tabIndex={0}
              onClick={() => setSelected(r)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(r);
                }
              }}
              className="rounded-2xl border border-border/60 bg-card/60 p-4 cursor-pointer transition hover:border-primary/60 hover:bg-card/80"
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
                <span className="text-primary font-semibold">View details →</span>
              </div>
            </div>
          ))
        )}
      </div>

      <PlanDetailsDialog
        row={selected}
        clientId={clientId}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

type FastLog = {
  started_at: string;
  ended_at: string;
  target_hours: number;
  actual_hours: number;
  completion_pct: number;
  status: string;
};

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function PlanDetailsDialog({
  row,
  clientId,
  onClose,
}: {
  row: Row | null;
  clientId: string | null | undefined;
  onClose: () => void;
}) {
  const open = !!row;

  const { data: logs, isLoading } = useQuery({
    queryKey: ["plan-completion-logs", row?.id],
    enabled: open && !!clientId && !!row,
    queryFn: async () => {
      const start = new Date(row!.start_date);
      const end = new Date(row!.end_date);
      end.setDate(end.getDate() + 1);
      const { data, error } = await supabase
        .from("fasting_log")
        .select("started_at,ended_at,target_hours,actual_hours,completion_pct,status")
        .eq("client_id", clientId!)
        .gte("ended_at", start.toISOString())
        .lt("ended_at", end.toISOString())
        .order("ended_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FastLog[];
    },
  });

  const days = useMemo(() => {
    if (!row) return [];
    const byDay = new Map<string, FastLog>();
    for (const l of logs || []) {
      const k = dateKey(new Date(l.ended_at));
      const prev = byDay.get(k);
      if (!prev || Number(l.completion_pct) > Number(prev.completion_pct)) {
        byDay.set(k, l);
      }
    }
    const start = new Date(row.start_date);
    const out: Array<{ date: Date; log: FastLog | null }> = [];
    for (let i = 0; i < row.duration_days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push({ date: d, log: byDay.get(dateKey(d)) ?? null });
    }
    return out;
  }, [logs, row]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {row?.duration_days}-day plan · day-by-day
          </DialogTitle>
          <DialogDescription>
            {row
              ? `${format(new Date(row.start_date), "MMM d")} – ${format(
                  new Date(row.end_date),
                  "MMM d, yyyy"
                )}${row.protocol_name ? ` · ${row.protocol_name}` : ""}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {days.map(({ date, log }, i) => {
              const pct = log ? Number(log.completion_pct) : 0;
              const state: "completed" | "partial" | "missed" = !log
                ? "missed"
                : pct >= 100
                ? "completed"
                : "partial";
              const color =
                state === "completed"
                  ? "#22c55e"
                  : state === "partial"
                  ? "#f59e0b"
                  : "#ef4444";
              const Icon =
                state === "completed" ? Check : state === "partial" ? AlertTriangle : X;
              return (
                <div
                  key={i}
                  className="rounded-xl border p-3 flex items-center gap-3"
                  style={{ borderColor: `${color}44`, background: `${color}10` }}
                >
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${color}22`, color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                        Day {i + 1}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(date, "EEE, MMM d")}
                      </p>
                    </div>
                    <p className="text-sm font-bold capitalize" style={{ color }}>
                      {state}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {log
                        ? `${Number(log.actual_hours).toFixed(1)}h of ${Number(
                            log.target_hours
                          ).toFixed(1)}h · ${Math.round(pct)}%`
                        : "No fast logged"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {row && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
            <Stat icon={<Check className="h-3.5 w-3.5" />} label="Completed" value={row.completed_count} color="#22c55e" />
            <Stat icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Partial" value={row.partial_count} color="#f59e0b" />
            <Stat icon={<X className="h-3.5 w-3.5" />} label="Missed" value={row.missed_count} color="#ef4444" />
          </div>
        )}
      </DialogContent>
    </Dialog>
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