import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CoachWaveform } from "@/components/workout/CoachWaveform";
import {
  buildWelcomeLine,
  buildFirstUpLine,
  canSkipIntro,
  shouldShowWaveform,
  type IntroPhase,
} from "@/lib/workoutCueTiming";

interface Exercise {
  id: string;
  exercise_name?: string;
  exercise_image?: string;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
}

interface Section {
  id: string;
  name: string;
  section_type: string;
  rounds: number;
  exercises: Exercise[];
}

interface WorkoutIntroProps {
  workoutName: string;
  sections: Section[];
  totalMinutes: number;
  totalExercises: number;
  speakFn: (text: string) => Promise<void>;
  onIntroComplete: () => void;
  onPreCacheComplete?: () => void;
  coachName?: string;
}

export function WorkoutIntro({
  workoutName,
  sections,
  totalMinutes,
  totalExercises,
  speakFn,
  onIntroComplete,
  coachName = "Coach",
}: WorkoutIntroProps) {
  const [phase, setPhase] = useState<IntroPhase>("speaking");
  const [countdown, setCountdown] = useState(3);
  const mountedRef = useRef(true);
  const hasStartedRef = useRef(false);

  // Flatten all unique exercises for the lineup
  const allExercises = sections.flatMap((s) =>
    s.exercises.map((ex) => ({
      ...ex,
      sectionName: s.name,
      sectionType: s.section_type,
    }))
  );

  const runIntro = useCallback(async () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    await speakFn(buildWelcomeLine(workoutName, totalExercises, totalMinutes));
    if (!mountedRef.current) return;
    const firstEx = allExercises[0];
    if (firstEx) {
      await speakFn(buildFirstUpLine(firstEx, sections[0]));
    }
    if (!mountedRef.current) return;
    setPhase("countdown");
    for (const value of [3, 2, 1]) {
      setCountdown(value);
      await speakFn(String(value));
      await delay(250);
      if (!mountedRef.current) return;
    }
    setPhase("go");
    await speakFn("Go!");
  }, [workoutName, totalMinutes, totalExercises, allExercises, sections, speakFn]);

  useEffect(() => {
    mountedRef.current = true;
    runIntro();
    return () => {
      mountedRef.current = false;
    };
  }, [runIntro]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
      {phase === "speaking" && (
        <div className="animate-fade-in space-y-7">
          <div className="mx-auto h-2 w-2 rounded-full bg-cue animate-pulse" />
          {shouldShowWaveform(phase, true) && <CoachWaveform />}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cue">Coach Speaking</p>
            <h1 className="mt-3 text-3xl font-black uppercase">{workoutName}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Listening to {coachName}…</p>
          </div>
        </div>
      )}
      {phase === "countdown" && (
        <div className="animate-scale-in">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.25em] text-cue">Get Ready</p>
          <div className="font-display text-9xl font-black tabular-nums text-cue drop-shadow-[0_0_28px_hsl(var(--cue)/0.7)]">{countdown}</div>
        </div>
      )}
      {phase === "go" && (
        <Button variant="ghost" onClick={onIntroComplete} className="h-auto flex-col gap-5 hover:bg-transparent">
          <span className="font-display text-9xl font-black text-cue drop-shadow-[0_0_34px_hsl(var(--cue)/0.85)] animate-pulse">GO</span>
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Tap to start</span>
        </Button>
      )}
      {canSkipIntro(phase) && (
        <Button variant="ghost" onClick={onIntroComplete} className="absolute bottom-8 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Skip Intro
        </Button>
      )}
    </div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
