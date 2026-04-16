import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDailyScore } from "@/hooks/useDailyScore";
import { useConsistencyStreak } from "@/hooks/useConsistencyStreak";
import { useKsomLevelProgression } from "@/hooks/useKsomLevelProgression";
import { cn } from "@/lib/utils";
import { Flame, Zap, ChevronRight, Trophy, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const RING_SIZE = 44;
const STROKE_WIDTH = 4;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DailyScoreRing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: score, isLoading: scoreLoading } = useDailyScore();
  const { data: streak, isLoading: streakLoading, recordScore } = useConsistencyStreak();
  const { data: levelData, isLoading: levelLoading, addProgress } = useKsomLevelProgression();
  const hasRecordedRef = useRef(false);
  const [showStreakAnim, setShowStreakAnim] = useState(false);

  useEffect(() => {
    if (!score || !streak || hasRecordedRef.current) return;
    const today = new Date().toISOString().split("T")[0];
    if (streak.lastScoredDate !== today && score.total > 0) {
      hasRecordedRef.current = true;

      // Check if fasting was completed today
      const fastingCategory = score.categories.find(c => c.key === "fasting");
      const fastingCompleted = (fastingCategory?.score ?? 0) >= 80;

      recordScore.mutate(
        {
          scoreLabel: score.label,
          dailyScore: score.total,
          fastingCompleted,
        },
        {
          onSuccess: (result) => {
            if (!result) return;
            if (result.action === "incremented") {
              setShowStreakAnim(true);
              setTimeout(() => setShowStreakAnim(false), 2000);
              toast({
                title: `🔥 Streak +1 — stay locked in`,
                description: result.isPerfectDay ? "Perfect Day achieved!" : undefined,
              });
            } else if (result.action === "reset") {
              toast({
                title: "Reset — start fresh today",
                description: "Every day is a new opportunity.",
              });
            }
          },
        }
      );
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

  // Zero-activity state — show a clean "get started" card instead of "Reset Needed"
  if (score.total === 0) {
    return (
      <div className="mx-2 space-y-2">
        <h2 className="text-lg font-bold text-foreground px-1">Daily Performance</h2>
        <div className="w-full rounded-xl bg-black border border-white/10 p-4 text-center space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">No activity logged yet today</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {score.coachMessage}
          </p>
        </div>
      </div>
    );
  }

  const progress = score.total / 100;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const currentStreak = streak?.currentStreak ?? 0;
  const level = levelData?.level ?? 1;
  const tierInfo = levelData?.tierInfo;
  const streakTier = streak?.tierInfo;
  const isPerfectDay = score.total >= 90;
  const weeklyLabel = streak?.weeklyLabel;

  return (
    <div className="mx-2 space-y-2">
      {/* Streak Tier Pill */}
      {streakTier && currentStreak > 0 && (
        <div className={cn(
          "flex items-center justify-between px-3 py-2 rounded-xl border transition-all",
          streakTier.bgColor,
          showStreakAnim && "animate-scale-in"
        )} style={{ borderColor: `${streakTier.pillColor}30` }}>
          <div className="flex items-center gap-2">
            <span className="text-base">{streakTier.emoji}</span>
            <div>
              <span className={cn("text-xs font-bold", streakTier.color)}>{streakTier.tier}</span>
              <span className="text-[10px] text-muted-foreground ml-1.5">
                {currentStreak}d streak
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {streakTier.nextTierAt && (
              <span className="text-[10px] text-muted-foreground">
                {streakTier.nextTierAt - currentStreak}d to next tier
              </span>
            )}
            {isPerfectDay && (
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-400" /> Perfect Day
              </span>
            )}
          </div>
        </div>
      )}

      {/* Weekly Consistency */}
      {streak && streak.weeklyCompletion > 0 && weeklyLabel && (
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Weekly Consistency</span>
          <span className={cn("text-xs font-bold", weeklyLabel.color)}>
            {Math.round(streak.weeklyCompletion)}% · {weeklyLabel.label}
          </span>
        </div>
      )}

      <h2 className="text-lg font-bold text-foreground px-1">Daily Performance</h2>
      <button
        onClick={() => navigate("/client/daily-score")}
        className="w-full rounded-xl bg-black border border-white/10 p-3 flex items-center gap-3 focus:outline-none active:scale-[0.99] transition-transform"
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
          <div className="flex items-center gap-1.5">
            <span className={cn("text-sm font-bold", score.color)}>{score.label}</span>
            {isPerfectDay && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
          </div>
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
            {streak && streak.perfectDaysCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                <Trophy className="h-2.5 w-2.5" />
                {streak.perfectDaysCount}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>

      {/* Coaching message */}
      {score.coachMessage && (
        <p className="text-[11px] text-muted-foreground px-1 leading-relaxed">
          {score.coachMessage}
        </p>
      )}
    </div>
  );
}
