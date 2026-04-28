import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getMilestoneBanner, getNextMilestone } from "@/lib/fastingMilestones";

// Fasting stages with hour thresholds, icons, and arc colors
const FASTING_STAGES = [
  { hour: 0, label: "Anabolic", icon: "🔴", description: "Blood sugar rises", color: "#ef4444" },
  { hour: 2, label: "Catabolic", icon: "🟠", description: "Insulin drops", color: "#f97316" },
  { hour: 4, label: "Post-Absorptive", icon: "🟡", description: "Blood sugar falls", color: "#eab308" },
  { hour: 8, label: "Gluconeogenesis", icon: "🟢", description: "Glucose from non-carbs", color: "#22c55e" },
  { hour: 12, label: "Metabolic Shift", icon: "🔵", description: "Fat burning begins", color: "#3b82f6" },
  { hour: 14, label: "Partial Ketosis", icon: "🟣", description: "Ketone production", color: "#8b5cf6" },
  { hour: 16, label: "Fat Burning", icon: "🔥", description: "Autophagy starts", color: "#f43f5e" },
  { hour: 18, label: "Growth Hormone", icon: "💪", description: "HGH increases", color: "#ec4899" },
  { hour: 24, label: "Autophagy", icon: "♻️", description: "Cell renewal", color: "#06b6d4" },
  { hour: 36, label: "Renewal", icon: "✨", description: "Deep autophagy", color: "#14b8a6" },
  { hour: 48, label: "Immune Reset", icon: "🛡️", description: "Immune renewal", color: "#a855f7" },
  { hour: 72, label: "Stem Cells", icon: "🧬", description: "Stem cell regeneration", color: "#6366f1" },
];

interface FastingTimerProps {
  fastStartAt: string;
  targetHours: number;
  now: Date;
  demoProgress?: number; // 0-1 override for demo mode
  compact?: boolean;
}

// Helper: create an SVG arc path for a segment of a circle
function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  // startDeg/endDeg already offset by -90 from caller
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export function FastingTimer({ fastStartAt, targetHours, now, demoProgress, compact = false }: FastingTimerProps) {
  const fastStart = new Date(fastStartAt);
  const fastEnd = new Date(fastStart.getTime() + targetHours * 3600000);
  const elapsed = now.getTime() - fastStart.getTime();
  const total = fastEnd.getTime() - fastStart.getTime();
  const realProgress = Math.min(Math.max(elapsed / total, 0), 1);
  const progress = demoProgress !== undefined ? demoProgress : realProgress;
  const elapsedHours = progress * targetHours;
  const remainingMs = Math.max(total * (1 - progress), 0);
  const remainH = Math.floor(remainingMs / 3600000);
  const remainM = Math.floor((remainingMs % 3600000) / 60000);
  const remainS = Math.floor((remainingMs % 60000) / 1000);
  const timeStr = `${String(remainH).padStart(2, "0")}:${String(remainM).padStart(2, "0")}:${String(remainS).padStart(2, "0")}`;
  const elapsedPct = Math.round(progress * 100);

  // Milestone data
  const milestoneBanner = getMilestoneBanner(elapsedHours, targetHours);
  const nextMilestone = getNextMilestone(elapsedHours);

  // Filter stages relevant to this fast duration
  const relevantStages = FASTING_STAGES.filter(s => s.hour <= targetHours);

  // Current active stage
  const currentStage = [...FASTING_STAGES].reverse().find(s => elapsedHours >= s.hour) || FASTING_STAGES[0];

  // SVG dimensions
  const size = compact ? 236 : 300;
  const bandWidth = compact ? 32 : 40;
  const radius = (size - bandWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Build colored arc segments (only for elapsed portion)
  const progressAngle = progress * 360;
  const arcSegments: { startAngle: number; endAngle: number; color: string }[] = [];

  for (let i = 0; i < relevantStages.length; i++) {
    const stage = relevantStages[i];
    const nextStage = relevantStages[i + 1];
    const stageStartFraction = stage.hour / targetHours;
    const stageEndFraction = nextStage ? nextStage.hour / targetHours : 1;
    const stageStartAngle = stageStartFraction * 360;
    const stageEndAngle = stageEndFraction * 360;

    // Only draw if progress has reached this stage
    if (progressAngle <= stageStartAngle) break;

    const segStart = stageStartAngle;
    const segEnd = Math.min(stageEndAngle, progressAngle);

    // Need at least a tiny arc
    if (segEnd - segStart < 0.3) continue;

    arcSegments.push({
      startAngle: segStart,
      endAngle: segEnd,
      color: stage.color,
    });
  }

  // Position a stage icon on the ring
  function getStagePosition(hour: number) {
    const fraction = Math.min(hour / targetHours, 1);
    const angle = fraction * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    return {
      cx: size / 2 + radius * Math.cos(rad),
      cy: size / 2 + radius * Math.sin(rad),
    };
  }

  // Indicator dot at leading edge
  const indicatorAngle = progress * 360 - 90;
  const indicatorRad = (indicatorAngle * Math.PI) / 180;
  const indicatorX = cx + radius * Math.cos(indicatorRad);
  const indicatorY = cy + radius * Math.sin(indicatorRad);
  const indicatorColor = currentStage.color;

  // Circumference for background track
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={cn("flex w-full flex-col items-center", compact ? "gap-2" : "") }>
      {/* Timer Ring */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {/* Background track */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="black"
            strokeWidth={bandWidth}
            opacity={0.85}
          />

          {/* Multi-colored progress arc segments */}
          {arcSegments.map((seg, i) => (
            <path
              key={i}
              d={describeArc(cx, cy, radius, seg.startAngle - 90, seg.endAngle - 90)}
              fill="none"
              stroke={seg.color}
              strokeWidth={bandWidth}
              strokeLinecap="butt"
              className="transition-all duration-1000 ease-linear"
              style={{
                filter: `drop-shadow(0 0 8px ${seg.color}66)`,
              }}
            />
          ))}

          {/* Thin center divider line through the band */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="white"
            strokeWidth={1.5}
            opacity={0.7}
          />

          {/* Progress indicator nub */}
          {progress > 0.005 && (
            <circle
              cx={indicatorX} cy={indicatorY} r={compact ? 5 : 6}
              fill={indicatorColor}
              stroke="hsl(var(--background))"
              strokeWidth={2}
              style={{
                filter: `drop-shadow(0 0 6px ${indicatorColor}99)`,
              }}
            />
          )}
        </svg>

        {/* Stage milestone icons positioned around the ring */}
        {relevantStages.map((stage) => {
          const pos = getStagePosition(stage.hour);
          const isReached = elapsedHours >= stage.hour;
          const isCurrent = currentStage.hour === stage.hour;
          return (
            <div
              key={stage.hour}
              className={cn(
                "absolute flex items-center justify-center rounded-full text-xs transition-all duration-500",
                isCurrent
                  ? compact
                    ? "h-5 w-5 -ml-2.5 -mt-2.5 scale-110 z-10"
                    : "h-6 w-6 -ml-3 -mt-3 scale-110 z-10"
                  : isReached
                    ? compact
                      ? "h-4 w-4 -ml-2 -mt-2 bg-card/90"
                      : "h-5 w-5 -ml-2.5 -mt-2.5 bg-card/90"
                    : compact
                      ? "h-3.5 w-3.5 -ml-[7px] -mt-[7px] bg-muted/60 opacity-40"
                      : "h-4 w-4 -ml-2 -mt-2 bg-muted/60 opacity-40"
              )}
              style={{
                left: pos.cx,
                top: pos.cy,
                ...(isCurrent ? {
                  backgroundColor: `${stage.color}25`,
                  boxShadow: `0 0 0 2px ${stage.color}55`,
                } : isReached ? {
                  boxShadow: `0 0 0 1px ${stage.color}40`,
                } : {}),
              }}
              title={`${stage.label} (${stage.hour}h) – ${stage.description}`}
            >
              <span className={cn(compact ? "text-[8px]" : "text-[9px]", !isReached && "grayscale")}>{stage.icon}</span>
            </div>
          );
        })}

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(compact ? "mb-0 text-lg" : "mb-0.5 text-xl")}>{currentStage.icon}</span>
          <span
            className={cn(
              "font-medium uppercase tracking-wide",
              compact ? "text-[8px]" : "text-[9px]"
            )}
            style={{ color: currentStage.color }}
          >
            {currentStage.label}
          </span>
          <span className={cn(
            "font-bold tabular-nums tracking-tight text-white drop-shadow-lg",
            compact ? "mt-0.5 text-[2rem] leading-none" : "mt-0.5 text-2xl"
          )}>{timeStr}</span>
          <span className={cn(
            "font-bold uppercase tracking-wider text-white/80",
            compact ? "mt-1 text-[9px]" : "mt-0.5 text-[10px]"
          )}>
            Elapsed ({elapsedPct}%)
          </span>
        </div>
      </div>

      {/* Start / Goal timestamps */}
      <div className={cn("grid w-full grid-cols-2", compact ? "mt-1 gap-2" : "mt-5 gap-3")}>
        <div className={cn("rounded-lg border border-white/20 bg-white/10 text-center", compact ? "px-2.5 py-2" : "px-3 py-2.5")}>
          <p className={cn("font-bold uppercase tracking-wider text-white/70", compact ? "mb-0 text-[9px]" : "mb-0.5 text-[10px]")}>Started</p>
          <p className="text-xs font-bold text-white">{format(fastStart, "EEE, h:mm a")}</p>
        </div>
        <div className={cn("rounded-lg border border-white/20 bg-white/10 text-center", compact ? "px-2.5 py-2" : "px-3 py-2.5")}>
          <p className={cn("font-bold uppercase tracking-wider text-white/70", compact ? "mb-0 text-[9px]" : "mb-0.5 text-[10px]")}>{targetHours}h Goal</p>
          <p className="text-xs font-bold text-white">{format(fastEnd, "EEE, h:mm a")}</p>
        </div>
      </div>

      {/* Current stage description */}
      <p className={cn("text-center font-bold text-white/80", compact ? "mt-1 text-[11px] leading-snug" : "mt-3 text-xs")}>
        {currentStage.description}
        {remainingMs <= 0 && " — Fast complete! 🎉"}
      </p>

      {/* Day Milestone Banner */}
      {milestoneBanner && (
        <div className={cn("rounded-xl border border-amber-500/30 bg-amber-500/10 text-center", compact ? "mt-1 px-3 py-2.5" : "mt-3 px-4 py-3")}>
          <p className={cn("font-black text-white", compact ? "text-xs" : "text-sm")}>
            {milestoneBanner.emoji} {milestoneBanner.title}
          </p>
          <p className={cn("mt-1 font-medium text-white/70", compact ? "text-[10px] leading-snug" : "text-[11px]")}>
            {milestoneBanner.body}
          </p>
        </div>
      )}

      {/* Next Milestone Preview */}
      {nextMilestone && !milestoneBanner && elapsedHours >= 12 && !compact && (
        <p className="text-[11px] text-white/40 text-center mt-2 italic">
          Next milestone: Day {nextMilestone.day} at {nextMilestone.hours}h
        </p>
      )}
    </div>
  );
}
