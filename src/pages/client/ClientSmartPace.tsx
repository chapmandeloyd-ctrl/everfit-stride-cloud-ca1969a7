import { ClientLayout } from "@/components/ClientLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, TrendingDown, TrendingUp, AlertTriangle, Calendar, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSmartPace } from "@/hooks/useSmartPace";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { cn } from "@/lib/utils";
import { format, parseISO, subDays } from "date-fns";

export default function ClientSmartPace() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();
  const { data: pace, isLoading } = useSmartPace();

  const { data: log } = useQuery({
    queryKey: ["smart-pace-log", clientId, pace?.goal?.id],
    enabled: !!clientId && !!pace?.goal?.id,
    queryFn: async () => {
      const since = subDays(new Date(), 14).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("smart_pace_daily_log")
        .select("*")
        .eq("goal_id", pace!.goal!.id)
        .gte("log_date", since)
        .order("log_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="p-6 text-center text-muted-foreground">Loading pace data…</div>
      </ClientLayout>
    );
  }

  if (!pace?.enabled || !pace.goal) {
    return (
      <ClientLayout>
        <div className="p-6 space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Card className="p-8 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h2 className="font-heading font-bold text-lg mb-1">Smart Pace not active</h2>
            <p className="text-sm text-muted-foreground">
              Your coach hasn't enabled Smart Pace tracking yet.
            </p>
          </Card>
        </div>
      </ClientLayout>
    );
  }

  const { goal, todayTargetLbs, debtLbs, creditLbs, progressPct, status, projectedDate, baseLbs } = pace;

  const tone =
    status === "behind"
      ? "border-destructive/40 bg-destructive/5"
      : status === "ahead"
      ? "border-emerald-500/40 bg-emerald-500/5"
      : "border-primary/30 bg-primary/5";

  return (
    <ClientLayout>
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        {/* Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Smart Pace Tracker
          </p>
          <h1 className="font-heading font-bold text-2xl">
            {goal.goal_direction === "gain" ? "Gain" : "Lose"} to {goal.goal_weight} lb
          </h1>
          <p className="text-sm text-muted-foreground">
            Pace: {baseLbs.toFixed(1)} lb/day · Started {format(parseISO(goal.start_date), "MMM d")}
          </p>
        </div>

        {/* Hero today card */}
        <Card className={cn("border-2 p-5", tone)}>
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline" className="text-xs">Today's Target</Badge>
            <Badge
              className={cn(
                "text-xs",
                status === "behind" && "bg-destructive text-destructive-foreground",
                status === "ahead" && "bg-emerald-500 text-white",
                status === "on_pace" && "bg-primary text-primary-foreground"
              )}
            >
              {status === "behind" ? "Catch up" : status === "ahead" ? "Ahead" : "On pace"}
            </Badge>
          </div>
          <div className="flex items-end gap-2">
            <span className="font-heading font-bold text-5xl">{todayTargetLbs.toFixed(1)}</span>
            <span className="text-lg text-muted-foreground mb-1">lb</span>
          </div>
          {pace.cappedAt !== null && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              ⚠ Capped at safe max ({pace.cappedAt.toFixed(1)} lb). Coach will redistribute the rest.
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-2">{pace.reason}</p>
        </Card>

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={AlertTriangle}
            label="Debt"
            value={`${debtLbs.toFixed(1)} lb`}
            tone={debtLbs > 0 ? "warn" : "muted"}
            sub="To make up"
          />
          <StatCard
            icon={TrendingDown}
            label="Credit"
            value={`${creditLbs.toFixed(1)} lb`}
            tone={creditLbs > 0 ? "good" : "muted"}
            sub="In the bank"
          />
          <StatCard
            icon={Scale}
            label="Last weigh-in"
            value={goal.last_weigh_in_value ? `${goal.last_weigh_in_value} lb` : "—"}
            tone="muted"
            sub={goal.last_weigh_in_date ? format(parseISO(goal.last_weigh_in_date), "MMM d") : "Never"}
          />
          <StatCard
            icon={Calendar}
            label="Goal by"
            value={projectedDate ? format(projectedDate, "MMM d") : "—"}
            tone="muted"
            sub="At current pace"
          />
        </div>

        {/* Progress */}
        <Card className="p-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold">Overall progress</span>
            <span className="text-sm font-bold">{Math.round(progressPct)}%</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                status === "behind" ? "bg-destructive" : status === "ahead" ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{goal.start_weight ?? "—"} lb start</span>
            <span>{goal.goal_weight} lb goal</span>
          </div>
        </Card>

        {/* 14-day timeline */}
        <Card className="p-4">
          <h3 className="font-heading font-bold text-sm mb-3">Last 14 days</h3>
          {!log || log.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No weigh-ins recorded yet. Step on a connected scale to start tracking.
            </p>
          ) : (
            <div className="space-y-2">
              {log.map((entry) => (
                <DayRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </Card>

        {/* Scale-only notice */}
        <Card className="p-4 bg-muted/40 border-dashed">
          <div className="flex gap-3">
            <Scale className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Scale-only weigh-ins</p>
              <p className="text-xs text-muted-foreground mt-1">
                Smart Pace only counts weigh-ins from a connected scale (Apple Health, Bluetooth, or scale photo). 
                Manual entries don't count toward your streak. Your coach can override in special cases.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </ClientLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  sub: string;
  tone: "good" | "warn" | "muted";
}) {
  const color =
    tone === "good" ? "text-emerald-500" : tone === "warn" ? "text-destructive" : "text-foreground";
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("h-4 w-4", color)} />
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className={cn("font-heading font-bold text-xl", color)}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </Card>
  );
}

function DayRow({ entry }: { entry: any }) {
  const dotColor =
    entry.status === "ahead"
      ? "bg-emerald-500"
      : entry.status === "behind"
      ? "bg-destructive"
      : entry.status === "missed"
      ? "bg-muted-foreground"
      : entry.status === "forgiven"
      ? "bg-blue-400"
      : "bg-primary";

  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-border/30 last:border-0">
      <div className={cn("h-2 w-2 rounded-full", dotColor)} />
      <span className="text-xs font-medium w-16">
        {format(parseISO(entry.log_date), "MMM d")}
      </span>
      <div className="flex-1 text-xs text-muted-foreground">
        Target {entry.target_loss_lbs} lb · Actual {entry.actual_loss_lbs ?? "—"} lb
      </div>
      <Badge variant="outline" className="text-[10px] capitalize">
        {entry.status?.replace("_", " ")}
      </Badge>
    </div>
  );
}
