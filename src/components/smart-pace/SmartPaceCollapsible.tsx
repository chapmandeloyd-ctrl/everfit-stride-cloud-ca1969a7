import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  AlertTriangle,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useSmartPace } from "@/hooks/useSmartPace";
import { cn } from "@/lib/utils";
import { SmartPaceBanner } from "./SmartPaceBanner";

/**
 * Collapsible wrapper for the Smart Pace tracker.
 * Front of card = at-a-glance: today's target, status, weight start→goal, progress %.
 * Tap to expand to the full banner (Journal + My Why live inside).
 */
export function SmartPaceCollapsible() {
  const { data } = useSmartPace();
  const [open, setOpen] = useState(false);

  if (!data?.enabled || !data.goal) return null;

  const { goal, todayTargetLbs, status, progressPct, debtLbs, creditLbs } = data;

  const tone =
    status === "behind" || status === "missed"
      ? {
          gradient:
            "bg-[linear-gradient(135deg,hsl(0_0%_18%)_0%,hsl(0_0%_12%)_45%,hsl(0_60%_22%)_100%)]",
          border: "border-destructive/40",
          glow: "shadow-[0_8px_32px_-8px_hsl(var(--destructive)/0.5)]",
          icon: AlertTriangle,
          iconColor: "text-destructive",
          badge: "bg-destructive text-destructive-foreground",
          progress: "bg-gradient-to-r from-destructive via-red-400 to-destructive",
          dot: "bg-destructive shadow-[0_0_10px_hsl(var(--destructive))]",
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
          dot: "bg-sky-400 shadow-[0_0_10px_hsl(200_85%_60%)]",
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
          dot: "bg-emerald-400 shadow-[0_0_10px_hsl(150_75%_55%)]",
        };

  const Icon = tone.icon;
  const headline =
    status === "missed"
      ? "Catch-up needed"
      : status === "behind"
      ? "Catch-up day"
      : status === "ahead"
      ? "Ahead of pace"
      : "On pace";

  const startWeight = goal.start_weight;
  const goalWeight = goal.goal_weight;

  if (open) {
    return (
      <div className="space-y-2">
        <SmartPaceBanner allowRender />
        <button
          onClick={() => setOpen(false)}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-muted/40 hover:bg-muted/60 ring-1 ring-border py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition"
        >
          <ChevronUp className="h-3.5 w-3.5" />
          Hide details
        </button>
      </div>
    );
  }

  return (
    <Card
      onClick={() => setOpen(true)}
      className={cn(
        "relative overflow-hidden border p-4 text-white cursor-pointer transition-all hover:scale-[1.005] active:scale-[0.99]",
        tone.gradient,
        tone.border,
        tone.glow
      )}
    >
      {/* Granite noise texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* Status mood-ring dot */}
      <div className="absolute top-3 right-10 flex items-center gap-1.5 z-10">
        <span className="relative flex h-2.5 w-2.5">
          <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", tone.dot)} />
          <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", tone.dot)} />
        </span>
      </div>

      {/* Expand chevron */}
      <div className="absolute top-3 right-3 z-10 text-white/70">
        <ChevronDown className="h-4 w-4" />
      </div>

      <div className="relative flex items-start gap-3">
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
            {todayTargetLbs.toFixed(1)}{" "}
            <span className="text-base font-medium text-white/60">lb today</span>
          </h3>
        </div>
      </div>

      {/* Start → Goal weight strip */}
      <div className="relative mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-black/30 ring-1 ring-white/10 p-2.5">
        <div className="text-left">
          <p className="text-[10px] uppercase tracking-wide text-white/50">Start</p>
          <p className="font-heading font-bold text-base text-white leading-tight">
            {startWeight !== null ? `${startWeight.toFixed(1)} lb` : "—"}
          </p>
        </div>
        <div className="h-px w-5 bg-white/20" aria-hidden="true" />
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-white/50">Goal</p>
          <p className="font-heading font-bold text-base text-white leading-tight">
            {goalWeight.toFixed(1)} lb
          </p>
        </div>
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

      {/* Quick debt/credit pill */}
      {(debtLbs > 0 || creditLbs > 0) && (
        <div className="relative mt-3 flex items-center justify-center">
          <span
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wide rounded-full px-3 py-1 ring-1",
              debtLbs > 0
                ? "bg-destructive/20 text-destructive ring-destructive/40"
                : "bg-emerald-500/20 text-emerald-200 ring-emerald-500/40"
            )}
          >
            {debtLbs > 0
              ? `${debtLbs.toFixed(1)} lb behind`
              : `${creditLbs.toFixed(1)} lb ahead`}
          </span>
        </div>
      )}

      {/* Tap-to-expand hint */}
      <div className="relative mt-3 flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-white/50">
        <ChevronDown className="h-3 w-3" />
        Tap for journal &amp; my why
      </div>
    </Card>
  );
}
