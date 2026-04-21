import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, Target, BookHeart, Heart } from "lucide-react";
import { useSmartPace } from "@/hooks/useSmartPace";
import { cn } from "@/lib/utils";
import { SmartPaceJournalView } from "./SmartPaceJournalView";
import { SmartPaceWhyView } from "./SmartPaceWhyView";

const COLOR_HINT_STORAGE_KEY = "smartPaceColorHintViews";
const MAX_HINT_VIEWS = 3;

/**
 * Dashboard banner — replaces the old GoalCard when smart_pace_enabled = true.
 * Severity-driven visuals.
 */
export function SmartPaceBanner() {
  const { data } = useSmartPace();
  const [flipView, setFlipView] = useState<"none" | "journal" | "why">("none");
  const [showColorHint, setShowColorHint] = useState(false);

  useEffect(() => {
    if (!data?.enabled || !data.goal) return;
    try {
      const views = parseInt(localStorage.getItem(COLOR_HINT_STORAGE_KEY) || "0", 10);
      if (views < MAX_HINT_VIEWS) {
        setShowColorHint(true);
        localStorage.setItem(COLOR_HINT_STORAGE_KEY, String(views + 1));
      }
    } catch {
      // localStorage unavailable — silently skip the hint
    }
  }, [data?.enabled, data?.goal?.id]);

  if (!data?.enabled || !data.goal) return null;

  const { goal, todayTargetLbs, debtLbs, creditLbs, status, progressPct, reason, projectedDate, cappedAt } =
    data;

  const fmtDate = (d?: string | Date | null) => {
    if (!d) return "—";
    const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };
  const startWeight = goal.start_weight;
  const goalWeight = goal.goal_weight;
  const startDate = goal.start_date;
  const targetDate = goal.target_date;

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
          accent: "from-destructive/40",
          dot: "bg-destructive shadow-[0_0_10px_hsl(var(--destructive))]",
          hint: "Red means you're falling behind your daily target — let's catch up.",
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
          dot: "bg-sky-400 shadow-[0_0_10px_hsl(200_85%_60%)]",
          hint: "Blue means you're ahead of pace — fantastic momentum.",
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
          dot: "bg-emerald-400 shadow-[0_0_10px_hsl(150_75%_55%)]",
          hint: "Green means you're right on pace — keep it going.",
        };

  const Icon = tone.icon;
  const headline =
    status === "missed"
      ? "Catch-up needed"
      : status === "behind"
      ? "Catch-up day"
      : status === "ahead"
      ? "Ahead of pace"
      : "Today's target";

  return (
    <Card
      className={cn(
        "relative overflow-hidden border p-4 text-white transition-all",
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
      {/* Diagonal sheen */}
      <div
        className={cn(
          "pointer-events-none absolute -top-1/2 -left-1/4 h-[200%] w-1/2 rotate-12 bg-gradient-to-b to-transparent blur-2xl opacity-60",
          tone.accent
        )}
      />
      {/* Bottom-right radial glow */}
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-white/5 blur-3xl" />

      {/* Live "mood ring" dot — ambient color-state cue (Option D) */}
      {flipView === "none" && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1.5 z-10"
          aria-label={`Status indicator: ${status}`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", tone.dot)} />
            <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", tone.dot)} />
          </span>
        </div>
      )}

      {flipView === "journal" ? (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <SmartPaceJournalView
            goalId={goal.id}
            onClose={() => setFlipView("none")}
          />
        </div>
      ) : flipView === "why" ? (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <SmartPaceWhyView
            goalId={goal.id}
            trainerId={(goal as any).trainer_id ?? null}
            onClose={() => setFlipView("none")}
          />
        </div>
      ) : (
        <>
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
                {showColorHint && (
                  <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-white/5 ring-1 ring-white/10 px-2 py-1.5 animate-fade-in">
                    <span className={cn("mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0", tone.dot)} />
                    <p className="text-[10px] leading-snug text-white/80 italic">
                      {tone.hint}
                    </p>
                  </div>
                )}
                {cappedAt !== null && (
                  <p className="text-[11px] text-amber-300 mt-1">
                    Capped at {cappedAt.toFixed(1)} lb (max safe pace)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Start → Goal weight strip */}
          <div className="relative mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-black/30 ring-1 ring-white/10 p-2.5">
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-wide text-white/50">Start</p>
              <p className="font-heading font-bold text-base text-white leading-tight">
                {startWeight !== null ? `${startWeight.toFixed(1)} lb` : "—"}
              </p>
              <p className="text-[10px] text-white/50">{fmtDate(startDate)}</p>
            </div>
            <div className="h-px w-5 bg-white/20" aria-hidden="true" />
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-white/50">Goal</p>
              <p className="font-heading font-bold text-base text-white leading-tight">
                {goalWeight.toFixed(1)} lb
              </p>
              <p className="text-[10px] text-white/50">{fmtDate(targetDate)}</p>
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

          {/* Mini stats row */}
          <div className="relative grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
            <Stat label="Debt" value={`${debtLbs.toFixed(1)}`} unit="lb" tone={debtLbs > 0 ? "warn" : "muted"} />
            <Stat label="Credit" value={`${creditLbs.toFixed(1)}`} unit="lb" tone={creditLbs > 0 ? "good" : "muted"} />
            <Stat
              label="Projected"
              value={projectedDate ? projectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
              unit=""
              tone="muted"
            />
          </div>

          {/* Action buttons */}
          <div className="relative grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={(e) => { e.stopPropagation(); setFlipView("journal"); }}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 backdrop-blur-sm py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition"
            >
              <BookHeart className="h-3.5 w-3.5" />
              Journal
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setFlipView("why"); }}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 backdrop-blur-sm py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition"
            >
              <Heart className="h-3.5 w-3.5" />
              My Why
            </button>
          </div>
        </>
      )}
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
