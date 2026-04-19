import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Clock, Dumbbell, Layers } from "lucide-react";

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
}

export function WorkoutIntro({
  workoutName,
  sections,
  totalMinutes,
  totalExercises,
  speakFn,
  onIntroComplete,
  onPreCacheComplete,
}: WorkoutIntroProps) {
  const [phase, setPhase] = useState<"title" | "lineup" | "firstup">("title");
  const [revealedIdx, setRevealedIdx] = useState(-1);
  const [titleVisible, setTitleVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
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

    // Phase 1: Title reveal
    setPhase("title");
    await delay(300);
    if (!mountedRef.current) return;
    setTitleVisible(true);

    await delay(600);
    if (!mountedRef.current) return;
    setStatsVisible(true);

    // Announce welcome with full session overview (exercise count + duration)
    const exerciseWord = totalExercises === 1 ? "exercise" : "exercises";
    const minuteWord = totalMinutes === 1 ? "minute" : "minutes";
    const welcomeText = `Welcome to ${workoutName}. Today's session has ${totalExercises} ${exerciseWord} and will take about ${totalMinutes} ${minuteWord}. Let's get started.`;
    await speakFn(welcomeText);
    if (!mountedRef.current) return;

    await delay(500);
    if (!mountedRef.current) return;

    // Phase 2: Lineup reveal
    setPhase("lineup");
    await delay(400);

    // Reveal exercises one by one
    for (let i = 0; i < allExercises.length; i++) {
      if (!mountedRef.current) return;
      setRevealedIdx(i);
      // Brief pause for visual effect, don't announce each one individually
      await delay(400);
    }
    if (!mountedRef.current) return;

    await delay(300);

    // Phase 3: First up announcement
    const firstEx = allExercises[0];
    const firstSection = sections[0];
    if (firstEx) {
      setPhase("firstup");
      const blockName = firstSection?.name?.trim() || "";
      const totalRounds = firstSection?.rounds || 1;
      const totalInBlock = firstSection?.exercises?.length || 1;
      // Per-exercise: announce duration if set, otherwise reps
      const targetInfo = firstEx.duration_seconds && firstEx.duration_seconds > 0
        ? `, ${firstEx.duration_seconds} seconds`
        : firstEx.reps ? `, ${firstEx.reps} reps` : "";
      const blockAnnounce = blockName ? `${blockName}. ` : "";
      const roundAnnounce = totalRounds > 1 ? `Round 1 of ${totalRounds}. ` : "";
      const positionAnnounce = totalInBlock > 1 ? `1 of ${totalInBlock}. ` : "";
      await speakFn(
        `${blockAnnounce}${roundAnnounce}${positionAnnounce}First up, ${firstEx.exercise_name}${targetInfo}. Let's go!`
      );
    }

    if (!mountedRef.current) return;
    await delay(500);
    onIntroComplete();
  }, [workoutName, totalMinutes, totalExercises, allExercises, speakFn, onIntroComplete]);

  useEffect(() => {
    mountedRef.current = true;
    runIntro();
    return () => {
      mountedRef.current = false;
    };
  }, [runIntro]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-foreground overflow-hidden">
      {/* Title Phase */}
      <div
        className={cn(
          "flex-1 flex flex-col items-center justify-center px-6 transition-all duration-700",
          phase !== "title" && "absolute inset-0 opacity-0 pointer-events-none"
        )}
      >
        <div
          className={cn(
            "transition-all duration-700 text-center",
            titleVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          )}
        >
          <div className="text-primary text-sm font-bold uppercase tracking-[0.3em] mb-3">
            Today's Workout
          </div>
          <h1 className="text-4xl font-black text-background leading-tight mb-6">
            {workoutName}
          </h1>
        </div>

        <div
          className={cn(
            "grid grid-cols-3 gap-6 transition-all duration-700 delay-300",
            statsVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6"
          )}
        >
          <div className="text-center">
            <Clock className="h-6 w-6 mx-auto mb-1 text-primary" />
            <div className="text-2xl font-black text-background">
              {totalMinutes}
            </div>
            <div className="text-xs text-background/50 font-medium">min</div>
          </div>
          <div className="text-center">
            <Dumbbell className="h-6 w-6 mx-auto mb-1 text-primary" />
            <div className="text-2xl font-black text-background">
              {totalExercises}
            </div>
            <div className="text-xs text-background/50 font-medium">
              exercises
            </div>
          </div>
          <div className="text-center">
            <Layers className="h-6 w-6 mx-auto mb-1 text-primary" />
            <div className="text-2xl font-black text-background">
              {sections.length}
            </div>
            <div className="text-xs text-background/50 font-medium">
              sections
            </div>
          </div>
        </div>

        {/* Pulsing indicator */}
        <div className="mt-10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-background/40 font-medium">
            Preparing your workout...
          </span>
        </div>
      </div>

      {/* Lineup Phase */}
      {phase === "lineup" && (
        <div className="flex-1 flex flex-col px-5 pt-14 pb-6 overflow-hidden">
          <div className="text-center mb-6 animate-fade-in">
            <div className="text-primary text-xs font-bold uppercase tracking-[0.3em] mb-1">
              Your Lineup
            </div>
            <h2 className="text-2xl font-black text-background">
              {workoutName}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
            {allExercises.map((ex, idx) => (
              <div
                key={ex.id + idx}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border border-background/10 transition-all duration-500",
                  idx <= revealedIdx
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-8"
                )}
                style={{ transitionDelay: `${Math.min(idx * 50, 200)}ms` }}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-black text-sm flex-shrink-0">
                  {idx + 1}
                </div>
                {ex.exercise_image ? (
                  <img
                    src={ex.exercise_image}
                    alt={ex.exercise_name}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-background/10 flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="h-5 w-5 text-background/30" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-background truncate">
                    {ex.exercise_name}
                  </p>
                  <p className="text-xs text-background/50">
                    {ex.reps && `${ex.reps} reps`}
                    {ex.duration_seconds &&
                      `${ex.duration_seconds >= 60 ? `${Math.round(ex.duration_seconds / 60)}min` : `${ex.duration_seconds}s`}`}
                    {ex.sets && ex.sets > 1 && ` · ${ex.sets} sets`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* First Up Phase */}
      {phase === "firstup" && allExercises[0] && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 animate-scale-in">
          <div className="text-primary text-xs font-bold uppercase tracking-[0.3em] mb-2">
            First Up
          </div>
          <div className="text-background/50 text-sm font-semibold mb-4">
            1 of {allExercises.length}
          </div>
          {allExercises[0].exercise_image ? (
            <img
              src={allExercises[0].exercise_image}
              alt={allExercises[0].exercise_name}
              className="w-40 h-40 rounded-2xl object-cover mb-5 shadow-2xl"
            />
          ) : (
            <div className="w-40 h-40 rounded-2xl bg-background/10 flex items-center justify-center mb-5">
              <Dumbbell className="h-12 w-12 text-background/20" />
            </div>
          )}
          <h2 className="text-3xl font-black text-background text-center mb-2">
            {allExercises[0].exercise_name}
          </h2>
          <p className="text-background/50 text-sm">
            {allExercises[0].reps && `${allExercises[0].reps} reps`}
            {allExercises[0].duration_seconds &&
              `${allExercises[0].duration_seconds}s`}
          </p>
          <div className="mt-8 text-primary font-black text-xl animate-pulse">
            LET'S GO!
          </div>
        </div>
      )}
    </div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
