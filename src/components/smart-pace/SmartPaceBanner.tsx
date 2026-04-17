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
          gradient:
            "bg-[linear-gradient(135deg,hsl(0_0%_18%)_0%,hsl(0_0%_12%)_45%,hsl(0_60%_22%)_100%)]",
          border: "border-destructive/40",
          glow: "shadow-[0_8px_32px_-8px_hsl(var(--destructive)/0.5)]",
          icon: AlertTriangle,
          iconColor: "text-destructive",
          badge: "bg-destructive text-destructive-foreground",
          progress: "bg-gradient-to-r from-destructive via-red-400 to-destructive",
          accent: "from-destructive/40",
        }
      : status === "ahead"
      ? {
          gradient:
            "bg-[linear-gradient(135deg,hsl(215_25%_20%)_0%,hsl(215_30%_14%)_45%,hsl(200_70%_28%)_100%)]",
          border: "border-sky-500/40",
          glow: "shadow-[0_8px_32px_-8px_hsl(200_85%_50%/0.5)]",
          icon: TrendingUp,
          iconColor: "text-sky-300",
          badge: "bg-sky-500 text-white",
          progress: "bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500",
          accent: "from-sky-400/40",
        }
      : {
          gradient:
            "bg-[linear-gradient(135deg,hsl(150_15%_18%)_0%,hsl(150_20%_12%)_45%,hsl(150_55%_22%)_100%)]",
          border: "border-emerald-500/40",
          glow: "shadow-[0_8px_32px_-8px_hsl(150_75%_45%/0.5)]",
          icon: Target,
          iconColor: "text-emerald-300",
          badge: "bg-emerald-500 text-white",
          progress: "bg-gradient-to-r from-emerald-500 via-green-300 to-emerald-500",
          accent: "from-emerald-400/40",
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
        "relative overflow-hidden border p-4 cursor-pointer transition-all hover:scale-[1.01] text-white",
        tone.gradient,
        tone.border,
        tone.glow
      )}
      onClick={() => navigate("/client/pace")}
    >
      {/* Granite noise texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
      {/* Diagonal sheen */}
      <div
        className={cn(
          "pointer-events-none absolute -top-1/2 -left-1/4 h-[200%] w-1/2 rotate-12 bg-gradient-to-b to-transparent blur-2xl opacity-60",
          tone.accent
        )}
      />
      {/* Bottom-right radial glow */}
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-white/5 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn("rounded-full p-2 bg-black/30 backdrop-blur-sm ring-1 ring-white/10", tone.iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wide text-white/60">
                Smart Pace
              </span>
              <Badge className={cn("text-[10px] uppercase shadow-md", tone.badge)}>{headline}</Badge>
            </div>
            <h3 className="font-heading font-bold text-2xl mt-1 drop-shadow-sm">
              {todayTargetLbs.toFixed(1)} <span className="text-base font-medium text-white/60">lb today</span>
            </h3>
            <p className="text-xs text-white/70 mt-0.5">{reason}</p>
            {cappedAt !== null && (
              <p className="text-[11px] text-amber-300 mt-1">
                Capped at {cappedAt.toFixed(1)} lb (max safe pace)
              </p>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-white/50 shrink-0" />
      </div>

      {/* Progress bar */}
      <div className="relative mt-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] text-white/60">Goal progress</span>
          <span className="text-[11px] font-semibold text-white">{Math.round(progressPct)}%</span>
        </div>
        <div className="h-2 rounded-full bg-black/40 overflow-hidden ring-1 ring-white/10 shadow-inner">
          <div
            className={cn("h-full transition-all shadow-[0_0_12px_rgba(255,255,255,0.4)]", tone.progress)}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Mini stats row */}
      <div className="relative grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
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
    tone === "good" ? "text-white" : tone === "warn" ? "text-white" : "text-white";
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wide text-white/50">{label}</p>
      <p className={cn("font-heading font-bold text-sm mt-0.5 drop-shadow", color)}>
        {value}
        {unit && <span className="text-[10px] font-normal text-white/50 ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}
