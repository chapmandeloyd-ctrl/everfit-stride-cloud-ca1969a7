import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Square, Lock, Play, Pause, SkipBack, SkipForward, Heart, MoreVertical, Timer } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ExerciseSwapDialog } from "@/components/ExerciseSwapDialog";
import { cn } from "@/lib/utils";
import { WorkoutIntro } from "@/components/WorkoutIntro";
import { useLiveActivity } from "@/hooks/useLiveActivity";

interface Exercise {
  id: string;
  exercise_id: string;
  exercise_name?: string;
  exercise_image?: string;
  exercise_video?: string;
  exercise_description?: string;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  tempo: string;
  notes: string;
  weight_lbs?: number | null;
  rpe?: number | null;
  distance?: string | null;
  band?: string | null;
  is_unilateral?: boolean | null;
}

// Detect single-side / unilateral exercises by name keywords (fallback when no flag set)
function isUnilateralByName(name?: string): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  const keywords = [
    "single-arm", "single arm", "one-arm", "one arm",
    "single-leg", "single leg", "one-leg", "one leg",
    "unilateral", "split squat", "bulgarian", "pistol",
    "suitcase", "offset", "staggered",
    " right ", " left ", "right side", "left side",
  ];
  const padded = ` ${n} `;
  return keywords.some((k) => padded.includes(k));
}

function isUnilateralExercise(ex?: Exercise | null): boolean {
  if (!ex) return false;
  if (ex.is_unilateral) return true;
  return isUnilateralByName(ex.exercise_name);
}

interface Section {
  id: string;
  name: string;
  section_type: string;
  rounds: number;
  work_seconds: number | null;
  rest_seconds: number | null;
  rest_between_rounds_seconds: number | null;
  notes: string;
  exercises: Exercise[];
}

interface SetLog {
  reps: string;
  weight: string;
  completed: boolean;
}

interface WorkoutPlayerProps {
  workoutName?: string;
  sections: Section[];
  onComplete: (data: { setLogs: Record<string, SetLog>; elapsedSeconds: number; startedAt: string }) => void;
  onEndEarly: (data: { setLogs: Record<string, SetLog>; elapsedSeconds: number; startedAt: string }) => void;
  onDiscard: () => void;
  onExit: () => void;
  onSaveForLater?: (data: { setLogs: Record<string, SetLog>; elapsedSeconds: number; startedAt: string; stepIdx: number; completionPercent: number }) => void;
  onProgressSave?: (data: { setLogs: Record<string, SetLog>; elapsedSeconds: number; startedAt: string; stepIdx: number; completionPercent: number }) => void;
  resumeFromStep?: number;
  resumeSetLogs?: Record<string, SetLog>;
  resumeElapsed?: number;
  activeSessionId?: string | null;
  dbStartedAt?: string | null;
}

interface WorkoutStep {
  type: "exercise" | "rest";
  sectionIdx: number;
  exerciseIdx: number;
  round: number;
  exercise?: Exercise;
  restSeconds?: number;
  label?: string;
  setKey?: string;
  isCircuit: boolean;
}

function buildSteps(sections: Section[]): WorkoutStep[] {
  const steps: WorkoutStep[] = [];
  sections.forEach((section, sIdx) => {
    const isGrouped = ["superset", "circuit"].includes(section.section_type);
    if (isGrouped) {
      for (let round = 1; round <= section.rounds; round++) {
        section.exercises.forEach((ex, eIdx) => {
          steps.push({
            type: "exercise",
            sectionIdx: sIdx,
            exerciseIdx: eIdx,
            round,
            exercise: ex,
            isCircuit: true,
            setKey: `${sIdx}-${eIdx}-${round}-1`,
          });
          // Add rest between exercises within a round (only for non-last exercises)
          const exRest = ex.rest_seconds || 0;
          if (exRest > 0 && eIdx < section.exercises.length - 1) {
            steps.push({
              type: "rest",
              sectionIdx: sIdx,
              exerciseIdx: eIdx,
              round,
              restSeconds: exRest,
              label: `Rest for ${exRest}s`,
              isCircuit: true,
            });
          }
        });
        if (round < section.rounds) {
          // Prefer explicit between-rounds rest, then fall back to last exercise's rest_seconds, then section rest, then 60s
          const lastExRest = section.exercises[section.exercises.length - 1]?.rest_seconds || 0;
          const restSec = section.rest_between_rounds_seconds || lastExRest || section.rest_seconds || 60;
          steps.push({
            type: "rest",
            sectionIdx: sIdx,
            exerciseIdx: 0,
            round,
            restSeconds: restSec,
            label: `Rest between rounds ${restSec}s`,
            isCircuit: true,
          });
        }
      }
    } else {
      section.exercises.forEach((ex, eIdx) => {
        const totalSets = ex.sets || 1;
        for (let s = 1; s <= totalSets; s++) {
          steps.push({
            type: "exercise",
            sectionIdx: sIdx,
            exerciseIdx: eIdx,
            round: s,
            exercise: ex,
            isCircuit: false,
            setKey: `${sIdx}-${eIdx}-1-${s}`,
          });
          if (s < totalSets && (ex.rest_seconds || 0) > 0) {
            steps.push({
              type: "rest",
              sectionIdx: sIdx,
              exerciseIdx: eIdx,
              round: s,
              restSeconds: ex.rest_seconds || 60,
              label: `Rest for ${ex.rest_seconds || 60}s`,
              isCircuit: false,
            });
          }
        }
      });
    }
  });
  return steps;
}

// ── Single-channel speech system ──────────────────────────────────────────────
// Only one audio source plays at a time. cancelSpeech() stops everything.
// A persistent Audio element is used so it can be "unlocked" on mobile via a
// user-gesture tap, then reused for all subsequent programmatic playback.
let persistentAudio: HTMLAudioElement | null = null;
let activeAudio: HTMLAudioElement | null = null;
let speechAbortController: AbortController | null = null;

// Web Audio routing — lets us amplify TTS output above 1.0 (HTMLAudioElement
// caps at volume=1, which is too quiet on iOS where media volume is separate
// from ringer volume). GainNode boosts perceived loudness ~2x.
const VOICE_GAIN = 2.2;
let voiceAudioCtx: AudioContext | null = null;
let voiceSourceNode: MediaElementAudioSourceNode | null = null;
let voiceGainNode: GainNode | null = null;

function ensureVoiceAudioGraph(audio: HTMLAudioElement) {
  try {
    if (!voiceAudioCtx) {
      voiceAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (voiceAudioCtx.state === "suspended") {
      voiceAudioCtx.resume().catch(() => {});
    }
    if (!voiceSourceNode) {
      voiceSourceNode = voiceAudioCtx.createMediaElementSource(audio);
      voiceGainNode = voiceAudioCtx.createGain();
      voiceGainNode.gain.value = VOICE_GAIN;
      voiceSourceNode.connect(voiceGainNode);
      voiceGainNode.connect(voiceAudioCtx.destination);
    }
  } catch {
    // MediaElementSource can only be created once per element — ignore re-attach errors
  }
}

/**
 * Call once inside a click/tap handler (e.g. "Start Workout") to unlock audio
 * playback on iOS / Android browsers that require a user-gesture.
 */
function unlockAudioForMobile() {
  if (!persistentAudio) {
    persistentAudio = new Audio();
    persistentAudio.crossOrigin = "anonymous";
  }
  // A silent play+pause satisfies the user-gesture requirement
  persistentAudio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
  persistentAudio.volume = 1;
  persistentAudio.play().then(() => persistentAudio?.pause()).catch(() => {});
  // Build the Web Audio graph during the user gesture too
  if (persistentAudio) ensureVoiceAudioGraph(persistentAudio);
}

function cancelSpeech() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (speechAbortController) {
    speechAbortController.abort();
    speechAbortController = null;
  }
}

// Pre-cached audio clips for countdown (filled at intro time)
const preCachedClips: Record<string, string> = {};

async function preCacheCountdownClips() {
  const clips = ["Three", "Two", "One", "Go!"];
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  await Promise.all(
    clips.map(async (text) => {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ text, voiceId: selectedVoiceId }),
        });
        if (response.ok) {
          const blob = await response.blob();
          preCachedClips[text] = URL.createObjectURL(blob);
        }
      } catch {}
    })
  );
}

// Play a pre-cached clip instantly, or fall back to ElevenLabs live
async function playClip(text: string): Promise<void> {
  cancelSpeech();
  const cachedUrl = preCachedClips[text];
  if (cachedUrl) {
    const audio = persistentAudio || new Audio();
    audio.volume = 1;
    audio.src = cachedUrl;
    activeAudio = audio;
    ensureVoiceAudioGraph(audio);
    if (voiceAudioCtx?.state === "suspended") voiceAudioCtx.resume().catch(() => {});
    return new Promise((resolve) => {
      audio.onended = () => { if (activeAudio === audio) activeAudio = null; resolve(); };
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
  }
  // Fallback to live ElevenLabs
  return elevenLabsSpeakNow(text);
}

// ElevenLabs TTS — for exercise names and motivational cues (high quality)
// Uses the persistent Audio element so mobile browsers allow playback.
// Current selected voice ID — set before workout starts
let selectedVoiceId: string = "cgSgspJ2msm6clMCkdW9"; // default Jessica

export const WORKOUT_VOICES = [
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", desc: "Warm & Energetic", icon: "🔥" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", desc: "Calm & Encouraging", icon: "🧘" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", desc: "Strong & Commanding", icon: "💪" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", desc: "Friendly & Motivating", icon: "⚡" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", desc: "Gentle & Supportive", icon: "🌸" },
] as const;

export function setWorkoutVoice(voiceId: string) {
  selectedVoiceId = voiceId;
}

async function elevenLabsSpeakNow(text: string): Promise<void> {
  cancelSpeech();
  const controller = new AbortController();
  speechAbortController = controller;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ text, voiceId: selectedVoiceId }),
      signal: controller.signal,
    });
  } catch {
    if (!controller.signal.aborted) console.warn("ElevenLabs TTS failed, no fallback");
    return;
  }
  if (!response.ok || controller.signal.aborted) return;
  const blob = await response.blob();
  if (controller.signal.aborted) return;
  const url = URL.createObjectURL(blob);

  // Reuse persistent audio element (already unlocked via user gesture)
  const audio = persistentAudio || new Audio();
  audio.volume = 1;
  audio.src = url;
  activeAudio = audio;
  ensureVoiceAudioGraph(audio);
  if (voiceAudioCtx?.state === "suspended") voiceAudioCtx.resume().catch(() => {});
  speechAbortController = null;
  return new Promise((resolve) => {
    audio.onended = () => { URL.revokeObjectURL(url); if (activeAudio === audio) activeAudio = null; resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    audio.play().catch(() => {
      URL.revokeObjectURL(url);
      resolve();
    });
  });
}
export { unlockAudioForMobile };
// ─────────────────────────────────────────────────────────────────────────────

function WorkoutCompleteScreen({ workoutName, onSave }: { workoutName?: string; onSave: () => void }) {
  useEffect(() => {
    const name = workoutName || "your workout";
    elevenLabsSpeakNow(`Great job! You completed ${name}. Click the save button below to view your stats.`).catch(() => {});
    return () => { cancelSpeech(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background gap-3 px-6">
      <h2 className="text-2xl font-bold text-center">Great job! You completed{workoutName ? ` ${workoutName}` : " your workout"} 🎉</h2>
      <p className="text-sm text-muted-foreground text-center">Click Save Workout to view your stats</p>
      <Button size="lg" className="w-full mt-3" onClick={onSave}>Save Workout</Button>
    </div>
  );
}

export function WorkoutPlayer({ workoutName, sections, onComplete, onEndEarly, onDiscard, onExit, onSaveForLater, onProgressSave, resumeFromStep, resumeSetLogs, resumeElapsed, activeSessionId, dbStartedAt }: WorkoutPlayerProps) {
  const { toast } = useToast();
  const liveActivity = useLiveActivity();
  const startedAtRef = useRef(dbStartedAt ?? new Date().toISOString());
  const [setLogs, setSetLogs] = useState<Record<string, SetLog>>(resumeSetLogs || {});
  const [isLocked, setIsLocked] = useState(false);

  // Unlock audio on mount + first user interaction (mobile Safari/Chrome requirement)
  useEffect(() => {
    unlockAudioForMobile();
    const unlock = () => { unlockAudioForMobile(); document.removeEventListener("touchstart", unlock); document.removeEventListener("click", unlock); };
    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("click", unlock, { once: true });
    return () => { document.removeEventListener("touchstart", unlock); document.removeEventListener("click", unlock); };
  }, []);

  const [phase, setPhase] = useState<"voiceselect" | "intro" | "welcomeback" | "playing">(resumeFromStep !== undefined ? "welcomeback" : "voiceselect");
  const [countdownNum, setCountdownNum] = useState(3); // kept for reference but unused now
  const [chosenVoice, setChosenVoice] = useState<string>(WORKOUT_VOICES[0].id);
  const [previewingVoice, setPreviewingVoice] = useState(false);

  const stepsRef = useRef<WorkoutStep[]>(buildSteps(sections));
  const steps = stepsRef.current;

  const [stepIdx, setStepIdx] = useState(resumeFromStep ?? 0);
  const stepIdxRef = useRef(resumeFromStep ?? 0);

  const [stepTimer, setStepTimer] = useState(-1);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimerDurationRef = useRef(0);

  // ── Persistent wall-clock elapsed timer (survives page kills & tab termination) ──
  // CRITICAL: Use localStorage (not sessionStorage) — iOS/Android kill tabs and wipe sessionStorage
  const WORKOUT_TIMER_KEY = "workout_timer_state";
  const wallStartRef = useRef<number>(Date.now());

  const loadWorkoutTimer = useCallback(() => {
    try {
      const raw = localStorage.getItem(WORKOUT_TIMER_KEY);
      if (raw) return JSON.parse(raw) as { wallStart: number; accumulated: number; paused: boolean };
    } catch {}
    return null;
  }, []);

  const persistWorkoutTimer = useCallback((wallStart: number, accumulated: number, paused: boolean) => {
    try { localStorage.setItem(WORKOUT_TIMER_KEY, JSON.stringify({ wallStart, accumulated, paused })); } catch {}
  }, []);

  const savedTimer = loadWorkoutTimer();
  const restoredElapsedSeconds = (() => {
    if (resumeElapsed !== undefined) return resumeElapsed;
    if (savedTimer) {
      if (savedTimer.paused) return savedTimer.accumulated;
      return savedTimer.accumulated + Math.floor((Date.now() - savedTimer.wallStart) / 1000);
    }
    if (dbStartedAt) {
      return Math.max(0, Math.floor((Date.now() - new Date(dbStartedAt).getTime()) / 1000));
    }
    return 0;
  })();
  const [elapsedSeconds, setElapsedSeconds] = useState(restoredElapsedSeconds);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedAccRef = useRef<number>(restoredElapsedSeconds);
  const isPausedRef = useRef(savedTimer?.paused ?? false);
  const [isPaused, setIsPaused] = useState(savedTimer?.paused ?? false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{ sectionIdx: number; exerciseIdx: number } | null>(null);

  // Unilateral side tracking: 'right' = on right side; 'left' = on left side; null = not unilateral
  const [currentSide, setCurrentSide] = useState<"right" | "left" | null>(null);
  const currentSideRef = useRef<"right" | "left" | null>(null);
  useEffect(() => { currentSideRef.current = currentSide; }, [currentSide]);

  // Track if voice was already announced for the current step+side combo
  const announcedStepRef = useRef<string>("");
  const lastCountdownRef = useRef<number>(-1); // last spoken countdown tick

  useEffect(() => { stepIdxRef.current = stepIdx; }, [stepIdx]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  // Reset side when step changes (init to 'right' for unilateral, null otherwise)
  useEffect(() => {
    if (phase !== "playing") return;
    const step = steps[stepIdx];
    if (step?.type === "exercise" && isUnilateralExercise(step.exercise)) {
      setCurrentSide("right");
    } else {
      setCurrentSide(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, phase]);

  // Announce exercise/rest when step OR side changes (ElevenLabs — cancels any prior speech)
  useEffect(() => {
    if (phase !== "playing") return;
    const announceKey = `${stepIdx}-${currentSide ?? "none"}`;
    if (announcedStepRef.current === announceKey) return;
    announcedStepRef.current = announceKey;

    const step = steps[stepIdx];
    if (!step) return;

    // Small delay on the very first step so "1" browser-speech fully finishes
    // before we cancel and fire the ElevenLabs request
    const delayMs = stepIdx === 0 && !currentSide ? 500 : 0;

    const timer = setTimeout(() => {
      if (step.type === "rest") {
        const nextEx = steps[stepIdx + 1]?.exercise;
        const restSecs = step.restSeconds || 0;
        const restPart = restSecs > 0 ? `Rest. ${restSecs} seconds.` : "Rest.";
        const msg = nextEx
          ? `${restPart} Up next: ${nextEx.exercise_name}`
          : `${restPart} You're almost done!`;
        elevenLabsSpeakNow(msg).catch(() => {});
      } else if (step.type === "exercise" && step.exercise) {
        const ex = step.exercise;
        const section = sections[step.sectionIdx];
        const isGrouped = ["superset", "circuit"].includes(section?.section_type);
        const isUni = isUnilateralExercise(ex);
        let msg = "";

        // Announce block label + round X of Y on the first exercise of each round
        // (only on the first side if unilateral, to avoid repeating)
        if (isGrouped && step.exerciseIdx === 0 && currentSide !== "left") {
          const blockName = section?.name?.trim() || "";
          if (blockName) msg += `${blockName}. `;
          msg += `Round ${step.round} of ${section?.rounds || 1}. `;
        }

        // Lead with the side cue for unilateral exercises
        if (isUni && currentSide) {
          msg += currentSide === "right" ? "Right side. " : "Left side. ";
        }

        msg += ex.exercise_name || "";

        // Per-exercise: announce duration if set, otherwise reps
        if (ex.duration_seconds && ex.duration_seconds > 0) {
          msg += `, ${ex.duration_seconds} seconds`;
        } else if (ex.reps) {
          msg += `, ${ex.reps} reps`;
        }

        // Announce weight if set
        if (ex.weight_lbs) {
          msg += `, at ${ex.weight_lbs} pounds`;
        }

        // Announce band/equipment if set (first side only)
        if (ex.band && currentSide !== "left") {
          msg += `, using ${ex.band}`;
        }

        // Announce tempo if set (only on first side announcement to keep concise)
        if (ex.tempo && currentSide !== "left") {
          msg += `, tempo ${ex.tempo}`;
        }

        // Announce RPE if set (first side only)
        if (ex.rpe && currentSide !== "left") {
          msg += `, RPE ${ex.rpe}`;
        }

        // Announce distance if set
        if (ex.distance) {
          msg += `, ${ex.distance}`;
        }

        elevenLabsSpeakNow(msg).catch(() => {});
      }
    }, delayMs);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, phase, currentSide]);

  // (getready/countdown speech removed — intro handles this now)

  // Last-3-seconds tick countdown only (no mid-workout motivational speech)
  useEffect(() => {
    if (phase !== "playing") return;
    const step = steps[stepIdx];
    if (!step) return;

    // 3-2-1 countdown applies whenever the current exercise is duration-based.
    if (step.type === "exercise" && step.exercise?.duration_seconds && step.exercise.duration_seconds > 0) {
      if (stepTimer > 0 && stepTimer <= 3 && lastCountdownRef.current !== stepTimer) {
        lastCountdownRef.current = stepTimer;
        const countdownWord = stepTimer === 3 ? "Three" : stepTimer === 2 ? "Two" : "One";
        playClip(countdownWord).catch(() => {});
      }
    }

    // Rest periods no longer get a 3-2-1 voice countdown — visual timer is enough.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepTimer, stepIdx, phase]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isPaused) videoRef.current.pause();
    else videoRef.current.play().catch(() => {});
  }, [isPaused]);

  const currentStep = steps[stepIdx] || null;
  const nextStep = steps[stepIdx + 1] || null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const totalEstimatedSeconds = sections.reduce((acc, s) => {
    const isGrouped = ["superset", "circuit"].includes(s.section_type);
    // Estimate work time per exercise:
    //   • timed exercise → use duration_seconds
    //   • rep-based     → use reps × 3.5s (closer to real cadence) with a 40s floor
    //   • unknown       → 40s default
    const workSecondsFor = (ex: any): number => {
      if (ex.duration_seconds && ex.duration_seconds > 0) return ex.duration_seconds;
      if (ex.reps && ex.reps > 0) return Math.max(20, Math.round(ex.reps * 3.5));
      return 40;
    };
    if (isGrouped) {
      s.exercises.forEach((ex) => { acc += workSecondsFor(ex) * s.rounds; });
      // Sum rest for non-last exercises (last exercise's rest acts as between-rounds rest)
      const exRestTotal = s.exercises.slice(0, -1).reduce((sum, ex) => sum + (ex.rest_seconds || 0), 0);
      acc += exRestTotal * s.rounds;
      const lastExRest = s.exercises[s.exercises.length - 1]?.rest_seconds || 0;
      const betweenRoundsRest = s.rest_between_rounds_seconds || lastExRest || 60;
      acc += betweenRoundsRest * Math.max(0, s.rounds - 1);
      // Transition padding: ~3s per exercise per round for 3-2-1 / hand-off cues
      acc += s.exercises.length * s.rounds * 3;
    } else {
      s.exercises.forEach((ex) => {
        acc += (workSecondsFor(ex) + (ex.rest_seconds || 30) + 3) * (ex.sets || 1);
      });
    }
    return acc;
  }, 0);

  const completedPercent = totalEstimatedSeconds > 0
    ? Math.min(100, Math.round((elapsedSeconds / totalEstimatedSeconds) * 100))
    : 0;
  const remainingSeconds = Math.max(0, totalEstimatedSeconds - elapsedSeconds);
  const estimatedCal = Math.round(elapsedSeconds * 0.13);

  const advanceStep = useCallback(() => {
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    lastCountdownRef.current = -1;
    setStepIdx((prev) => {
      const next = prev + 1;
      if (next >= steps.length) {
        setStepTimer(0);
        return steps.length;
      }
      setStepTimer(-1);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length]);

  const startStepCountdown = useCallback((seconds: number) => {
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    stepTimerDurationRef.current = seconds;
    setStepTimer(seconds);

    stepTimerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      setStepTimer((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(stepTimerRef.current!);
          // Unilateral timed: switch from right → left without advancing step
          if (currentSideRef.current === "right") {
            setCurrentSide("left");
          } else {
            advanceStep();
          }
          return 0;
        }
        return next;
      });
    }, 1000);
  }, [advanceStep]);

  // Stopwatch for untimed exercises (e.g. regular working sets) — counts UP, never auto-advances
  const startStepStopwatch = useCallback(() => {
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    stepTimerDurationRef.current = 0;
    setStepTimer(0);

    stepTimerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      setStepTimer((prev) => prev + 1);
    }, 1000);
  }, []);

  // (old getready/countdown phase logic removed — WorkoutIntro handles this now)

  // Wall-clock elapsed timer — survives backgrounding & page kills
  useEffect(() => {
    if (phase !== "playing") return;
    wallStartRef.current = Date.now();
    persistWorkoutTimer(wallStartRef.current, elapsedAccRef.current, false);

    // Start Live Activity for lock screen / Dynamic Island
    liveActivity.start({
      activityType: 'workout',
      title: workoutName || 'Workout',
      subtitle: currentStep?.exercise?.exercise_name || '',
      mode: 'countUp',
      seconds: elapsedAccRef.current,
      accentColor: '#7C3AED',
      icon: 'figure.strengthtraining.traditional',
    });

    elapsedRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        const elapsed = Math.floor((Date.now() - wallStartRef.current) / 1000);
        setElapsedSeconds(elapsedAccRef.current + elapsed);
      }
    }, 500);
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [phase]);

  // Update Live Activity every 5 seconds with elapsed time
  useEffect(() => {
    if (phase !== "playing") return;
    const interval = setInterval(() => {
      liveActivity.update({
        seconds: elapsedSeconds,
        subtitle: currentStep?.exercise?.exercise_name || 'Rest',
        isPaused: isPaused,
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [phase, elapsedSeconds, isPaused, currentStep]);

  // Recover on visibility change
  useEffect(() => {
    const handleVis = () => {
      if (document.visibilityState === "visible" && phase === "playing" && !isPausedRef.current) {
        const elapsed = Math.floor((Date.now() - wallStartRef.current) / 1000);
        setElapsedSeconds(elapsedAccRef.current + elapsed);
      }
    };
    document.addEventListener("visibilitychange", handleVis);
    return () => document.removeEventListener("visibilitychange", handleVis);
  }, [phase]);

  // Persist before page unload
  useEffect(() => {
    const handleUnload = () => {
      if (!isPausedRef.current && phase === "playing") {
        const elapsed = Math.floor((Date.now() - wallStartRef.current) / 1000);
        elapsedAccRef.current += elapsed;
        wallStartRef.current = Date.now();
      }
      persistWorkoutTimer(wallStartRef.current, elapsedAccRef.current, isPausedRef.current);
    };
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    return () => { window.removeEventListener("beforeunload", handleUnload); window.removeEventListener("pagehide", handleUnload); };
  }, [phase, persistWorkoutTimer]);

  useEffect(() => {
    if (phase !== "playing" || !onProgressSave) return;

    const saveProgress = () => {
      const liveElapsed = isPausedRef.current
        ? elapsedAccRef.current
        : elapsedAccRef.current + Math.floor((Date.now() - wallStartRef.current) / 1000);

      onProgressSave({
        setLogs,
        elapsedSeconds: liveElapsed,
        startedAt: startedAtRef.current,
        stepIdx: stepIdxRef.current,
        completionPercent: completedPercent,
      });
    };

    const interval = window.setInterval(saveProgress, 15_000);
    window.addEventListener("pagehide", saveProgress);
    document.addEventListener("visibilitychange", saveProgress);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", saveProgress);
      document.removeEventListener("visibilitychange", saveProgress);
    };
  }, [completedPercent, onProgressSave, phase, setLogs]);

  useEffect(() => {
    if (phase !== "playing" || !currentStep) return;
    if (currentStep.type === "exercise" && currentStep.exercise) {
      const ex = currentStep.exercise;
      // Per-exercise rule (predictable across all block types):
      //   exercise has duration_seconds → countdown
      //   exercise has reps (or no duration) → stopwatch
      if (ex.duration_seconds && ex.duration_seconds > 0) startStepCountdown(ex.duration_seconds);
      else startStepStopwatch();
    } else if (currentStep.type === "rest") {
      const secs = currentStep.restSeconds || 60;
      startStepCountdown(secs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, phase, currentSide]);

  const handleComplete = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    try { localStorage.removeItem(WORKOUT_TIMER_KEY); } catch {}
    liveActivity.stop();
    onComplete({ setLogs, elapsedSeconds, startedAt: startedAtRef.current });
  };

  const handleEndEarly = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    try { localStorage.removeItem(WORKOUT_TIMER_KEY); } catch {}
    liveActivity.stop();
    onEndEarly({ setLogs, elapsedSeconds, startedAt: startedAtRef.current });
  };

  const handleDiscard = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    try { localStorage.removeItem(WORKOUT_TIMER_KEY); } catch {}
    liveActivity.stop();
    onDiscard();
  };

  const handleSaveForLater = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    try { localStorage.removeItem(WORKOUT_TIMER_KEY); } catch {}
    setShowDiscardDialog(false);
    onSaveForLater?.({
      setLogs,
      elapsedSeconds,
      startedAt: startedAtRef.current,
      stepIdx,
      completionPercent: completedPercent,
    });
  };

  const togglePause = () => {
    const nowPaused = !isPausedRef.current;
    if (nowPaused) {
      // Pausing: freeze accumulated
      const elapsed = Math.floor((Date.now() - wallStartRef.current) / 1000);
      elapsedAccRef.current += elapsed;
      persistWorkoutTimer(wallStartRef.current, elapsedAccRef.current, true);
    } else {
      // Resuming: reset wall start
      wallStartRef.current = Date.now();
      persistWorkoutTimer(wallStartRef.current, elapsedAccRef.current, false);
    }
    isPausedRef.current = nowPaused;
    setIsPaused(nowPaused);
    if (nowPaused) cancelSpeech();
  };

  const goToPrevStep = () => {
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    setStepTimer(-1);
    setStepIdx((prev) => Math.max(0, prev - 1));
  };

  const updateSetLog = (key: string, field: "reps" | "weight", value: string) => {
    setSetLogs((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value, completed: prev[key]?.completed || false },
    }));
  };

  const markStepDone = () => {
    // Unilateral: if currently on right side, switch to left WITHOUT advancing the step
    if (currentSideRef.current === "right") {
      setCurrentSide("left");
      return;
    }
    if (currentStep?.setKey) {
      setSetLogs((prev) => ({
        ...prev,
        [currentStep.setKey!]: {
          ...prev[currentStep.setKey!],
          reps: prev[currentStep.setKey!]?.reps || "",
          weight: prev[currentStep.setKey!]?.weight || "",
          completed: true,
        },
      }));
    }
    advanceStep();
  };

  // For timed unilateral (Skip button on countdown screens): switch side or advance
  const advanceOrSwitchSide = () => {
    if (currentSideRef.current === "right") {
      setCurrentSide("left");
      // Restart the countdown for the left side
      const ex = currentStep?.exercise;
      if (ex?.duration_seconds && ex.duration_seconds > 0) {
        startStepCountdown(ex.duration_seconds);
      }
      return;
    }
    advanceStep();
  };

  const handleSwapExercise = (newExercise: any) => {
    toast({ title: "Exercise Swapped", description: `Switched to ${newExercise.name}` });
    setSwapDialogOpen(false);
  };

  // Preview a voice with a short sample
  const previewVoice = async (voiceId: string) => {
    setPreviewingVoice(true);
    setWorkoutVoice(voiceId);
    await elevenLabsSpeakNow("Let's crush this workout!");
    setPreviewingVoice(false);
  };

  const startWithVoice = () => {
    setWorkoutVoice(chosenVoice);
    unlockAudioForMobile();
    preCacheCountdownClips(); // pre-cache 3, 2, 1, Go! in background
    setPhase("intro");
  };

  // ─── VOICE SELECT SCREEN ───
  if (phase === "voiceselect") {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-foreground px-6">
        <Button variant="ghost" size="icon" className="absolute top-6 left-4 text-background/60 hover:text-background" onClick={onExit}>
          <X className="h-6 w-6" />
        </Button>
        <h2 className="text-2xl font-bold text-background mb-2">Choose Your Coach</h2>
        <p className="text-background/60 text-sm mb-6">Pick a voice to guide your workout</p>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          {WORKOUT_VOICES.map((v) => (
            <button
              key={v.id}
              onClick={() => { setChosenVoice(v.id); previewVoice(v.id); }}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                chosenVoice === v.id
                  ? "border-primary bg-primary/20 text-background"
                  : "border-background/20 text-background/80 hover:border-background/40"
              )}
            >
              <span className="text-2xl">{v.icon}</span>
              <div className="flex-1">
                <div className="font-semibold">{v.name}</div>
                <div className="text-xs opacity-60">{v.desc}</div>
              </div>
              {chosenVoice === v.id && previewingVoice && (
                <span className="text-xs text-primary animate-pulse">Playing...</span>
              )}
            </button>
          ))}
        </div>
        <Button
          size="lg"
          className="w-full max-w-sm mt-6"
          onClick={startWithVoice}
        >
          Start Workout
        </Button>
      </div>
    );
  }

  // ─── INTRO / LINEUP REVEAL ───
  if (phase === "intro") {
    const totalCalcMinutes = Math.ceil(totalEstimatedSeconds / 60);
    const totalExCount = steps.filter(s => s.type === "exercise").length;
    return (
      <WorkoutIntro
        workoutName={workoutName || "Workout"}
        sections={sections}
        totalMinutes={totalCalcMinutes}
        totalExercises={totalExCount}
        speakFn={elevenLabsSpeakNow}
        onIntroComplete={() => setPhase("playing")}
      />
    );
  }

  // ─── WELCOME BACK (Resume) ───
  if (phase === "welcomeback") {
    const remainPct = 100 - completedPercent;
    // Auto-play welcome back message then transition to playing
    const handleWelcomeBack = async () => {
      setWorkoutVoice(chosenVoice);
      unlockAudioForMobile();
      preCacheCountdownClips();
      await elevenLabsSpeakNow(`Welcome back! You're ${completedPercent}% through ${workoutName || "your workout"}. Let's pick up where you left off.`);
      setPhase("playing");
    };
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-foreground px-6">
        <div className="text-primary text-xs font-bold uppercase tracking-[0.3em] mb-3">Welcome Back</div>
        <h2 className="text-3xl font-black text-background text-center mb-2">{workoutName}</h2>
        <p className="text-background/60 text-sm mb-6">{completedPercent}% done · {remainPct}% remaining</p>
        <div className="w-full max-w-xs mb-8">
          <div className="w-full bg-background/20 rounded-full h-3">
            <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${completedPercent}%` }} />
          </div>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <p className="text-xs text-background/50 font-medium text-center mb-2">Choose Your Coach</p>
          {WORKOUT_VOICES.map((v) => (
            <button
              key={v.id}
              onClick={() => { setChosenVoice(v.id); previewVoice(v.id); }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                chosenVoice === v.id
                  ? "border-primary bg-primary/20 text-background"
                  : "border-background/20 text-background/80 hover:border-background/40"
              )}
            >
              <span className="text-2xl">{v.icon}</span>
              <div className="flex-1">
                <div className="font-semibold text-sm">{v.name}</div>
                <div className="text-xs opacity-60">{v.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <Button size="lg" className="w-full max-w-sm mt-6" onClick={handleWelcomeBack}>
          Resume Workout
        </Button>
        <Button variant="ghost" className="text-background/40 mt-2" onClick={onExit}>
          Cancel
        </Button>
      </div>
    );
  }

  // ─── WORKOUT COMPLETE SCREEN ───
  if (!currentStep || stepIdx >= steps.length) {
    return <WorkoutCompleteScreen workoutName={workoutName} onSave={handleComplete} />;
  }

  const currentExercise = currentStep.exercise;
  const isRest = currentStep.type === "rest";
  const currentSection = sections[currentStep.sectionIdx];
  const isGrouped = currentSection && ["superset", "circuit"].includes(currentSection.section_type);
  const isCircuitMode = currentStep.isCircuit;
  // Per-exercise rule: any exercise with a duration runs a countdown,
  // otherwise it runs a stopwatch. Block type no longer affects timer choice.
  const isTimedExercise = !!(currentExercise?.duration_seconds && currentExercise.duration_seconds > 0);

  const sectionLabel = isGrouped
    ? currentSection.name
      ? `${currentSection.name} · ${currentSection.rounds} rounds`
      : `${currentSection.section_type === "superset" ? "Superset" : "Circuit"} of ${currentSection.rounds} sets`
    : currentSection?.name || "";

  // Next exercise info
  let nextExerciseName = "";
  let nextExerciseDuration = "";
  let nextExerciseImage = "";
  if (nextStep) {
    if (nextStep.type === "exercise" && nextStep.exercise) {
      nextExerciseName = nextStep.exercise.exercise_name || "";
      nextExerciseImage = nextStep.exercise.exercise_image || "";
      const dur = nextStep.exercise.duration_seconds;
      const reps = nextStep.exercise.reps;
      if (dur) nextExerciseDuration = formatTime(dur);
      else if (reps) nextExerciseDuration = `${reps} reps`;
    } else if (nextStep.type === "rest") {
      nextExerciseName = "Rest";
      nextExerciseDuration = nextStep.restSeconds ? `${nextStep.restSeconds}s` : "";
    }
  }

  const timerPercent = stepTimer > 0 && stepTimerDurationRef.current > 0
    ? Math.round((stepTimer / stepTimerDurationRef.current) * 100)
    : 0;

  // ─── CIRCUIT / TIMED CINEMATIC MODE ───────────────────────────────────────
  if (isCircuitMode && !isRest) {
    const hasMedia = currentExercise?.exercise_video || currentExercise?.exercise_image;
    return (
      <div className="fixed inset-0 z-[200] flex flex-col bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-12 pb-3 bg-background/90 backdrop-blur border-b border-border/30">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowDiscardDialog(true)}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              {currentSection?.name || sectionLabel}
            </p>
            <p className="text-sm font-bold">Round {currentStep.round} of {currentSection?.rounds}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={togglePause} className="text-muted-foreground">
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
            <Button size="sm" className="font-semibold px-4" onClick={handleEndEarly}>Save</Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className={cn("grid px-4 py-2 border-b border-border/30 bg-background", isTimedExercise ? "grid-cols-4" : "grid-cols-3")}>
          <div className="text-center">
            <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">TIME</p>
            <p className="text-sm font-bold tabular-nums">{formatTime(elapsedSeconds)}</p>
          </div>
          {isTimedExercise && (
            <div className="text-center border-x border-border/30">
              <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Remaining</p>
              <p className="text-sm font-bold tabular-nums">{formatTime(remainingSeconds)}</p>
            </div>
          )}
          <div className={cn("text-center", isTimedExercise && "border-r border-border/30")}>
            <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Cal</p>
            <p className="text-sm font-bold">{estimatedCal}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Progress</p>
            <p className="text-sm font-bold">{completedPercent}%</p>
          </div>
        </div>

        {/* Main cinematic area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Large media display */}
          <div className="relative flex-1 bg-foreground/5 overflow-hidden">
            {currentExercise?.exercise_video ? (
              <video
                ref={videoRef}
                key={currentExercise.id + stepIdx}
                src={currentExercise.exercise_video}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : currentExercise?.exercise_image ? (
              <img
                src={currentExercise.exercise_image}
                alt={currentExercise.exercise_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-8xl font-black text-foreground/10">
                  {currentExercise?.exercise_name?.charAt(0) || "?"}
                </span>
              </div>
            )}

            {/* Countdown timer bubble — for any duration-based exercise */}
            {isTimedExercise && stepTimer > 0 && (
              <div className="absolute top-3 right-3">
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
                    <circle
                      cx="40" cy="40" r="34"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - timerPercent / 100)}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-white tabular-nums leading-none">{stepTimer}</span>
                    <span className="text-[9px] text-white/60 font-medium">sec</span>
                  </div>
                </div>
              </div>
            )}

            {/* Stopwatch bubble — for rep-based exercises (counts UP until user advances) */}
            {!isTimedExercise && !isRest && stepTimer >= 0 && (
              <div className="absolute top-3 right-3">
                <div className="relative w-20 h-20 rounded-full bg-black/55 border border-white/15 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-white tabular-nums leading-none">
                    {Math.floor(stepTimer / 60)}:{String(stepTimer % 60).padStart(2, "0")}
                  </span>
                  <span className="text-[9px] text-white/60 font-medium mt-0.5">elapsed</span>
                </div>
              </div>
            )}

            {/* Pause overlay */}
            {isPaused && (
              <div
                className="absolute inset-0 bg-background/70 flex items-center justify-center cursor-pointer"
                onClick={togglePause}
              >
                <Play className="h-16 w-16 text-foreground opacity-70" />
              </div>
            )}
          </div>

          {/* Exercise name + reps below video */}
          <div className="px-4 py-3 bg-background">
            <p className="text-2xl font-black text-foreground leading-tight">
              {currentExercise?.exercise_name}
              {currentSide && (
                <span className={cn(
                  "ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-sm font-bold uppercase tracking-wider align-middle",
                  currentSide === "right" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                )}>
                  {currentSide} side
                </span>
              )}
            </p>
            {currentExercise?.reps && (
              <p className="text-base font-semibold text-primary">{currentExercise.reps} reps</p>
            )}
            {currentExercise?.band && (
              <p className="text-xs font-semibold text-primary mt-0.5">🎯 {currentExercise.band}</p>
            )}
            {currentExercise?.notes && (
              <p className="text-xs text-muted-foreground italic mt-0.5">{currentExercise.notes}</p>
            )}
          </div>

          {/* Up Next strip */}
          {nextExerciseName && (
            <div className="flex items-center gap-3 px-4 py-3 border-t border-border/40 bg-muted/20">
              {nextExerciseImage ? (
                <img src={nextExerciseImage} alt={nextExerciseName} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-muted-foreground/40">{nextExerciseName.charAt(0)}</span>
                </div>
              )}
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium">Up Next</p>
                <p className="text-sm font-semibold">{nextExerciseName}</p>
                {nextExerciseDuration && <p className="text-xs text-muted-foreground">{nextExerciseDuration}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Rep/Weight logging for rep-based circuit exercises */}
        {!isRest && currentExercise && !currentExercise.duration_seconds && currentStep.setKey && (
          <div className="px-4 py-3 border-t border-border/40 bg-background">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Reps</p>
                <Input
                  type="number"
                  value={setLogs[currentStep.setKey]?.reps ?? (currentExercise.reps ? String(currentExercise.reps) : "")}
                  onChange={(e) => updateSetLog(currentStep.setKey!, "reps", e.target.value)}
                  className="h-10 text-center text-lg font-bold border-2 focus:border-primary"
                  placeholder={currentExercise.reps ? String(currentExercise.reps) : "0"}
                  inputMode="numeric"
                />
              </div>
              {currentExercise.weight_lbs ? (
                <>
                  <div className="flex-shrink-0 text-center">
                    <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Rx</p>
                    <div className="h-10 flex items-center justify-center px-3 rounded-md bg-muted text-sm font-bold text-foreground/70">
                      {currentExercise.weight_lbs} lbs
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Actual (lbs)</p>
                    {setLogs[currentStep.setKey]?.weight === "BW" ? (
                      <button
                        onClick={() => updateSetLog(currentStep.setKey!, "weight", "")}
                        className="h-10 w-full flex items-center justify-center rounded-md bg-primary/15 text-primary text-sm font-bold border-2 border-primary/30"
                      >
                        BW
                      </button>
                    ) : (
                      <div className="relative">
                        <Input
                          type="number"
                          value={setLogs[currentStep.setKey]?.weight || ""}
                          onChange={(e) => updateSetLog(currentStep.setKey!, "weight", e.target.value)}
                          className="h-10 text-center text-lg font-bold border-2 focus:border-primary pr-10"
                          placeholder={String(currentExercise.weight_lbs)}
                          inputMode="decimal"
                        />
                        <button
                          onClick={() => updateSetLog(currentStep.setKey!, "weight", "BW")}
                          className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5 hover:bg-muted/80"
                        >
                          BW
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Weight (lbs)</p>
                  {setLogs[currentStep.setKey]?.weight === "BW" ? (
                    <button
                      onClick={() => updateSetLog(currentStep.setKey!, "weight", "")}
                      className="h-10 w-full flex items-center justify-center rounded-md bg-primary/15 text-primary text-sm font-bold border-2 border-primary/30"
                    >
                      BW
                    </button>
                  ) : (
                    <div className="relative">
                      <Input
                        type="number"
                        value={setLogs[currentStep.setKey]?.weight || ""}
                        onChange={(e) => updateSetLog(currentStep.setKey!, "weight", e.target.value)}
                        className="h-10 text-center text-lg font-bold border-2 focus:border-primary pr-10"
                        placeholder="BW"
                        inputMode="decimal"
                      />
                      <button
                        onClick={() => updateSetLog(currentStep.setKey!, "weight", "BW")}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5 hover:bg-muted/80"
                      >
                        BW
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom controls */}
        {!isLocked && (
          <div className="bg-background border-t border-border/50 px-4 pb-8 pt-3">
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" size="icon" onClick={goToPrevStep} disabled={stepIdx === 0} className="text-muted-foreground">
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                className="flex-1 h-12 font-bold text-base rounded-xl"
                onClick={currentExercise?.duration_seconds ? advanceOrSwitchSide : markStepDone}
              >
                {currentExercise?.duration_seconds
                  ? (currentSide === "right" ? "Right Done → Left" : "Skip")
                  : (currentSide === "right" ? "Right Done → Left" : currentSide === "left" ? "Left Done →" : "Done →")}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsLocked(true)} className="text-muted-foreground">
                <Lock className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex justify-center mt-2">
              <Button variant="ghost" size="sm" className="text-destructive/60 text-xs" onClick={() => setShowDiscardDialog(true)}>
                <Square className="h-3 w-3 mr-1" /> End Workout
              </Button>
            </div>
          </div>
        )}

        {/* Lock overlay */}
        {isLocked && (
          <div
            className="fixed inset-0 z-[210] bg-foreground/80 flex items-center justify-center cursor-pointer"
            onClick={() => setIsLocked(false)}
          >
            <div className="text-center text-background">
              <Lock className="h-10 w-10 mx-auto mb-3 opacity-60" />
              <p className="text-sm opacity-60 font-medium">Tap to unlock</p>
            </div>
          </div>
        )}

        {/* End workout dialog */}
        <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
          <AlertDialogContent className="z-[300]">
            <AlertDialogHeader>
              <AlertDialogTitle>End Workout?</AlertDialogTitle>
              <AlertDialogDescription>
                You're {completedPercent}% through this workout. What would you like to do?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <AlertDialogAction onClick={handleEndEarly}>
                Save & End ({completedPercent}% Complete)
              </AlertDialogAction>
              {onSaveForLater && (
                <AlertDialogAction className="bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={handleSaveForLater}>
                  Finish Later
                </AlertDialogAction>
              )}
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDiscard}>Discard</AlertDialogAction>
              <AlertDialogCancel>Keep Going</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ─── STANDARD GYM MODE (rep-based / non-circuit) ─────────────────────────
  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background">
      {/* ── Top Nav Bar ── */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3 bg-background border-b border-border/50">
        <Button variant="ghost" size="sm" className="text-muted-foreground font-medium" onClick={() => setShowDiscardDialog(true)}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={togglePause} className="text-muted-foreground">
            {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </Button>
          <Button
            size="sm"
            className="font-semibold px-5"
            onClick={handleEndEarly}
          >
            Save
          </Button>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-3 px-4 py-3 border-b border-border/40 bg-background">
        <div className="text-center">
          <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">TIME</p>
          <p className="text-base font-bold tabular-nums">{formatTime(elapsedSeconds)}</p>
        </div>
        <div className="text-center border-x border-border/40">
          <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Active</p>
          <p className="text-base font-bold">{estimatedCal} Cal</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Progress</p>
          <p className="text-base font-bold">{completedPercent}%</p>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Rest Screen */}
        {isRest ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 gap-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="54"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - timerPercent / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Timer className="h-5 w-5 text-primary mb-1" />
                <p className="text-3xl font-black tabular-nums">{stepTimer > 0 ? stepTimer : "—"}</p>
                <p className="text-xs text-muted-foreground font-medium">seconds</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">Rest</p>
              <p className="text-muted-foreground text-sm mt-1">
                {nextExerciseName ? `Up next: ${nextExerciseName}` : "Get ready!"}
              </p>
            </div>
            <Button variant="outline" className="w-full max-w-xs" onClick={advanceStep}>
              Skip Rest
            </Button>
          </div>
        ) : (
          <>
            {/* Section header */}
            {sectionLabel && (
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-l-4 border-primary mx-0">
                <p className="text-sm font-semibold text-foreground">{sectionLabel}</p>
              </div>
            )}

            {/* Set indicator for grouped */}
            {isGrouped && (
              <div className="px-4 pt-4 pb-1">
                <p className="text-lg font-bold">Set {currentStep.round}</p>
              </div>
            )}

            {/* Exercise Card */}
            {currentExercise && (
              <div className="border-l-4 border-primary mx-4 my-3 bg-card rounded-r-xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 p-3">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                    {currentExercise.exercise_video ? (
                      <video
                        ref={videoRef}
                        key={currentExercise.id + stepIdx}
                        src={currentExercise.exercise_video}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : currentExercise.exercise_image ? (
                      <img src={currentExercise.exercise_image} alt={currentExercise.exercise_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-muted-foreground/30">
                        {currentExercise.exercise_name?.charAt(0) || "?"}
                      </span>
                    )}
                  </div>

                  {/* Name + target */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground leading-tight flex items-center gap-2 flex-wrap">
                      <span>{currentExercise.exercise_name}</span>
                      {currentSide && (
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                          currentSide === "right" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                        )}>
                          {currentSide} side
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {currentExercise.duration_seconds
                        ? `${currentExercise.duration_seconds}s`
                        : currentExercise.reps
                        ? `${currentExercise.reps} reps`
                        : ""}
                    </p>
                  </div>

                  <Button variant="ghost" size="icon" className="text-muted-foreground flex-shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>

                {/* Timer for timed exercises */}
                {currentExercise.duration_seconds && stepTimer > 0 && (
                  <div className="px-3 pb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground font-medium">Time remaining</span>
                      <span className="text-2xl font-black tabular-nums text-primary">{formatTime(stepTimer)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${timerPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Rep + weight logging for rep-based */}
                {!currentExercise.duration_seconds && currentStep.setKey && (
                  <div className="px-3 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Reps</p>
                        <Input
                          type="number"
                          value={setLogs[currentStep.setKey]?.reps ?? (currentExercise.reps ? String(currentExercise.reps) : "")}
                          onChange={(e) => updateSetLog(currentStep.setKey!, "reps", e.target.value)}
                          className="h-10 text-center text-lg font-bold border-2 focus:border-primary"
                          placeholder={currentExercise.reps ? String(currentExercise.reps) : "0"}
                          inputMode="numeric"
                        />
                      </div>
                      {currentExercise.weight_lbs ? (
                        <>
                          <div className="flex-shrink-0 text-center">
                            <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Rx</p>
                            <div className="h-10 flex items-center justify-center px-3 rounded-md bg-muted text-sm font-bold text-foreground/70">
                              {currentExercise.weight_lbs} lbs
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Actual (lbs)</p>
                            {setLogs[currentStep.setKey]?.weight === "BW" ? (
                              <button
                                onClick={() => updateSetLog(currentStep.setKey!, "weight", "")}
                                className="h-10 w-full flex items-center justify-center rounded-md bg-primary/15 text-primary text-sm font-bold border-2 border-primary/30"
                              >
                                BW
                              </button>
                            ) : (
                              <div className="relative">
                                <Input
                                  type="number"
                                  value={setLogs[currentStep.setKey]?.weight || ""}
                                  onChange={(e) => updateSetLog(currentStep.setKey!, "weight", e.target.value)}
                                  className="h-10 text-center text-lg font-bold border-2 focus:border-primary pr-10"
                                  placeholder={String(currentExercise.weight_lbs)}
                                  inputMode="decimal"
                                />
                                <button
                                  onClick={() => updateSetLog(currentStep.setKey!, "weight", "BW")}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5 hover:bg-muted/80"
                                >
                                  BW
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Weight (lbs)</p>
                          {setLogs[currentStep.setKey]?.weight === "BW" ? (
                            <button
                              onClick={() => updateSetLog(currentStep.setKey!, "weight", "")}
                              className="h-10 w-full flex items-center justify-center rounded-md bg-primary/15 text-primary text-sm font-bold border-2 border-primary/30"
                            >
                              BW
                            </button>
                          ) : (
                            <div className="relative">
                              <Input
                                type="number"
                                value={setLogs[currentStep.setKey]?.weight || ""}
                                onChange={(e) => updateSetLog(currentStep.setKey!, "weight", e.target.value)}
                                className="h-10 text-center text-lg font-bold border-2 focus:border-primary pr-10"
                                placeholder="BW"
                                inputMode="decimal"
                              />
                              <button
                                onClick={() => updateSetLog(currentStep.setKey!, "weight", "BW")}
                                className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5 hover:bg-muted/80"
                              >
                                BW
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {currentExercise?.notes && (
              <p className="text-sm text-muted-foreground px-4 pb-2 italic">{currentExercise.notes}</p>
            )}

            {/* Next up preview */}
            {nextExerciseName && (
              <div className="mx-4 mt-2 mb-3 px-3 py-2.5 bg-muted/40 rounded-xl flex items-center gap-3 border border-border/50">
                {nextExerciseImage ? (
                  <img src={nextExerciseImage} alt={nextExerciseName} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-base font-bold text-muted-foreground/40">{nextExerciseName.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">Up Next</p>
                  <p className="text-sm font-semibold truncate">{nextExerciseName}</p>
                  {nextExerciseDuration && <p className="text-xs text-muted-foreground">{nextExerciseDuration}</p>}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Bottom Controls ── */}
      {!isLocked && (
        <div className="bg-background border-t border-border/50 px-4 pb-8 pt-3">
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="icon" onClick={goToPrevStep} disabled={stepIdx === 0} className="text-muted-foreground">
              <SkipBack className="h-5 w-5" />
            </Button>

            <Button
              size="lg"
              className="flex-1 h-12 font-bold text-base rounded-xl"
              onClick={!isRest && currentStep?.type === "exercise" && !currentExercise?.duration_seconds ? markStepDone : (isRest ? advanceStep : advanceOrSwitchSide)}
            >
              {isRest
                ? "Skip Rest"
                : currentExercise?.duration_seconds
                ? (currentSide === "right" ? "Right Done → Left" : "Skip")
                : (currentSide === "right" ? "Right Done → Left" : currentSide === "left" ? "Left Done →" : "Save →")}
            </Button>

            <Button variant="ghost" size="icon" onClick={() => setIsLocked(true)} className="text-muted-foreground">
              <Lock className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex justify-center mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive/60 text-xs"
              onClick={() => setShowDiscardDialog(true)}
            >
              <Square className="h-3 w-3 mr-1" /> End Workout
            </Button>
          </div>
        </div>
      )}

      {/* Lock overlay */}
      {isLocked && (
        <div
          className="fixed inset-0 z-[210] bg-foreground/80 flex items-center justify-center cursor-pointer"
          onClick={() => setIsLocked(false)}
        >
          <div className="text-center text-background">
            <Lock className="h-10 w-10 mx-auto mb-3 opacity-60" />
            <p className="text-sm opacity-60 font-medium">Tap to unlock</p>
          </div>
        </div>
      )}

      {/* ── End workout dialog ── */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent className="z-[300]">
          <AlertDialogHeader>
            <AlertDialogTitle>End Workout?</AlertDialogTitle>
            <AlertDialogDescription>
              You're {completedPercent}% through this workout. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction onClick={handleEndEarly}>
              Save & End ({completedPercent}% Complete)
            </AlertDialogAction>
            {onSaveForLater && (
              <AlertDialogAction className="bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={handleSaveForLater}>
                Finish Later
              </AlertDialogAction>
            )}
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDiscard}>
              Discard
            </AlertDialogAction>
            <AlertDialogCancel>Keep Going</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Swap exercise dialog ── */}
      {swapTarget && (
        <ExerciseSwapDialog
          open={swapDialogOpen}
          onOpenChange={setSwapDialogOpen}
          currentExercise={sections[swapTarget.sectionIdx]?.exercises[swapTarget.exerciseIdx] as any}
          onSwap={handleSwapExercise}
        />
      )}
    </div>
  );
}
