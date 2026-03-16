import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Play, Pause, SkipForward, X, Volume2, VolumeX,
  ChevronLeft, ChevronRight, Timer, Dumbbell, CheckCircle2,
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

// ─── Voice Guidance (Jessica) ────────────────────────────────────────
const JESSICA_VOICE_NAME = "Samantha"; // fallback female voice

function getJessicaVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() || [];
  const preferred = ["Samantha", "Karen", "Victoria", "Google US English", "Microsoft Zira"];
  for (const name of preferred) {
    const v = voices.find((v) => v.name.includes(name) && v.lang.startsWith("en"));
    if (v) return v;
  }
  return voices.find((v) => v.lang.startsWith("en")) || null;
}

function speak(text: string, enabled: boolean) {
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
    // silently ignore speech errors
  }
}

// Audio chime for rest end
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
  } catch {
    // ignore
  }
}

export function unlockAudioForMobile() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    // also force voices to load
    window.speechSynthesis?.getVoices();
  } catch {
    // ignore
  }
}

// ─── Step Builder ────────────────────────────────────────────────────
interface Step {
  type: "exercise" | "rest";
  sectionIndex: number;
  exerciseIndex: number;
  round: number;
  setNumber: number;
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
            section,
            exercise: ex,
            durationSeconds: ex.duration_seconds || 45,
            label: `${ex.exercise_name} — Round ${r}/${section.rounds}`,
            logKey: `${sIdx}-${eIdx}-${r}-1`,
          });
          if (ex.rest_seconds && ex.rest_seconds > 0) {
            steps.push({
              type: "rest",
              sectionIndex: sIdx,
              exerciseIndex: eIdx,
              round: r,
              setNumber: 1,
              section,
              exercise: ex,
              durationSeconds: ex.rest_seconds,
              label: `Rest — ${ex.rest_seconds}s`,
              logKey: "",
            });
          }
        });
        // Rest between rounds
        if (r < (section.rounds || 1) && (section.rest_between_rounds_seconds || 0) > 0) {
          steps.push({
            type: "rest",
            sectionIndex: sIdx,
            exerciseIndex: 0,
            round: r,
            setNumber: 1,
            section,
            durationSeconds: section.rest_between_rounds_seconds || 60,
            label: `Rest between rounds — ${section.rest_between_rounds_seconds}s`,
            logKey: "",
          });
        }
      }
    } else {
      // Regular section: each exercise, each set, with rest after each set
      section.exercises.forEach((ex, eIdx) => {
        const totalSets = ex.sets || 1;
        for (let s = 1; s <= totalSets; s++) {
          steps.push({
            type: "exercise",
            sectionIndex: sIdx,
            exerciseIndex: eIdx,
            round: 1,
            setNumber: s,
            section,
            exercise: ex,
            durationSeconds: ex.duration_seconds || 45,
            label: `${ex.exercise_name} — Set ${s}/${totalSets}`,
            logKey: `${sIdx}-${eIdx}-1-${s}`,
          });
          // Auto-insert rest after each set
          const restSec = ex.rest_seconds || 60;
          if (restSec > 0 && s < totalSets) {
            steps.push({
              type: "rest",
              sectionIndex: sIdx,
              exerciseIndex: eIdx,
              round: 1,
              setNumber: s,
              section,
              exercise: ex,
              durationSeconds: restSec,
              label: `Rest — ${restSec}s`,
              logKey: "",
            });
          }
        }
      });
    }
  });
  return steps;
}

// ─── Main Component ──────────────────────────────────────────────────
export function WorkoutPlayer({ sections, onComplete, onEndEarly, onDiscard, onExit }: WorkoutPlayerProps) {
  const steps = useMemo(() => buildSteps(sections), [sections]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [setLogs, setSetLogs] = useState<Record<string, { reps: string; weight: string; completed: boolean }>>({});

  // Wall-clock timers
  const startedAtRef = useRef(new Date().toISOString());
  const sessionStartRef = useRef(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Step timer
  const stepStartRef = useRef(Date.now());
  const [stepTimeLeft, setStepTimeLeft] = useState(0);
  const stepPausedAtRef = useRef<number | null>(null);

  // Announcement guards
  const announcedStepRef = useRef(-1);
  const halfwayAnnouncedRef = useRef(false);

  const currentStep = steps[currentStepIndex] || null;
  const totalSteps = steps.length;
  const progressPct = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;

  // ── Session elapsed timer ──
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPaused) {
        setElapsedSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // ── Step timer ──
  useEffect(() => {
    if (!currentStep) return;
    stepStartRef.current = Date.now();
    stepPausedAtRef.current = null;
    setStepTimeLeft(currentStep.durationSeconds);
  }, [currentStepIndex]);

  useEffect(() => {
    if (!currentStep || isPaused) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - stepStartRef.current) / 1000);
      const remaining = Math.max(0, currentStep.durationSeconds - elapsed);
      setStepTimeLeft(remaining);

      // Auto-advance rest steps
      if (remaining <= 0 && currentStep.type === "rest") {
        playChime();
        advanceStep();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [currentStepIndex, isPaused, currentStep]);

  // ── Pause handling with wall-clock ──
  useEffect(() => {
    if (isPaused) {
      stepPausedAtRef.current = Date.now();
    } else if (stepPausedAtRef.current) {
      const pausedDuration = Date.now() - stepPausedAtRef.current;
      stepStartRef.current += pausedDuration;
      sessionStartRef.current += pausedDuration;
      stepPausedAtRef.current = null;
    }
  }, [isPaused]);

  // ── Visibility handler (background tabs) ──
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        stepPausedAtRef.current = Date.now();
      } else if (stepPausedAtRef.current && !isPaused) {
        const pausedDuration = Date.now() - stepPausedAtRef.current;
        stepStartRef.current += pausedDuration;
        sessionStartRef.current += pausedDuration;
        stepPausedAtRef.current = null;
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [isPaused]);

  // ── Voice announcements ──
  useEffect(() => {
    if (!currentStep || announcedStepRef.current === currentStepIndex) return;
    announcedStepRef.current = currentStepIndex;

    if (currentStep.type === "exercise") {
      const ex = currentStep.exercise;
      if (ex) {
        const msg = currentStepIndex === 0
          ? `Let's go! First up, ${ex.exercise_name}`
          : `Next up, ${ex.exercise_name}. Set ${currentStep.setNumber}.`;
        speak(msg, voiceEnabled);
      }
    } else {
      speak(`Rest for ${currentStep.durationSeconds} seconds`, voiceEnabled);
    }
  }, [currentStepIndex, voiceEnabled]);

  // Halfway announcement
  useEffect(() => {
    if (!halfwayAnnouncedRef.current && currentStepIndex >= Math.floor(totalSteps / 2) && totalSteps > 4) {
      halfwayAnnouncedRef.current = true;
      speak("You're halfway there! Keep it up!", voiceEnabled);
    }
  }, [currentStepIndex, totalSteps, voiceEnabled]);

  // ── Global crash protection ──
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      e.preventDefault();
      console.error("WorkoutPlayer caught unhandled rejection:", e.reason);
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  // ── Navigation ──
  const getCompletionData = useCallback((): CompletionData => ({
    setLogs,
    elapsedSeconds,
    startedAt: startedAtRef.current,
  }), [setLogs, elapsedSeconds]);

  const advanceStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      speak("Great job! Workout complete!", voiceEnabled);
      onComplete(getCompletionData());
    }
  }, [currentStepIndex, totalSteps, voiceEnabled, onComplete, getCompletionData]);

  const goBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1);
    }
  }, [currentStepIndex]);

  const handleSetLog = useCallback((key: string, field: "reps" | "weight" | "completed", value: string | boolean) => {
    setSetLogs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        reps: prev[key]?.reps || "",
        weight: prev[key]?.weight || "",
        completed: prev[key]?.completed || false,
        [field]: value,
      },
    }));
  }, []);

  const handleCompleteSet = useCallback(() => {
    if (currentStep && currentStep.type === "exercise") {
      handleSetLog(currentStep.logKey, "completed", true);
      advanceStep();
    }
  }, [currentStep, handleSetLog, advanceStep]);

  const handleEndEarly = useCallback(() => {
    speak("Ending workout early. Good effort!", voiceEnabled);
    onEndEarly(getCompletionData());
  }, [voiceEnabled, onEndEarly, getCompletionData]);

  const handleDiscard = useCallback(() => {
    window.speechSynthesis?.cancel();
    onDiscard();
  }, [onDiscard]);

  // ── Format helpers ──
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!currentStep) {
    return (
      <div className="fixed inset-0 bg-background z-[200] flex items-center justify-center">
        <p className="text-muted-foreground">No exercises to play.</p>
        <Button onClick={onExit} className="mt-4">Exit</Button>
      </div>
    );
  }

  const isRest = currentStep.type === "rest";
  const exercise = currentStep.exercise;
  const logKey = currentStep.logKey;
  const currentLog = setLogs[logKey] || { reps: "", weight: "", completed: false };

  return (
    <div className="fixed inset-0 bg-background z-[200] flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-3 border-b bg-card z-[201]">
        <Button variant="ghost" size="sm" onClick={handleDiscard} className="text-destructive gap-1">
          <X className="h-4 w-4" /> Exit
        </Button>
        <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
          <Timer className="h-4 w-4" />
          {formatTime(elapsedSeconds)}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="h-8 w-8"
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pt-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Step {currentStepIndex + 1} of {totalSteps}</span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 z-[201]">
        {isRest ? (
          /* ─── Rest Screen ─── */
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6">
            <div className="text-6xl">😮‍💨</div>
            <h2 className="text-2xl font-bold text-foreground">Rest</h2>
            <div className="text-6xl font-mono font-bold text-primary tabular-nums">
              {formatTime(stepTimeLeft)}
            </div>
            <p className="text-muted-foreground">{currentStep.label}</p>
            <Button variant="outline" onClick={advanceStep} className="gap-2">
              <SkipForward className="h-4 w-4" /> Skip Rest
            </Button>
          </div>
        ) : (
          /* ─── Exercise Screen ─── */
          <div className="space-y-4">
            {/* Exercise media */}
            {exercise?.exercise_video ? (
              <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                <video
                  src={exercise.exercise_video}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            ) : exercise?.exercise_image ? (
              <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                <img
                  src={exercise.exercise_image}
                  alt={exercise.exercise_name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-video rounded-xl bg-muted flex items-center justify-center">
                <Dumbbell className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}

            {/* Exercise info */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-foreground">{exercise?.exercise_name}</h2>
              <p className="text-primary font-semibold">{currentStep.label}</p>
              {exercise?.notes && (
                <p className="text-sm text-muted-foreground italic">{exercise.notes}</p>
              )}
              {exercise?.tempo && (
                <Badge variant="outline" className="mt-1">Tempo: {exercise.tempo}</Badge>
              )}
            </div>

            {/* Target info */}
            <div className="flex justify-center gap-4">
              {exercise?.reps && (
                <Card className="px-4 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Reps</p>
                  <p className="text-xl font-bold">{exercise.reps}</p>
                </Card>
              )}
              {exercise?.duration_seconds && exercise.duration_seconds > 0 && (
                <Card className="px-4 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-xl font-bold">{formatTime(exercise.duration_seconds)}</p>
                </Card>
              )}
              {exercise?.rest_seconds && exercise.rest_seconds > 0 && (
                <Card className="px-4 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Rest</p>
                  <p className="text-xl font-bold">{exercise.rest_seconds}s</p>
                </Card>
              )}
            </div>

            {/* Set logging */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">Log This Set</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Reps</label>
                    <Input
                      type="number"
                      placeholder={exercise?.reps || "0"}
                      value={currentLog.reps}
                      onChange={(e) => handleSetLog(logKey, "reps", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Weight (lbs)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={currentLog.weight}
                      onChange={(e) => handleSetLog(logKey, "weight", e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="completed"
                    checked={currentLog.completed}
                    onCheckedChange={(v) => handleSetLog(logKey, "completed", !!v)}
                  />
                  <label htmlFor="completed" className="text-sm">Mark as completed</label>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="border-t bg-card p-3 flex items-center justify-between gap-2 z-[201]">
        <Button variant="ghost" size="icon" onClick={goBack} disabled={currentStepIndex === 0}>
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex gap-2">
          {!isRest && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
          )}
          <Button onClick={handleCompleteSet} className="gap-2 px-6" disabled={isRest}>
            <CheckCircle2 className="h-4 w-4" />
            {currentStepIndex === totalSteps - 1 ? "Finish" : "Done → Next"}
          </Button>
        </div>

        <Button variant="ghost" size="icon" onClick={advanceStep}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* End Early Bar */}
      <div className="border-t bg-muted/50 p-2 flex justify-center z-[201]">
        <Button variant="link" size="sm" className="text-destructive" onClick={handleEndEarly}>
          End Workout Early
        </Button>
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
