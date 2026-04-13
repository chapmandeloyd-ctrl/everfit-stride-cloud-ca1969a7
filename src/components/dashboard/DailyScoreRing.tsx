import { useDailyScore } from "@/hooks/useDailyScore";
import { cn } from "@/lib/utils";

const RING_SIZE = 140;
const STROKE_WIDTH = 10;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DailyScoreRing() {
  const { data: score, isLoading } = useDailyScore();

  if (isLoading || !score) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 animate-pulse">
        <div className="w-[140px] h-[140px] rounded-full bg-white/[0.04]" />
        <div className="h-4 w-24 bg-white/[0.06] rounded" />
      </div>
    );
  }

  const progress = score.total / 100;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {/* Score Ring */}
      <div className="relative">
        <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="hsl(var(--muted) / 0.3)"
            strokeWidth={STROKE_WIDTH}
          />
          {/* Progress ring */}
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={score.ringColor}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold tabular-nums", score.color)}>
            {score.total}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Today
          </span>
        </div>
      </div>

      {/* Label */}
      <span className={cn("text-sm font-semibold", score.color)}>
        {score.label}
      </span>

      {/* Coach message */}
      <p className="text-xs text-muted-foreground text-center max-w-[260px] leading-relaxed">
        {score.coachMessage}
      </p>

      {/* Category breakdown */}
      <div className="flex gap-4 mt-1">
        {score.categories.map((cat) => (
          <div key={cat.key} className="flex flex-col items-center gap-0.5">
            <span className={cn(
              "text-sm font-bold tabular-nums",
              cat.score >= 80 ? "text-emerald-400" :
              cat.score >= 50 ? "text-amber-400" : "text-red-400"
            )}>
              {cat.score}
            </span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
              {cat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
