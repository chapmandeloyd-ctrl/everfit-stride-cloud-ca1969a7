import { useEffect, useRef } from "react";
import { useDailyScore } from "@/hooks/useDailyScore";
import { useConsistencyStreak } from "@/hooks/useConsistencyStreak";
import { useKsomLevelProgression } from "@/hooks/useKsomLevelProgression";
import { cn } from "@/lib/utils";
import { Flame, Trophy, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const RING_SIZE = 140;
const STROKE_WIDTH = 10;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DailyScoreRing() {
  const { data: score, isLoading: scoreLoading } = useDailyScore();
  const { data: streak, isLoading: streakLoading, recordScore } = useConsistencyStreak();
  const { data: levelData, isLoading: levelLoading, addProgress } = useKsomLevelProgression();
  const hasRecordedRef = useRef(false);

  // Auto-record daily score to streak + level systems (once per render cycle)
  useEffect(() => {
    if (!score || !streak || hasRecordedRef.current) return;
    const today = new Date().toISOString().split("T")[0];
    if (streak.lastScoredDate !== today && score.total > 0) {
      hasRecordedRef.current = true;
      recordScore.mutate(score.label);
      addProgress.mutate({ scoreLabel: score.label, streak: streak.currentStreak });
    }
  }, [score, streak]);

  if (scoreLoading || streakLoading || levelLoading || !score) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 animate-pulse">
        <div className="w-[140px] h-[140px] rounded-full bg-white/[0.04]" />
        <div className="h-4 w-24 bg-white/[0.06] rounded" />
      </div>
    );
  }

  const progress = score.total / 100;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const currentStreak = streak?.currentStreak ?? 0;
  const longestStreak = streak?.longestStreak ?? 0;
  const nextMilestone = streak?.nextMilestone;
  const level = levelData?.level ?? 1;
  const tierInfo = levelData?.tierInfo;

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {/* Level badge */}
      {tierInfo && (
        <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold", tierInfo.bgColor, tierInfo.color)}>
          <Zap className="h-3 w-3" />
          Level {level} · {tierInfo.tier}
        </div>
      )}

      {/* Score Ring */}
      <div className="relative">
        <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="hsl(var(--muted) / 0.3)"
            strokeWidth={STROKE_WIDTH}
          />
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

      {/* Streak + Longest */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-bold text-foreground">
            Streak: {currentStreak} Day{currentStreak !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Longest: {longestStreak}
          </span>
        </div>
      </div>

      {/* Level progress bar */}
      {levelData && (
        <div className="w-full max-w-[260px] space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Level {level}</span>
            <span className="text-muted-foreground">{levelData.completionPct}% → Level {level + 1}</span>
          </div>
          <Progress value={levelData.completionPct} className="h-1.5" />
          {levelData.nextUnlock && (
            <p className="text-[10px] text-muted-foreground text-center mt-0.5">
              Next: <span className="font-medium text-foreground">{levelData.nextUnlock}</span>
            </p>
          )}
        </div>
      )}

      {/* Next streak milestone */}
      {nextMilestone && currentStreak < nextMilestone.days && (
        <div className="text-[11px] text-muted-foreground">
          <span className="text-amber-400 font-semibold">{nextMilestone.days - currentStreak}</span>
          {" "}day{nextMilestone.days - currentStreak !== 1 ? "s" : ""} to{" "}
          <span className="font-medium text-foreground">{nextMilestone.label}</span>
        </div>
      )}

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
