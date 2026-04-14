import { useEffect, useRef, useState } from "react";
import { useDailyScore } from "@/hooks/useDailyScore";
import { useConsistencyStreak } from "@/hooks/useConsistencyStreak";
import { useKsomLevelProgression } from "@/hooks/useKsomLevelProgression";
import { cn } from "@/lib/utils";
import { Flame, Trophy, Zap, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const LABEL_EMOJI: Record<string, string> = {
  "Perfect Day": "🔥",
  "Strong Day": "💪",
  "Off Track": "😐",
  "Reset Needed": "😴",
};

const RING_SIZE = 44;
const STROKE_WIDTH = 4;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DailyScoreRing() {
  const [expanded, setExpanded] = useState(false);
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
  const longestStreak = streak?.longestStreak ?? 0;
  const nextMilestone = streak?.nextMilestone;
  const level = levelData?.level ?? 1;
  const tierInfo = levelData?.tierInfo;
  const emoji = LABEL_EMOJI[score.label] ?? "⚡";

  return (
    <div className="mx-2">
      {/* Compact card face */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full rounded-2xl bg-card border border-border/50 p-3 flex items-center gap-3 focus:outline-none active:scale-[0.99] transition-transform"
      >
        {/* Emoji inside a mini progress ring */}
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
          <div className="absolute inset-0 flex items-center justify-center text-lg">
            {emoji}
          </div>
        </div>

        {/* Title + subtitle */}
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-bold", score.color)}>
              {score.label}
            </span>
            <span className={cn("text-xs font-bold tabular-nums", score.color)}>
              {score.total}
            </span>
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
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-300 flex-shrink-0",
            expanded && "rotate-90"
          )}
        />
      </button>

      {/* Expandable detail section */}
      <div className={cn(
        "grid transition-all duration-300 ease-out",
        expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}>
        <div className="overflow-hidden">
          <div className="rounded-2xl bg-card border border-border/50 mt-2 p-4 space-y-4">
            {/* Coach message */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              {score.coachMessage}
            </p>

            {/* Level progress */}
            {levelData && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground font-medium">Level {level}</span>
                  <span className="text-muted-foreground">{levelData.completionPct}% → Level {level + 1}</span>
                </div>
                <Progress value={levelData.completionPct} className="h-1.5" />
                {levelData.nextUnlock && (
                  <p className="text-[10px] text-muted-foreground">
                    Next: <span className="font-medium text-foreground">{levelData.nextUnlock}</span>
                  </p>
                )}
              </div>
            )}

            {/* Streak info */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-amber-400" />
                <span className="font-semibold text-foreground">{currentStreak} day streak</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Trophy className="h-3 w-3" />
                <span>Best: {longestStreak}</span>
              </div>
            </div>

            {nextMilestone && currentStreak < nextMilestone.days && (
              <div className="text-[11px] text-muted-foreground">
                <span className="text-amber-400 font-semibold">{nextMilestone.days - currentStreak}</span>
                {" "}day{nextMilestone.days - currentStreak !== 1 ? "s" : ""} to{" "}
                <span className="font-medium text-foreground">{nextMilestone.label}</span>
              </div>
            )}

            {/* Category breakdown bars */}
            <div className="space-y-2.5">
              {score.categories.map((cat) => (
                <div key={cat.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{cat.label}</span>
                    <span className={cn(
                      "text-[10px] font-bold tabular-nums",
                      cat.score >= 80 ? "text-emerald-400" :
                      cat.score >= 50 ? "text-amber-400" : "text-red-400"
                    )}>
                      {cat.score}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
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
          </div>
        </div>
      </div>
    </div>
  );
}
