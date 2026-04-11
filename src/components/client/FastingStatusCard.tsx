import { useState } from "react";
import { ChevronDown, Clock, Target, TrendingUp, Lightbulb } from "lucide-react";

interface FastingStatusCardProps {
  actualHours: number;
  targetHours: number;
  completionPct: number;
  endedEarly: boolean;
}

const FASTING_TIPS = [
  "Stay hydrated — water, black coffee, and herbal tea are your best friends.",
  "Keep busy during the last stretch — distraction beats willpower.",
  "Start your fast after dinner for easier overnight hours.",
  "Electrolytes can help reduce hunger pangs during longer fasts.",
  "Each fast trains your metabolism — consistency beats perfection.",
];

function getMotivation(pct: number, endedEarly: boolean): { emoji: string; message: string } {
  if (!endedEarly || pct >= 100) return { emoji: "🔥", message: "You crushed your target — keep this momentum going!" };
  if (pct >= 75) return { emoji: "💪", message: "So close! Just a little more discipline next time and you've got it." };
  if (pct >= 50) return { emoji: "⚡", message: "Over halfway there — you're building real fasting endurance!" };
  if (pct >= 25) return { emoji: "🌱", message: "Solid start! Try adding just 1 more hour next time." };
  return { emoji: "🏁", message: "Every hour fasted counts. You showed up — that's what matters." };
}

export function FastingStatusCard({
  actualHours,
  targetHours,
  completionPct,
  endedEarly,
}: FastingStatusCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hours = Math.floor(actualHours);
  const minutes = Math.round((actualHours % 1) * 60);
  const remainingHours = Math.max(0, targetHours - actualHours);
  const remH = Math.floor(remainingHours);
  const remM = Math.round((remainingHours % 1) * 60);

  const bgClass = endedEarly
    ? "bg-yellow-500/14 border-yellow-500/30"
    : "bg-emerald-500/14 border-emerald-500/30";
  const badgeClass = endedEarly
    ? "bg-yellow-500/18 text-yellow-950 dark:text-yellow-50 ring-1 ring-yellow-500/25"
    : "bg-emerald-500/18 text-emerald-950 dark:text-emerald-50 ring-1 ring-emerald-500/25";
  const ringClass = endedEarly
    ? "text-yellow-600 dark:text-yellow-300"
    : "text-emerald-600 dark:text-emerald-300";
  const accentClass = endedEarly
    ? "text-yellow-700 dark:text-yellow-300"
    : "text-emerald-700 dark:text-emerald-300";

  const { emoji, message } = getMotivation(completionPct, endedEarly);
  const tipOfDay = FASTING_TIPS[new Date().getDay() % FASTING_TIPS.length];

  return (
    <div className="space-y-2 mt-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Fasting Status
      </h2>
      <div className={`relative overflow-hidden rounded-xl border p-3 backdrop-blur-xl ${bgClass}`}>
        <div className="absolute inset-0 bg-card/20" aria-hidden="true" />
        <div className="relative">
          {/* Main row */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center gap-3 text-left"
          >
            {/* Progress ring */}
            <div className="relative h-12 w-12 flex-shrink-0">
              <svg viewBox="0 0 36 36" className={`h-12 w-12 -rotate-90 ${ringClass}`}>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" opacity={0.18} />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3"
                  strokeDasharray={`${completionPct} ${100 - completionPct}`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 m-auto flex h-7 w-7 items-center justify-center rounded-full bg-background/85 text-[10px] font-black text-foreground shadow-sm">
                {completionPct}%
              </span>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                {endedEarly ? "Partial" : "Completed"}
              </span>
              <p className="mt-1 text-sm font-bold text-foreground">
                {hours}h {minutes}m fasted
              </p>
              <p className="text-[10px] text-foreground/70">
                {endedEarly
                  ? `${Math.round(actualHours)} of ${targetHours}h target`
                  : `${targetHours}h target reached`}
              </p>
            </div>

            {/* Chevron */}
            <ChevronDown
              size={18}
              className={`flex-shrink-0 text-foreground/50 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            />
          </button>

          {/* Expanded details */}
          <div
            className={`grid transition-all duration-300 ease-out ${
              expanded ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0 mt-0"
            }`}
          >
            <div className="overflow-hidden">
              {/* Stat tiles */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-lg bg-background/60 p-2 text-center">
                  <Clock size={14} className={`mx-auto mb-1 ${accentClass}`} />
                  <p className="text-[10px] text-muted-foreground">Duration</p>
                  <p className="text-xs font-bold text-foreground">{hours}h {minutes}m</p>
                </div>
                <div className="rounded-lg bg-background/60 p-2 text-center">
                  <Target size={14} className={`mx-auto mb-1 ${accentClass}`} />
                  <p className="text-[10px] text-muted-foreground">Target</p>
                  <p className="text-xs font-bold text-foreground">{targetHours}h</p>
                </div>
                <div className="rounded-lg bg-background/60 p-2 text-center">
                  <TrendingUp size={14} className={`mx-auto mb-1 ${accentClass}`} />
                  <p className="text-[10px] text-muted-foreground">{endedEarly ? "Remaining" : "Bonus"}</p>
                  <p className="text-xs font-bold text-foreground">
                    {endedEarly ? `${remH}h ${remM}m` : "—"}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{completionPct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      endedEarly
                        ? "bg-gradient-to-r from-yellow-400 to-yellow-500"
                        : "bg-gradient-to-r from-emerald-400 to-emerald-500"
                    }`}
                    style={{ width: `${Math.min(completionPct, 100)}%` }}
                  />
                </div>
              </div>

              {/* Motivation */}
              <div className="rounded-lg bg-background/60 p-2.5 mb-2">
                <p className="text-xs font-semibold text-foreground mb-0.5">
                  {emoji} {endedEarly ? "Next Time" : "Great Job"}
                </p>
                <p className="text-[11px] text-foreground/70 leading-relaxed">{message}</p>
              </div>

              {/* Tip */}
              <div className="flex items-start gap-2 rounded-lg bg-background/40 p-2.5">
                <Lightbulb size={14} className={`flex-shrink-0 mt-0.5 ${accentClass}`} />
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Quick Tip</p>
                  <p className="text-[11px] text-foreground/70 leading-relaxed">{tipOfDay}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
