import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDailyScore } from "@/hooks/useDailyScore";
import { useConsistencyStreak } from "@/hooks/useConsistencyStreak";
import { useKsomLevelProgression } from "@/hooks/useKsomLevelProgression";
import { cn } from "@/lib/utils";
import { Flame, Zap, ChevronRight } from "lucide-react";

const RING_SIZE = 44;
const STROKE_WIDTH = 4;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DailyScoreRing() {
  const navigate = useNavigate();
  const { data: score, isLoading: scoreLoading } = useDailyScore();
  const { data: streak, isLoading: streakLoading, recordScore } = useConsistencyStreak();
  const { data: levelData, isLoading: levelLoading, addProgress } = useKsomLevelProgression();
  const hasRecordedRef = useRef(false);

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
      <div className="mx-2 rounded-2xl bg-card p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-muted/30" />
          <div className="h-4 w-32 bg-muted/20 rounded" />
        </div>
      </div>
    );
  }

  const progress = score.total / 100;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const currentStreak = streak?.currentStreak ?? 0;
  const level = levelData?.level ?? 1;
  const tierInfo = levelData?.tierInfo;

  return (
    <div className="mx-2">
      <h2 className="text-lg font-bold text-foreground mb-2 px-1">Daily Performance</h2>
      <button
        onClick={() => navigate("/client/daily-score")}
        className="w-full rounded-none bg-black border border-white/10 p-3 flex items-center gap-3 focus:outline-none active:scale-[0.99] transition-transform"
      >
        {/* Mini progress ring with score */}
        <div className="relative flex-shrink-0">
          <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
            <circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
              fill="none" stroke="hsl(var(--muted) / 0.25)" strokeWidth={STROKE_WIDTH}
            />
            <circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
              fill="none" stroke={score.ringColor} strokeWidth={STROKE_WIDTH}
              strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-[11px] font-bold tabular-nums", score.color)}>{score.total}</span>
          </div>
        </div>

        {/* Title + level/streak */}
        <div className="flex-1 text-left min-w-0">
          <span className={cn("text-sm font-bold", score.color)}>{score.label}</span>
          <div className="flex items-center gap-2 mt-0.5">
            {tierInfo && (
              <span className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold",
                tierInfo.bgColor, tierInfo.color
              )}>
                <Zap className="h-2.5 w-2.5" />
                Lvl {level}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Flame className="h-3 w-3 text-amber-400" />
              {currentStreak}d streak
            </span>
          </div>
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>
    </div>
  );
}
