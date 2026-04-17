import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, AlertTriangle, Target, ChevronRight } from "lucide-react";
import { useSmartPace } from "@/hooks/useSmartPace";
import { cn } from "@/lib/utils";

/**
 * Dashboard banner — replaces the old GoalCard when smart_pace_enabled = true.
 * Severity-driven visuals.
 */
export function SmartPaceBanner() {
  const { data } = useSmartPace();
  const navigate = useNavigate();

  if (!data?.enabled || !data.goal) return null;

  const { todayTargetLbs, debtLbs, creditLbs, status, progressPct, reason, projectedDate, cappedAt } =
    data;

  const tone =
    status === "behind"
      ? {
          bg: "bg-destructive/10 border-destructive/30",
          icon: AlertTriangle,
          iconColor: "text-destructive",
          badge: "bg-destructive text-destructive-foreground",
          progress: "bg-destructive",
        }
      : status === "ahead"
      ? {
          bg: "bg-sky-500/10 border-sky-500/30",
          icon: TrendingUp,
          iconColor: "text-sky-500",
          badge: "bg-sky-500 text-white",
          progress: "bg-sky-500",
        }
      : {
          bg: "bg-emerald-500/10 border-emerald-500/30",
          icon: Target,
          iconColor: "text-emerald-500",
          badge: "bg-emerald-500 text-white",
          progress: "bg-emerald-500",
        };

  const Icon = tone.icon;
  const headline =
    status === "behind"
      ? "Catch-up day"
      : status === "ahead"
      ? "Ahead of pace"
      : "Today's target";

  return (
    <Card
      className={cn(
        "border-2 p-4 cursor-pointer hover:shadow-md transition-all",
        tone.bg
      )}
      onClick={() => navigate("/client/pace")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn("rounded-full p-2 bg-background/50", tone.iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Smart Pace
              </span>
              <Badge className={cn("text-[10px] uppercase", tone.badge)}>{headline}</Badge>
            </div>
            <h3 className="font-heading font-bold text-2xl mt-1">
              {todayTargetLbs.toFixed(1)} <span className="text-base font-medium text-muted-foreground">lb today</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{reason}</p>
            {cappedAt !== null && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                Capped at {cappedAt.toFixed(1)} lb (max safe pace)
              </p>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] text-muted-foreground">Goal progress</span>
          <span className="text-[11px] font-semibold">{Math.round(progressPct)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full transition-all", tone.progress)}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Mini stats row */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/50">
        <Stat label="Debt" value={`${debtLbs.toFixed(1)}`} unit="lb" tone={debtLbs > 0 ? "warn" : "muted"} />
        <Stat label="Credit" value={`${creditLbs.toFixed(1)}`} unit="lb" tone={creditLbs > 0 ? "good" : "muted"} />
        <Stat
          label="Goal by"
          value={projectedDate ? projectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
          unit=""
          tone="muted"
        />
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone: "good" | "warn" | "muted";
}) {
  const color =
    tone === "good" ? "text-emerald-500" : tone === "warn" ? "text-destructive" : "text-foreground";
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("font-heading font-bold text-sm mt-0.5", color)}>
        {value}
        {unit && <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}
