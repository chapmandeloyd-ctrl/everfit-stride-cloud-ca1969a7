import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Footprints, Star, Settings, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHealthStats } from "@/hooks/useHealthData";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Daily Step Tracker — read-only card.
 * Mirrors the WaterTrackerCard animation/layout exactly.
 * Steps come from the Apple Health snapshot (useHealthStats → todaySteps).
 * No manual editing — taps refresh the snapshot.
 */

const DEFAULT_GOAL = 10_000;

const MOTIVATIONAL = [
  { threshold: 0, title: "Time to get moving!", body: "A short walk now sets the tone for the whole day." },
  { threshold: 0.25, title: "Nice start — keep stepping!", body: "Quarter of the way there. Momentum is everything." },
  { threshold: 0.5, title: "Past halfway — strong pace!", body: "You're on rhythm. A few more walks and you've got this." },
  { threshold: 0.7, title: "Closing in — keep going!", body: "You're well past halfway. Stay on your feet." },
  { threshold: 0.85, title: "Almost there — finish strong!", body: "One more loop around the block and you're done." },
  { threshold: 1, title: "Goal smashed! 🎉", body: "Every step today added up. Your body thanks you." },
];

function getMessage(progress: number) {
  let match = MOTIVATIONAL[0];
  for (const m of MOTIVATIONAL) if (progress >= m.threshold) match = m;
  return match;
}

const MARKERS = Array.from({ length: 8 }, (_, i) => i);

function SneakerIcon({ pulse }: { pulse: boolean }) {
  return (
    <div
      className={cn(
        "drop-shadow-lg transition-transform duration-300",
        pulse && "scale-110"
      )}
    >
      <svg width="56" height="44" viewBox="0 0 56 44">
        <defs>
          <linearGradient id="stepSneakerBody" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(150 70% 55%)" />
            <stop offset="100%" stopColor="hsl(150 75% 38%)" />
          </linearGradient>
        </defs>
        <path
          d="M3 32 Q3 38 9 38 H49 Q53 38 53 34 L52 30 H4 Z"
          fill="hsl(0 0% 100% / 0.95)"
          stroke="hsl(150 30% 25%)"
          strokeWidth="1.2"
        />
        <path
          d="M5 30 L5 22 Q5 16 12 14 L22 12 Q26 11 28 14 L32 19 Q34 21 38 21 L46 22 Q52 23 52 28 L52 30 Z"
          fill="url(#stepSneakerBody)"
          stroke="hsl(150 30% 20%)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M14 22 L20 18 M18 24 L24 20 M22 26 L28 22"
          stroke="hsl(0 0% 100% / 0.9)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M30 28 Q38 22 48 24"
          stroke="hsl(0 0% 100%)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

export function StepTrackerCard({ goal = DEFAULT_GOAL }: { goal?: number }) {
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const { data: stats, isLoading, isFetching } = useHealthStats(clientId ?? undefined);

  const todayKey = new Date().toISOString().slice(0, 10);
  const celebrationStorageKey = `steps-celebrated:${clientId ?? "anon"}:${todayKey}`;

  const steps = Math.max(0, Math.round(Number(stats?.todaySteps ?? 0)));
  const cappedSteps = Math.min(steps, goal);
  const progress = goal > 0 ? Math.min(cappedSteps / goal, 1) : 0;
  const percent = Math.round(progress * 100);
  const remaining = Math.max(goal - cappedSteps, 0);
  const message = useMemo(() => getMessage(progress), [progress]);

  const [celebrate, setCelebrate] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(celebrationStorageKey) === "1";
  });
  const [pulse, setPulse] = useState(false);
  const previousProgressRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(celebrationStorageKey) === "1";
    setHasCelebrated(stored);
    setCelebrate(false);
    previousProgressRef.current = progress;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrationStorageKey]);

  // Pulse the sneaker whenever step count goes up (snapshot refreshed)
  useEffect(() => {
    if (progress > previousProgressRef.current) {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 350);
    }

    const crossedIntoGoal = previousProgressRef.current < 1 && progress >= 1;
    if (crossedIntoGoal && !hasCelebrated) {
      setCelebrate(true);
      setHasCelebrated(true);
      try {
        window.localStorage.setItem(celebrationStorageKey, "1");
      } catch {
        /* noop */
      }
    }

    previousProgressRef.current = progress;
  }, [progress, hasCelebrated, celebrationStorageKey]);

  const handleRefresh = () => {
    if (!clientId) return;
    queryClient.invalidateQueries({ queryKey: ["health-stats", clientId] });
  };

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Daily Step Goal
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-95 transition-all"
            aria-label="Refresh steps from Apple Health"
            title="Refresh from Apple Health"
          >
            <RefreshCw
              className={cn(
                "h-[20px] w-[20px]",
                isFetching && "animate-spin"
              )}
              strokeWidth={1.75}
            />
          </button>
        </div>

        {/* Numeric readout */}
        <div className="text-2xl font-bold text-foreground">
          {steps.toLocaleString()}
          <span className="text-muted-foreground font-medium">
            /{goal.toLocaleString()} steps
          </span>
        </div>

        {/* Progress bar with sliding sneaker */}
        <div className="relative h-14">
          {/* Track */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 rounded-full bg-secondary/60 overflow-hidden">
            {/* Markers behind fill */}
            <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none z-0">
              {MARKERS.map((i) => {
                const isLast = i === MARKERS.length - 1;
                if (isLast) {
                  return (
                    <Star
                      key={i}
                      className="h-5 w-5 text-amber-400 fill-amber-400/80"
                    />
                  );
                }
                return (
                  <Footprints
                    key={i}
                    className="h-4 w-4 text-emerald-300/60 fill-emerald-300/30"
                  />
                );
              })}
            </div>

            {/* Fill */}
            <div
              className="relative h-full rounded-full bg-gradient-to-r from-emerald-500/85 to-emerald-400/90 transition-all duration-700 ease-out flex items-center px-3 z-10"
              style={{ width: `${Math.max(percent, 6)}%` }}
            >
              {percent > 0 && (
                <span className="text-xs font-semibold text-white drop-shadow">
                  {percent}%
                </span>
              )}
            </div>
          </div>

          {/* Sliding sneaker */}
          <div
            className="absolute top-1/2 pointer-events-none select-none"
            style={{
              left: `${Math.max(percent, 4)}%`,
              transform: "translate(-50%, -50%)",
              transition: "left 700ms ease-out",
            }}
            aria-hidden="true"
          >
            <SneakerIcon pulse={pulse} />
          </div>
        </div>

        {/* Motivation */}
        <div className="text-center space-y-1 pt-1">
          <div className="text-base font-semibold text-foreground">
            {message.title}
          </div>
          <div className="text-xs text-muted-foreground">
            {progress >= 1
              ? message.body
              : `${remaining.toLocaleString()} steps to close today's ring.`}
          </div>
        </div>

        <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60 text-center">
          {isLoading ? "Syncing…" : "Synced from Apple Health"}
        </div>

        {/* Celebration overlay */}
        {celebrate && (
          <button
            type="button"
            onClick={() => setCelebrate(false)}
            className="absolute inset-0 z-20 bg-background/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 animate-fade-in"
          >
            <div className="text-5xl mb-2">🏆</div>
            <div className="text-lg font-bold text-foreground">
              Goal smashed!
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {steps.toLocaleString()} steps logged today.
            </div>
            <div className="text-[11px] text-muted-foreground mt-4">tap to dismiss</div>
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export default StepTrackerCard;