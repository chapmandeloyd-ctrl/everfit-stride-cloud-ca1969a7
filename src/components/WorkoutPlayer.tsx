import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  X, SkipForward, ChevronLeft, Lock,
  Dumbbell, Pause, Play,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────
interface Exercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_image?: string;
  exercise_video?: string;
  exercise_description?: string;
  sets: number;
  reps: string;
  duration_seconds: number;
  rest_seconds: number;
  tempo: string;
  notes: string;
}

interface Section {
  id: string;
  name: string;
  section_type: string;
  rounds: number;
  work_seconds?: number;
  rest_seconds?: number;
  rest_between_rounds_seconds?: number;
  notes: string;
  exercises: Exercise[];
}

interface CompletionData {
  setLogs: Record<string, { reps: string; weight: string; completed: boolean }>;
  elapsedSeconds: number;
  startedAt: string;
}

interface WorkoutPlayerProps {
  sections: Section[];
  onComplete: (data: CompletionData) => void;
  onEndEarly: (data: CompletionData) => void;
  onDiscard: () => void;
  onExit: () => void;
}

// ─── Voice System ────────────────────────────────────────────────────
function getJessicaVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() || [];
  const preferred = ["Samantha", "Karen", "Victoria", "Google US English", "Microsoft Zira"];
  for (const name of preferred) {
    const v = voices.find((v) => v.name.includes(name) && v.lang.startsWith("en"));
    if (v) return v;
  }
  return voices.find((v) => v.lang.startsWith("en")) || null;
}

function jessicaSpeak(text: string, enabled: boolean) {
  if (!enabled || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const voice = getJessicaVoice();
    if (voice) utt.voice = voice;
    utt.rate = 1.0;
    utt.pitch = 1.1;
    utt.volume = 0.9;
    window.speechSynthesis.speak(utt);
  } catch {
    // silently ignore
  }
}

function defaultSpeak(text: string, enabled: boolean) {
  if (!enabled || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.9;
    utt.pitch = 0.8;
    utt.volume = 1.0;
    window.speechSynthesis.speak(utt);
  } catch {
    // silently ignore
  }
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

export function unlockAudioForMobile() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    window.speechSynthesis?.getVoices();
  } catch {}
}

// ─── Step Builder ────────────────────────────────────────────────────
interface Step {
  type: "exercise" | "rest";
  sectionIndex: number;
  exerciseIndex: number;
  round: number;
  setNumber: number;
  totalSets: number;
  section: Section;
  exercise?: Exercise;
  durationSeconds: number;
  label: string;
  logKey: string;
}

function buildSteps(sections: Section[]): Step[] {
  const steps: Step[] = [];
  sections.forEach((section, sIdx) => {
    const isGrouped = ["superset", "circuit"].includes(section.section_type);

    if (isGrouped) {
      for (let r = 1; r <= (section.rounds || 1); r++) {
        section.exercises.forEach((ex, eIdx) => {
          steps.push({
            type: "exercise",
            sectionIndex: sIdx,
            exerciseIndex: eIdx,
            round: r,
            setNumber: 1,
            totalSets: section.rounds || 1,
            section,
            exercise: ex,
            durationSeconds: ex.duration_seconds || 45,
            label: `${ex.exercise_name}`,
            logKey: `${sIdx}-${eIdx}-${r}-1`,
          });
          if (ex.rest_seconds && ex.rest_seconds > 0) {
            steps.push({
              type: "rest",
              sectionIndex: sIdx,
              exerciseIndex: eIdx,
              round: r,
              setNumber: 1,
              totalSets: section.rounds || 1,
              section,
              exercise: ex,
              durationSeconds: ex.rest_seconds,
              label: `Rest`,
              logKey: "",
            });
          }
        });
        if (r < (section.rounds || 1) && (section.rest_between_rounds_seconds || 0) > 0) {
          steps.push({
            type: "rest",
            sectionIndex: sIdx,
            exerciseIndex: 0,
            round: r,
            setNumber: 1,
            totalSets: section.rounds || 1,
            section,
            durationSeconds: section.rest_between_rounds_seconds || 60,
            label: `Rest between rounds`,
            logKey: "",
          });
        }
      }
    } else {
      section.exercises.forEach((ex, eIdx) => {
        const totalSets = ex.sets || 1;
        for (let s = 1; s <= totalSets; s++) {
          steps.push({
            type: "exercise",
            sectionIndex: sIdx,
            exerciseIndex: eIdx,
            round: 1,
            setNumber: s,
            totalSets,
            section,
            exercise: ex,
            durationSeconds: ex.duration_seconds || 45,
            label: `${ex.exercise_name}`,
            logKey: `${sIdx}-${eIdx}-1-${s}`,
          });
          const restSec = ex.rest_seconds || 60;
          if (restSec > 0 && s < totalSets) {
            steps.push({
              type: "rest",
              sectionIndex: sIdx,
              exerciseIndex: eIdx,
              round: 1,
              setNumber: s,
              totalSets,
              section,
              exercise: ex,
              durationSeconds: restSec,
              label: `Rest`,
              logKey: "",
            });
          }
        }
      });
    }
  });
  return steps;
}

// ─── Circular Timer ──────────────────────────────────────────────────
function CircularTimer({ timeLeft, totalTime, size = "lg" }: { timeLeft: number; totalTime: number; size?: "sm" | "lg" }) {
  const pct = totalTime > 0 ? (timeLeft / totalTime) : 1;
  const isLg = size === "lg";
  const dim = isLg ? 200 : 72;
  const stroke = isLg ? 8 : 5;
  const r = (dim - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div className="relative" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx={dim / 2} cy={dim / 2} r={r} fill="none"
          stroke="hsl(0 72% 51%)" strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold tabular-nums ${isLg ? "text-5xl" : "text-xl"}`}>{timeLeft}</span>
        <span className={`text-muted-foreground ${isLg ? "text-sm" : "text-[10px]"}`}>sec</span>
      </div>
    </div>
  );
}

// ─── Phase type ──────────────────────────────────────────────────────
type Phase = "countdown" | "playing" | "endDialog";

// ─── Main Component ──────────────────────────────────────────────────
export function WorkoutPlayer({ sections, onComplete, onEndEarly, onDiscard, onExit }: WorkoutPlayerProps) {
  const steps = useMemo(() => buildSteps(sections), [sections]);
  const [phase, setPhase] = useState<Phase>("countdown");
  const [countdownNum, setCountdownNum] = useState(3);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [setLogs, setSetLogs] = useState<Record<string, { reps: string; weight: string; completed: boolean }>>({});
  const [showEndDialog, setShowEndDialog] = useState(false);

  // Timers
  const startedAtRef = useRef(new Date().toISOString());
  const sessionStartRef = useRef(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const stepStartRef = useRef(Date.now());
  const [stepTimeLeft, setStepTimeLeft] = useState(0);
  const stepTotalRef = useRef(0);
  const stepPausedAtRef = useRef<number | null>(null);

  // Announcement guards
  const announcedStepRef = useRef(-1);
  const halfwayAnnouncedRef = useRef(false);
  const countdownAnnouncedRef = useRef<Set<number>>(new Set());

  const currentStep = steps[currentStepIndex] || null;
  const totalSteps = steps.length;
  const exerciseSteps = steps.filter(s => s.type === "exercise");
  const completedExerciseSteps = steps.slice(0, currentStepIndex).filter(s => s.type === "exercise").length;
  const totalExerciseSets = exerciseSteps.length;
  const progressPct = totalExerciseSets > 0 ? (completedExerciseSteps / totalExerciseSets) * 100 : 0;

  // Estimated remaining time
  const remainingSteps = steps.slice(currentStepIndex);
  const remainingSeconds = remainingSteps.reduce((sum, s) => sum + s.durationSeconds, 0);

  // Rough calorie estimate (5 cal/min active)
  const activeCal = Math.round(elapsedSeconds / 60 * 5);

  // ── Get next step info ──
  const nextStep = currentStepIndex < totalSteps - 1 ? steps[currentStepIndex + 1] : null;

  // ── Intro Countdown ──
  useEffect(() => {
    if (phase !== "countdown") return;

    // Announce "Ready" then count
    if (countdownNum === 3) {
      jessicaSpeak("Ready", voiceEnabled);
    }

    const timer = setTimeout(() => {
      if (countdownNum > 1) {
        defaultSpeak(String(countdownNum - 1), voiceEnabled);
        setCountdownNum(c => c - 1);
      } else {
        // Start workout
        sessionStartRef.current = Date.now();
        startedAtRef.current = new Date().toISOString();
        setPhase("playing");
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [phase, countdownNum, voiceEnabled]);

  // ── Session elapsed timer ──
  useEffect(() => {
    if (phase !== "playing") return;
    const interval = setInterval(() => {
      if (!isPaused) {
        setElapsedSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, phase]);

  // ── Step timer init ──
  useEffect(() => {
    if (phase !== "playing" || !currentStep) return;
    stepStartRef.current = Date.now();
    stepPausedAtRef.current = null;
    stepTotalRef.current = currentStep.durationSeconds;
    setStepTimeLeft(currentStep.durationSeconds);
    countdownAnnouncedRef.current = new Set();
  }, [currentStepIndex, phase]);

  // ── Step timer tick ──
  useEffect(() => {
    if (phase !== "playing" || !currentStep || isPaused) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - stepStartRef.current) / 1000);
      const remaining = Math.max(0, currentStep.durationSeconds - elapsed);
      setStepTimeLeft(remaining);

      // Default countdown at 3, 2, 1
      if (remaining <= 3 && remaining > 0 && !countdownAnnouncedRef.current.has(remaining)) {
        countdownAnnouncedRef.current.add(remaining);
        defaultSpeak(String(remaining), voiceEnabled);
      }

      // Auto-advance rest steps when done
      if (remaining <= 0 && currentStep.type === "rest") {
        playChime();
        advanceStep();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [currentStepIndex, isPaused, currentStep, phase, voiceEnabled]);

  // ── Pause handling ──
  useEffect(() => {
    if (isPaused) {
      stepPausedAtRef.current = Date.now();
    } else if (stepPausedAtRef.current) {
      const d = Date.now() - stepPausedAtRef.current;
      stepStartRef.current += d;
      sessionStartRef.current += d;
      stepPausedAtRef.current = null;
    }
  }, [isPaused]);

  // ── Visibility handler ──
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        stepPausedAtRef.current = Date.now();
      } else if (stepPausedAtRef.current && !isPaused) {
        const d = Date.now() - stepPausedAtRef.current;
        stepStartRef.current += d;
        sessionStartRef.current += d;
        stepPausedAtRef.current = null;
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [isPaused]);

  // ── Jessica voice announcements ──
  useEffect(() => {
    if (phase !== "playing" || !currentStep || announcedStepRef.current === currentStepIndex) return;
    announcedStepRef.current = currentStepIndex;

    // Small delay to let default countdown finish
    setTimeout(() => {
      if (currentStep.type === "exercise" && currentStep.exercise) {
        const ex = currentStep.exercise;
        const isGrouped = ["superset", "circuit"].includes(currentStep.section.section_type);
        let msg: string;
        if (currentStepIndex === 0) {
          msg = `Let's go! First up, ${ex.exercise_name}`;
        } else if (isGrouped) {
          msg = `${ex.exercise_name}. Round ${currentStep.round} of ${currentStep.section.rounds}`;
        } else {
          msg = `${ex.exercise_name}. Set ${currentStep.setNumber} of ${currentStep.totalSets}`;
        }
        jessicaSpeak(msg, voiceEnabled);
      } else {
        jessicaSpeak(`Rest, ${currentStep.durationSeconds} seconds`, voiceEnabled);
      }
    }, 200);
  }, [currentStepIndex, voiceEnabled, phase]);

  // ── Halfway announcement ──
  useEffect(() => {
    if (!halfwayAnnouncedRef.current && completedExerciseSteps >= Math.floor(totalExerciseSets / 2) && totalExerciseSets > 4) {
      halfwayAnnouncedRef.current = true;
      setTimeout(() => jessicaSpeak("Halfway there! Keep going!", voiceEnabled), 500);
    }
  }, [completedExerciseSteps, totalExerciseSets, voiceEnabled]);

  // ── Crash protection ──
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      e.preventDefault();
      console.error("WorkoutPlayer caught:", e.reason);
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  // ── Navigation ──
  const getCompletionData = useCallback((): CompletionData => ({
    setLogs, elapsedSeconds, startedAt: startedAtRef.current,
  }), [setLogs, elapsedSeconds]);

  const advanceStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(i => i + 1);
    } else {
      jessicaSpeak("Great job! Workout complete!", voiceEnabled);
      onComplete(getCompletionData());
    }
  }, [currentStepIndex, totalSteps, voiceEnabled, onComplete, getCompletionData]);

  const goBack = useCallback(() => {
    if (currentStepIndex > 0) setCurrentStepIndex(i => i - 1);
  }, [currentStepIndex]);

  const handleSetLog = useCallback((key: string, field: "reps" | "weight" | "completed", value: string | boolean) => {
    setSetLogs(prev => ({
      ...prev,
      [key]: { reps: prev[key]?.reps || "", weight: prev[key]?.weight || "", completed: prev[key]?.completed || false, [field]: value },
    }));
  }, []);

  const handleSaveSet = useCallback(() => {
    if (currentStep?.type === "exercise") {
      handleSetLog(currentStep.logKey, "completed", true);
      advanceStep();
    }
  }, [currentStep, handleSetLog, advanceStep]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // ── Countdown Screen ──
  if (phase === "countdown") {
    return (
      <div className="fixed inset-0 bg-[hsl(240_6%_15%)] z-[200] flex items-center justify-center">
        <span className="text-white text-8xl font-black tabular-nums animate-pulse">{countdownNum}</span>
      </div>
    );
  }

  // ── End Workout Dialog ──
  if (showEndDialog) {
    return (
      <div className="fixed inset-0 bg-background z-[200] flex flex-col">
        {/* Keep player visible behind */}
        <div className="flex-1" />
        <div className="bg-background p-6 space-y-4 text-center">
          <h2 className="text-2xl font-bold">End Workout?</h2>
          <p className="text-muted-foreground">What would you like to do with this session?</p>
          <Button
            className="w-full h-14 text-lg font-semibold bg-[hsl(0_72%_51%)] hover:bg-[hsl(0_72%_45%)] text-white"
            onClick={() => { jessicaSpeak("Good effort!", voiceEnabled); onEndEarly(getCompletionData()); }}
          >
            Save & End
          </Button>
          <Button
            className="w-full h-14 text-lg font-semibold bg-[hsl(0_72%_51%)] hover:bg-[hsl(0_72%_45%)] text-white"
            onClick={() => { window.speechSynthesis?.cancel(); onDiscard(); }}
          >
            Discard
          </Button>
          <Button variant="outline" className="w-full h-14 text-lg font-semibold border-2 border-[hsl(0_72%_51%)]" onClick={() => setShowEndDialog(false)}>
            Keep Going
          </Button>
        </div>
      </div>
    );
  }

  if (!currentStep) {
    return (
      <div className="fixed inset-0 bg-background z-[200] flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">No exercises to play.</p>
        <Button onClick={onExit}>Exit</Button>
      </div>
    );
  }

  const isRest = currentStep.type === "rest";
  const exercise = currentStep.exercise;
  const logKey = currentStep.logKey;
  const currentLog = setLogs[logKey] || { reps: "", weight: "", completed: false };
  const isGrouped = ["superset", "circuit"].includes(currentStep.section.section_type);

  return (
    <div className="fixed inset-0 bg-background z-[200] flex flex-col overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <button onClick={() => setShowEndDialog(true)} className="flex items-center gap-1 text-sm font-medium text-foreground">
          <X className="h-4 w-4" /> Cancel
        </button>
        {isGrouped && (
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {currentStep.section.section_type.toUpperCase()}
            </p>
            <p className="text-sm font-bold">Round {currentStep.round} of {currentStep.section.rounds}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={() => setIsPaused(!isPaused)} className="p-1">
            {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </button>
          <Button size="sm" className="bg-[hsl(0_72%_51%)] hover:bg-[hsl(0_72%_45%)] text-white font-semibold px-4"
            onClick={() => { jessicaSpeak("Good effort!", voiceEnabled); onEndEarly(getCompletionData()); }}>
            Save
          </Button>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-4 border-b bg-card">
        <div className="text-center py-2 border-r">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Time</p>
          <p className="text-lg font-bold tabular-nums">{formatTime(elapsedSeconds)}</p>
        </div>
        <div className="text-center py-2 border-r">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {isGrouped ? "Remaining" : "Sets"}
          </p>
          <p className="text-lg font-bold tabular-nums">
            {isGrouped ? formatTime(remainingSeconds) : `${completedExerciseSteps + 1}/${totalExerciseSets}`}
          </p>
        </div>
        <div className="text-center py-2 border-r">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {isGrouped ? "Cal" : "Active"}
          </p>
          <p className="text-lg font-bold tabular-nums">{activeCal} Cal</p>
        </div>
        <div className="text-center py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Progress</p>
          <p className="text-lg font-bold tabular-nums">{Math.round(progressPct)}%</p>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto">
        {isRest ? (
          /* ─── Rest Screen ─── */
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 p-6">
            <CircularTimer timeLeft={stepTimeLeft} totalTime={stepTotalRef.current} size="lg" />
            <h2 className="text-3xl font-black">Rest</h2>
            {nextStep?.exercise && (
              <p className="text-muted-foreground">Up next: {nextStep.exercise.exercise_name}</p>
            )}
            <Button variant="outline" onClick={advanceStep} className="gap-2 px-8">
              Skip Rest
            </Button>
          </div>
        ) : (
          /* ─── Exercise Screen ─── */
          <div className="flex flex-col">
            {/* Section label */}
            {currentStep.section.name && (
              <div className="px-4 py-2 bg-muted/50 border-l-4 border-[hsl(0_72%_51%)]">
                <p className="text-sm font-semibold">{currentStep.section.name}</p>
              </div>
            )}

            {/* Video / Image with timer overlay */}
            <div className="relative">
              {exercise?.exercise_video ? (
                <div className="aspect-video bg-muted">
                  <video src={exercise.exercise_video} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                </div>
              ) : exercise?.exercise_image ? (
                <div className="aspect-video bg-muted">
                  <img src={exercise.exercise_image} alt={exercise.exercise_name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <Dumbbell className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}
              {/* Timer overlay */}
              <div className="absolute top-3 right-3">
                <CircularTimer timeLeft={stepTimeLeft} totalTime={stepTotalRef.current} size="sm" />
              </div>
            </div>

            {/* Exercise name */}
            <div className="px-4 pt-3 pb-2">
              <h2 className="text-2xl font-black">{exercise?.exercise_name}</h2>
            </div>

            {/* Log inputs for gym mode */}
            <div className="px-4 pb-3 space-y-3">
              <Card className="p-4 border-l-4 border-[hsl(0_72%_51%)]">
                <div className="flex items-center gap-3 mb-3">
                  {exercise?.exercise_image && (
                    <img src={exercise.exercise_image} alt="" className="w-12 h-12 rounded object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{exercise?.exercise_name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {exercise?.notes?.toLowerCase().includes("band") ? "Band Level" : "Previous"}
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">—</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Reps</label>
                    <Input
                      type="number"
                      placeholder={exercise?.reps || "0"}
                      value={currentLog.reps}
                      onChange={(e) => handleSetLog(logKey, "reps", e.target.value)}
                      className="mt-1 text-center text-lg font-bold h-10"
                    />
                  </div>
                </div>
                {exercise?.notes && (
                  <p className="text-sm italic text-muted-foreground mt-2">{exercise.notes}</p>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ── Up Next Preview ── */}
        {!isRest && nextStep && (
          <div className="px-4 pb-4">
            <Card className="p-3 flex items-center gap-3 bg-muted/30">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                {nextStep.type === "rest" ? "R" : nextStep.exercise?.exercise_name?.charAt(0) || "?"}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Up Next</p>
                <p className="font-semibold text-sm">
                  {nextStep.type === "rest" ? "Rest" : nextStep.exercise?.exercise_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {nextStep.type === "rest" ? `${nextStep.durationSeconds}s` : `Set ${nextStep.setNumber}/${nextStep.totalSets}`}
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ── Bottom Controls ── */}
      <div className="border-t bg-card">
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          <Button variant="ghost" size="icon" onClick={goBack} disabled={currentStepIndex === 0} className="shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            className="flex-1 h-12 text-lg font-bold bg-[hsl(0_72%_51%)] hover:bg-[hsl(0_72%_45%)] text-white gap-2"
            onClick={isRest ? advanceStep : handleSaveSet}
          >
            {isRest ? (
              <>
                <SkipForward className="h-5 w-5" />
                Skip Rest
              </>
            ) : (
              currentStepIndex === totalSteps - 1 ? "Finish ✓" : "Save Set ✓"
            )}
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Lock className="h-5 w-5" />
          </Button>
        </div>
        {/* End Workout link */}
        <div className="flex items-center justify-center gap-2 pb-3 pt-0">
          <Checkbox id="end-workout" checked={false} onCheckedChange={() => setShowEndDialog(true)} />
          <label htmlFor="end-workout" className="text-sm text-[hsl(0_72%_51%)] cursor-pointer">End Workout</label>
        </div>
      </div>
    </div>
  );
}

// Provider and hook exports for compatibility
export function WorkoutPlayerProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useWorkoutPlayer() {
  return { isPlaying: false, start: () => {}, stop: () => {} };
}
