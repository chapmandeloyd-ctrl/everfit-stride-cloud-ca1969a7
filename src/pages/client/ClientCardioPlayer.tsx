import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { Button } from "@/components/ui/button";
import { Square, Lock, Pause, Play, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getIconComponent, DEFAULT_ACTIVITIES } from "@/components/cardio/cardioActivities";
import { CardioCelebration } from "@/components/cardio/CardioCelebration";

export default function ClientCardioPlayer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = useEffectiveClientId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const activity = searchParams.get("activity") || "general";
  const targetType = searchParams.get("targetType") || "none";
  const targetValue = searchParams.get("targetValue") || "";
  const sessionId = searchParams.get("sessionId") || "";

  // ── Persistent wall-clock timer (survives page unloads & background kills) ──
  const STORAGE_KEY = `cardio_timer_${sessionId || "tmp"}`;

  const loadPersistedState = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as { wallStart: number; accumulated: number; paused: boolean };
    } catch {}
    return null;
  }, [STORAGE_KEY]);

  const persistState = useCallback((wallStart: number, accumulated: number, paused: boolean) => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ wallStart, accumulated, paused })); } catch {}
  }, [STORAGE_KEY]);

  const saved = loadPersistedState();
  const [isPaused, setIsPaused] = useState(saved?.paused ?? false);
  const [seconds, setSeconds] = useState(() => {
    if (!saved) return 0;
    if (saved.paused) return saved.accumulated;
    return saved.accumulated + Math.floor((Date.now() - saved.wallStart) / 1000);
  });

  const [isLocked, setIsLocked] = useState(true); // locked by default
  const [isSaving, setIsSaving] = useState(false);
  const [unlockProgress, setUnlockProgress] = useState(0);
  const unlockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const UNLOCK_HOLD_MS = 3000;
  const UNLOCK_TICK = 30;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startWallRef = useRef<number>(saved?.wallStart ?? Date.now());
  const accumulatedRef = useRef<number>(saved?.accumulated ?? 0);

  // Persist on every state change
  useEffect(() => {
    persistState(startWallRef.current, accumulatedRef.current, isPaused);
  }, [isPaused, seconds, persistState]);

  // Wall-clock timer: survives background/lock screen
  useEffect(() => {
    if (!isPaused) {
      startWallRef.current = Date.now();
      persistState(startWallRef.current, accumulatedRef.current, false);
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startWallRef.current) / 1000);
        setSeconds(accumulatedRef.current + elapsed);
      }, 500);
    } else {
      accumulatedRef.current = seconds;
      persistState(startWallRef.current, accumulatedRef.current, true);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPaused]);

  // Recalculate on tab visibility change (returning from background)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !isPaused) {
        const elapsed = Math.floor((Date.now() - startWallRef.current) / 1000);
        setSeconds(accumulatedRef.current + elapsed);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isPaused]);

  // Persist before page unload (belt & suspenders)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isPaused) {
        const elapsed = Math.floor((Date.now() - startWallRef.current) / 1000);
        accumulatedRef.current += elapsed;
        startWallRef.current = Date.now();
      }
      persistState(startWallRef.current, accumulatedRef.current, isPaused);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, [isPaused, persistState]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Find the activity label/icon from defaults or use the raw id
  const defaultMatch = DEFAULT_ACTIVITIES.find(
    (a) => a.name.toLowerCase().replace(/\s+/g, "_") === activity
  );
  const activityLabel = defaultMatch?.name || activity.replace(/_/g, " ");
  const ActivityIcon = getIconComponent(defaultMatch?.icon_name || "activity");

  const [showCelebration, setShowCelebration] = useState(false);

  const formatDurationLabel = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs} h ${mins} m ${secs} s`;
  };

  const handleStop = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    try {
      if (sessionId) {
        await supabase
          .from("cardio_sessions" as any)
          .update({ status: "completed", duration_seconds: seconds, completed_at: new Date().toISOString() })
          .eq("id", sessionId);
      }
      queryClient.invalidateQueries({ queryKey: ["cardio-sessions-today"] });
      setShowCelebration(true);
    } catch {
      toast({ title: "Error saving", variant: "destructive" });
      setIsSaving(false);
    }
  }, [sessionId, seconds, isSaving]);

  const handleCelebrationComplete = useCallback(() => {
    navigate("/client/dashboard");
  }, [navigate]);

  const targetMins = targetType === "time" && targetValue ? parseFloat(targetValue) : null;
  const currentMins = seconds / 60;
  const targetReached = targetMins ? currentMins >= targetMins : false;

  if (showCelebration) {
    return (
      <CardioCelebration
        activityLabel={activityLabel}
        iconName={defaultMatch?.icon_name || "activity"}
        duration={formatDurationLabel(seconds)}
        onComplete={handleCelebrationComplete}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="text-center pt-8 pb-2">
        <p className="text-sm font-medium text-muted-foreground">Today</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-emerald-500/20">
          <ActivityIcon className="h-12 w-12 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold">{activityLabel}</h2>
        <p className="font-mono text-6xl font-bold tracking-tight tabular-nums">{formatTime(seconds)}</p>
        {targetType !== "none" && targetValue && (
          <p className={`text-sm font-semibold ${targetReached ? "text-emerald-500" : "text-muted-foreground"}`}>
            Target: {targetValue} {targetType === "distance" ? "miles" : "min"}
            {targetReached && " ✓"}
          </p>
        )}
      </div>

      {isLocked && (
        <button
          type="button"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-foreground/80 px-6 select-none"
          onMouseDown={() => {
            setUnlockProgress(0);
            let elapsed = 0;
            unlockIntervalRef.current = setInterval(() => {
              elapsed += UNLOCK_TICK;
              const pct = Math.min(elapsed / UNLOCK_HOLD_MS, 1);
              setUnlockProgress(pct);
              if (pct >= 1) {
                clearInterval(unlockIntervalRef.current!);
                unlockIntervalRef.current = null;
                setUnlockProgress(0);
                setIsLocked(false);
              }
            }, UNLOCK_TICK);
          }}
          onMouseUp={() => { if (unlockIntervalRef.current) { clearInterval(unlockIntervalRef.current); unlockIntervalRef.current = null; } setUnlockProgress(0); }}
          onMouseLeave={() => { if (unlockIntervalRef.current) { clearInterval(unlockIntervalRef.current); unlockIntervalRef.current = null; } setUnlockProgress(0); }}
          onTouchStart={() => {
            setUnlockProgress(0);
            let elapsed = 0;
            unlockIntervalRef.current = setInterval(() => {
              elapsed += UNLOCK_TICK;
              const pct = Math.min(elapsed / UNLOCK_HOLD_MS, 1);
              setUnlockProgress(pct);
              if (pct >= 1) {
                clearInterval(unlockIntervalRef.current!);
                unlockIntervalRef.current = null;
                setUnlockProgress(0);
                setIsLocked(false);
              }
            }, UNLOCK_TICK);
          }}
          onTouchEnd={() => { if (unlockIntervalRef.current) { clearInterval(unlockIntervalRef.current); unlockIntervalRef.current = null; } setUnlockProgress(0); }}
          aria-label="Hold to unlock cardio controls"
        >
          <div className="pointer-events-none text-center text-background">
            {/* Circular progress ring */}
            <div className="relative mx-auto mb-4 h-20 w-20">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="4" className="opacity-20" />
                <circle
                  cx="40" cy="40" r="34"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - unlockProgress)}`}
                  className="transition-none"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="h-7 w-7" />
              </div>
            </div>
            <p className="text-lg font-semibold">Workout Locked</p>
            <p className="mt-1 text-sm opacity-80">Hold for 3 seconds to unlock</p>
          </div>
        </button>
      )}

      <div className="border-t border-border bg-card">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-sm font-bold">{Math.round(seconds * 0.1)} Cal</p>
          </div>
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-destructive" />
            <span className="text-sm font-bold">--</span>
          </div>
        </div>
        <div className="pb-8 pt-2">
          {isLocked && <p className="pb-3 text-center text-xs font-medium text-muted-foreground">Screen locked — hold anywhere for 3s to unlock</p>}
          <div className="flex items-center justify-around px-6">
            <Button variant="outline" size="icon" className="h-14 w-14 rounded-full" onClick={handleStop} disabled={isLocked || isSaving}>
              <Square className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={`h-14 w-14 rounded-full ${isLocked ? "bg-primary text-primary-foreground" : ""}`}
              onClick={() => setIsLocked(!isLocked)}
              aria-label={isLocked ? "Unlock cardio controls" : "Lock cardio controls"}
              title={isLocked ? "Unlock cardio controls" : "Lock cardio controls"}
            >
              <Lock className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" className="h-14 w-14 rounded-full" onClick={() => setIsPaused(!isPaused)} disabled={isLocked}>
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
