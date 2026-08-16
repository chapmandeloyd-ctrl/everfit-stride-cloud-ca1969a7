import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getMilestoneBanner, getNextMilestone } from "@/lib/fastingMilestones";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

// Fasting stages with hour thresholds, icons, arc colors, and benefits
const FASTING_STAGES = [
  { hour: 0, label: "Anabolic", icon: "🔴", description: "Blood sugar rises", color: "#ef4444", benefits: ["Insulin is released to shuttle glucose into cells", "Body begins digesting and absorbing nutrients", "Energy from food is being stored as glycogen and fat"] },
  { hour: 2, label: "Catabolic", icon: "🟠", description: "Insulin drops", color: "#f97316", benefits: ["Insulin levels start declining", "Body shifts from storing to maintaining energy", "Digestive system starts resting"] },
  { hour: 4, label: "Post-Absorptive", icon: "🟡", description: "Blood sugar falls", color: "#eab308", benefits: ["Blood sugar returns to baseline levels", "Body begins tapping into glycogen reserves", "Growth hormone secretion begins to increase"] },
  { hour: 8, label: "Gluconeogenesis", icon: "🟢", description: "Glucose from non-carbs", color: "#22c55e", benefits: ["Liver converts amino acids and glycerol into glucose", "Glycogen stores are being depleted", "Metabolic flexibility improves as body adapts"] },
  { hour: 12, label: "Metabolic Shift", icon: "🔵", description: "Fat burning begins", color: "#3b82f6", benefits: ["Glycogen stores are significantly depleted", "Body switches primary fuel source to fat", "Ketone production begins at low levels", "Inflammation markers start to decrease"] },
  { hour: 14, label: "Partial Ketosis", icon: "🟣", description: "Ketone production", color: "#8b5cf6", benefits: ["Brain begins using ketones for fuel", "Mental clarity and focus often improve", "Fat oxidation rate increases significantly"] },
  { hour: 16, label: "Fat Burning", icon: "🔥", description: "Autophagy starts", color: "#f43f5e", benefits: ["Autophagy (cellular cleanup) is activated", "Damaged proteins and organelles are recycled", "Anti-aging pathways are stimulated", "Deep fat burning is in full effect"] },
  { hour: 18, label: "Growth Hormone", icon: "💪", description: "HGH increases", color: "#ec4899", benefits: ["HGH levels can increase up to 5x baseline", "Muscle preservation is enhanced", "Fat metabolism is accelerated", "Tissue repair and recovery improve"] },
  { hour: 24, label: "Autophagy", icon: "♻️", description: "Cell renewal", color: "#06b6d4", benefits: ["Autophagy reaches significant levels", "Intestinal stem cells begin regenerating", "Old immune cells are cleared out", "Inflammation is markedly reduced"] },
  { hour: 36, label: "Renewal", icon: "✨", description: "Deep autophagy", color: "#14b8a6", benefits: ["Gut lining repair and regeneration accelerates", "BDNF (brain-derived neurotrophic factor) increases", "Neuroplasticity and cognitive function are enhanced", "Cellular waste removal reaches peak efficiency"] },
  { hour: 48, label: "Immune Reset", icon: "🛡️", description: "Immune renewal", color: "#a855f7", benefits: ["Old white blood cells are recycled", "Immune system begins generating fresh cells", "Stem cell-based regeneration is activated", "Significant reduction in oxidative stress"] },
  { hour: 72, label: "Stem Cells", icon: "🧬", description: "Stem cell regeneration", color: "#6366f1", benefits: ["Immune system is substantially renewed", "Stem cell production increases dramatically", "IGF-1 levels drop, promoting longevity pathways", "Complete metabolic reset is achieved"] },
];

interface FastingTimerProps {
  fastStartAt: string;
  targetHours: number;
  now: Date;
  demoProgress?: number; // 0-1 override for demo mode
  compact?: boolean;
  centerImageSrc?: string;
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

export function FastingTimer({ fastStartAt, targetHours, now, demoProgress, compact = false, centerImageSrc }: FastingTimerProps) {
  const [stageSheetOpen, setStageSheetOpen] = useState(false);
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

  // Build colored arc segments — FULL ring is painted (timeline look)
  const progressAngle = progress * 360;
  const arcSegments: { startAngle: number; endAngle: number; color: string }[] = [];

  for (let i = 0; i < relevantStages.length; i++) {
    const stage = relevantStages[i];
    const nextStage = relevantStages[i + 1];
    const stageStartFraction = stage.hour / targetHours;
    const stageEndFraction = nextStage ? nextStage.hour / targetHours : 1;
    const stageStartAngle = stageStartFraction * 360;
    const stageEndAngle = stageEndFraction * 360;

    const segStart = stageStartAngle;
    const segEnd = stageEndAngle;

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

  // Thin progress arc centered on the colored band
  const innerRadius = radius;
  const innerCircumference = 2 * Math.PI * innerRadius;
  const innerDash = progress * innerCircumference;
  const knobRad = ((progress * 360 - 90) * Math.PI) / 180;
  const knobX = cx + innerRadius * Math.cos(knobRad);
  const knobY = cy + innerRadius * Math.sin(knobRad);

  return (
    <div className={cn("flex w-full flex-col items-center", compact ? "gap-2" : "") }>
      {/* Elapsed time — ABOVE ring (lion fills the ring center) */}
      <div className="flex flex-col items-center">
        <span className={cn(
          "font-bold tabular-nums tracking-tight text-white drop-shadow-lg",
          compact ? "text-[2.25rem] leading-none" : "text-4xl leading-none"
        )}>{timeStr}</span>
        <span className={cn(
          "mt-1 font-bold uppercase tracking-wider text-white/80",
          compact ? "text-[9px]" : "text-[10px]"
        )}>
          Remaining · {elapsedPct}% done
        </span>
      </div>

      {/* Timer Ring */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        {centerImageSrc && (
          <img
            src={centerImageSrc}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-90 select-none"
          />
        )}
        <svg width={size} height={size} className="relative z-10">
          {/* Background track */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="black"
            strokeWidth={bandWidth}
            opacity={0.85}
          />

          {/* Full ring shown dim (upcoming), colored only up to current progress */}
          {arcSegments.map((seg, i) => (
            <path
              key={`dim-${i}`}
              d={describeArc(cx, cy, radius, seg.startAngle - 90, seg.endAngle - 90)}
              fill="none"
              stroke={seg.color}
              strokeWidth={bandWidth}
              strokeLinecap="butt"
              opacity={0.18}
            />
          ))}
          {arcSegments.map((seg, i) => {
            const litEnd = Math.min(seg.endAngle, progressAngle);
            if (litEnd - seg.startAngle < 0.3) return null;
            return (
              <path
                key={`lit-${i}`}
                d={describeArc(cx, cy, radius, seg.startAngle - 90, litEnd - 90)}
                fill="none"
                stroke={seg.color}
                strokeWidth={bandWidth}
                strokeLinecap="butt"
                style={{ filter: `drop-shadow(0 0 8px ${seg.color}66)` }}
              />
            );
          })}

          {/* Inner thin elapsed-progress arc */}
          <circle
            cx={cx} cy={cy} r={innerRadius}
            fill="none"
            stroke="white"
            strokeOpacity={0.9}
            strokeWidth={compact ? 2 : 2.5}
          />
          <circle
            cx={cx} cy={cy} r={innerRadius}
            fill="none"
            stroke="white"
            strokeWidth={compact ? 2 : 2.5}
            strokeLinecap="round"
            strokeDasharray={`${innerDash} ${innerCircumference}`}
            transform={`rotate(-90 ${cx} ${cy})`}
            className="transition-all duration-700 ease-linear"
            style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.8))" }}
          />

          {/* Progress knob on the inner arc */}
          {progress > 0.005 && (
            <circle
              cx={knobX} cy={knobY} r={compact ? 5 : 6}
              fill="white"
              stroke={indicatorColor}
              strokeWidth={2}
              className="transition-all duration-700 ease-linear"
              style={{ filter: `drop-shadow(0 0 6px ${indicatorColor}99)` }}
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
                "absolute z-10 flex items-center justify-center rounded-full transition-all duration-500",
                compact
                  ? "h-5 w-5 -ml-2.5 -mt-2.5"
                  : "h-6 w-6 -ml-3 -mt-3"
              )}
              style={{
                left: pos.cx,
                top: pos.cy,
                backgroundColor: stage.color,
                opacity: isReached ? 1 : 0.3,
                filter: isReached ? undefined : "grayscale(0.7)",
                boxShadow: isCurrent
                  ? `0 0 0 2px rgba(255,255,255,0.95), 0 0 12px ${stage.color}`
                  : isReached
                    ? `0 0 0 2px rgba(255,255,255,0.9)`
                    : `0 0 0 1.5px rgba(255,255,255,0.35)`,
              }}
              title={`${stage.label} (${stage.hour}h) – ${stage.description}`}
            >
              <span className={cn(compact ? "text-[9px]" : "text-[11px]", "leading-none")}>{stage.icon}</span>
            </div>
          );
        })}
      </div>

      {/* Stage pill — BELOW ring (tap to view benefits) */}
      <button
        type="button"
        onClick={() => setStageSheetOpen(true)}
        aria-label={`View benefits of ${currentStage.label} stage`}
        className={cn(
          "mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5",
          "bg-black/40 backdrop-blur-sm transition-transform active:scale-95 hover:brightness-110"
        )}
        style={{
          borderColor: `${currentStage.color}66`,
          boxShadow: `0 0 12px ${currentStage.color}40`,
        }}
      >
        <span className={compact ? "text-sm" : "text-base"}>{currentStage.icon}</span>
        <span
          className={cn(
            "font-bold uppercase tracking-wider",
            compact ? "text-[10px]" : "text-[11px]"
          )}
          style={{ color: currentStage.color }}
        >
          {currentStage.label}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-white/50">
          Tap ⓘ
        </span>
      </button>

      <Sheet open={stageSheetOpen} onOpenChange={setStageSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-2xl border-t-0 bg-background"
          style={{ boxShadow: `0 -8px 40px ${currentStage.color}55` }}
        >
          <SheetHeader className="text-left">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                style={{
                  backgroundColor: `${currentStage.color}20`,
                  boxShadow: `0 0 0 2px ${currentStage.color}55`,
                }}
              >
                {currentStage.icon}
              </div>
              <div className="flex-1">
                <SheetTitle style={{ color: currentStage.color }}>
                  {currentStage.label}
                </SheetTitle>
                <SheetDescription>
                  {currentStage.hour}h+ • {currentStage.description}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="mt-5">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              What's happening in your body
            </h4>
            <ul className="space-y-2.5">
              {currentStage.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: currentStage.color }}
                  />
                  <p className="text-sm leading-relaxed text-foreground/90">{benefit}</p>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-6 rounded-lg bg-muted/40 px-3 py-2 text-[11px] italic text-muted-foreground">
            Your body moves through each stage automatically as your fast progresses.
          </p>
        </SheetContent>
      </Sheet>

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
