import { useNavigate } from "react-router-dom";
import { useDailyScore } from "@/hooks/useDailyScore";
import { useConsistencyStreak } from "@/hooks/useConsistencyStreak";
import { useKsomLevelProgression } from "@/hooks/useKsomLevelProgression";
import { cn } from "@/lib/utils";
import { ChevronLeft, Flame, Trophy, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ProgressionUnlocksCard } from "@/components/dashboard/ProgressionUnlocksCard";

const RING_SIZE = 200;
const STROKE_WIDTH = 14;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ClientDailyScore() {
  const navigate = useNavigate();
  const { data: score, isLoading: scoreLoading } = useDailyScore();
  const { data: streak, isLoading: streakLoading } = useConsistencyStreak();
  const { data: levelData, isLoading: levelLoading } = useKsomLevelProgression();

  if (scoreLoading || streakLoading || levelLoading || !score) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-[200px] h-[200px] rounded-full bg-muted/20 animate-pulse" />
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Daily Score</h1>
      </div>

      <div className="flex flex-col items-center px-4 pt-6 pb-8 space-y-6">
        {/* Large Score Ring */}
        <div className="relative">
          <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
            <circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
              fill="none" stroke="hsl(var(--muted) / 0.2)" strokeWidth={STROKE_WIDTH}
            />
            <circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
              fill="none" stroke={score.ringColor} strokeWidth={STROKE_WIDTH}
              strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-5xl font-bold tabular-nums", score.color)}>{score.total}</span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Today</span>
          </div>
        </div>

        {/* Label */}
        <span className={cn("text-lg font-semibold", score.color)}>{score.label}</span>

        {/* Coach message */}
        <p className="text-sm text-muted-foreground text-center max-w-[300px] leading-relaxed">
          {score.coachMessage}
        </p>

        {/* Level + Streak card */}
        <div className="w-full rounded-2xl bg-card border border-border/50 p-4 space-y-4">
          {/* Level progress */}
          {levelData && tierInfo && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold",
                  tierInfo.bgColor, tierInfo.color
                )}>
                  <Zap className="h-3 w-3" />
                  Level {level}
                </span>
                <span className="text-xs text-muted-foreground">{levelData.completionPct}% → Level {level + 1}</span>
              </div>
              <Progress value={levelData.completionPct} className="h-2" />
              {levelData.nextUnlock && (
                <p className="text-xs text-muted-foreground">
                  Next: <span className="font-medium text-foreground">{levelData.nextUnlock}</span>
                </p>
              )}
            </div>
          )}

          {/* Streak */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-400" />
              <span className="text-sm font-semibold text-foreground">{currentStreak} day streak</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Trophy className="h-3.5 w-3.5" />
              <span className="text-xs">Best: {longestStreak}</span>
            </div>
          </div>

          {nextMilestone && currentStreak < nextMilestone.days && (
            <div className="text-xs text-muted-foreground">
              <span className="text-amber-400 font-semibold">{nextMilestone.days - currentStreak}</span>
              {" "}day{nextMilestone.days - currentStreak !== 1 ? "s" : ""} to{" "}
              <span className="font-medium text-foreground">{nextMilestone.label}</span>
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="w-full rounded-2xl bg-card border border-border/50 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Breakdown</h2>
          {score.categories.map((cat) => (
            <div key={cat.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{cat.label}</span>
                <span className={cn(
                  "text-xs font-bold tabular-nums",
                  cat.score >= 80 ? "text-emerald-400" :
                  cat.score >= 50 ? "text-amber-400" : "text-red-400"
                )}>
                  {cat.score}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    cat.score >= 80 ? "bg-emerald-500" :
                    cat.score >= 50 ? "bg-amber-500" : "bg-red-500"
                  )}
                  style={{ width: `${cat.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Next Unlock / Meal Progression */}
        <div className="w-full">
          <ProgressionUnlocksCard />
        </div>
      </div>
    </div>
  );
}
