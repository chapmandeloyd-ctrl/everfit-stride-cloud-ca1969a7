/**
 * Cue-timing mapping layer.
 *
 * Single source of truth for WHAT the coach says and WHEN, for every active
 * exercise / rest state. The player and the intro both read from here so the
 * spoken line, the waveform overlay and the on-screen state can never drift.
 */

export interface CueExercise {
  exercise_name?: string | null;
  duration_seconds?: number | null;
  reps?: number | null;
  sets?: number | null;
  weight_lbs?: number | null;
  band?: string | null;
  tempo?: string | null;
  rpe?: number | string | null;
  distance?: string | null;
  form_cue_start?: string | null;
  form_cue_mid?: string | null;
  form_cue_switch?: string | null;
  side_mode?: string | null;
}

export interface CueSection {
  name?: string | null;
  section_type?: string | null;
  rounds?: number | null;
  intro_text?: string | null;
}

export type CueSide = "right" | "left" | null;

export const GROUPED_SECTION_TYPES = ["superset", "circuit"];

/** Minimum work length before a mid-exercise cue is worth speaking. */
export const MID_CUE_MIN_SECONDS = 12;
/** Mid cue never fires inside the final 3-2-1 countdown window. */
export const COUNTDOWN_WINDOW_SECONDS = 3;

const clean = (value?: string | null) => (value ? value.trim() : "");

/** Rep-based exercises have no timer, so we estimate their work length. */
export function estimatedWorkSeconds(exercise: CueExercise): number {
  if (exercise.duration_seconds && exercise.duration_seconds > 0) return exercise.duration_seconds;
  if (exercise.reps && exercise.reps > 0) return Math.max(20, Math.round(exercise.reps * 3.5));
  return 40;
}

/** Spoken line for a rest step, including the up-next hand-off. */
export function buildRestAnnouncement(restSeconds: number, nextExerciseName?: string | null): string {
  const restPart = restSeconds > 0 ? `Rest. ${restSeconds} seconds.` : "Rest.";
  const next = clean(nextExerciseName);
  return next ? `${restPart} Up next: ${next}` : `${restPart} You're almost done!`;
}

export interface ExerciseAnnouncementInput {
  exercise: CueExercise;
  section?: CueSection | null;
  exerciseIdx: number;
  round: number;
  side: CueSide;
  isUnilateral: boolean;
  /** True the first time this block is entered in the session. */
  includeSectionIntro: boolean;
}

/** Spoken line when an exercise step (or a side switch) becomes active. */
export function buildExerciseAnnouncement({
  exercise,
  section,
  exerciseIdx,
  round,
  side,
  isUnilateral,
  includeSectionIntro,
}: ExerciseAnnouncementInput): string {
  let msg = "";
  const isGrouped = GROUPED_SECTION_TYPES.includes(section?.section_type || "");
  const isFirstSide = side !== "left";

  if (exerciseIdx === 0 && round === 1 && isFirstSide && includeSectionIntro && clean(section?.intro_text)) {
    msg += `${clean(section?.intro_text)} `;
  }

  if (isGrouped && exerciseIdx === 0 && isFirstSide) {
    const blockName = clean(section?.name);
    if (blockName) msg += `${blockName}. `;
    msg += `Round ${round} of ${section?.rounds || 1}. `;
  }

  if (isUnilateral && side) {
    if (side === "left" && clean(exercise.form_cue_switch)) {
      msg += `${clean(exercise.form_cue_switch)} `;
    } else {
      msg += side === "right" ? "Right side. " : "Left side. ";
    }
  }

  msg += exercise.exercise_name || "";

  if (exercise.duration_seconds && exercise.duration_seconds > 0) {
    msg += `, ${exercise.duration_seconds} seconds`;
  } else if (exercise.reps) {
    msg += `, ${exercise.reps} reps`;
  }

  if (exercise.weight_lbs) msg += `, at ${exercise.weight_lbs} pounds`;
  if (exercise.band && isFirstSide) msg += `, using ${exercise.band}`;
  if (exercise.tempo && isFirstSide) msg += `, tempo ${exercise.tempo}`;
  if (exercise.rpe && isFirstSide) msg += `, RPE ${exercise.rpe}`;
  if (exercise.distance) msg += `, ${exercise.distance}`;
  if (clean(exercise.form_cue_start)) msg += `. ${clean(exercise.form_cue_start)}`;

  return msg;
}

/**
 * Halfway point at which the mid cue fires.
 * Timed exercises count down (remaining seconds); rep-based exercises count up
 * (elapsed seconds), so each gets its own trigger test below.
 */
export function midCueHalfway(exercise: CueExercise): number {
  return Math.floor(estimatedWorkSeconds(exercise) / 2);
}

export interface MidCueInput {
  exercise: CueExercise;
  /** Remaining seconds for timed exercises. */
  remainingSeconds: number;
  /** Elapsed seconds on the current step, used for rep-based exercises. */
  elapsedSeconds: number;
  alreadySpoken: boolean;
}

/** True on exactly the tick where the mid-exercise cue should be spoken. */
export function shouldSpeakMidCue({ exercise, remainingSeconds, elapsedSeconds, alreadySpoken }: MidCueInput): boolean {
  if (alreadySpoken) return false;
  if (!clean(exercise.form_cue_mid)) return false;
  const work = estimatedWorkSeconds(exercise);
  if (work < MID_CUE_MIN_SECONDS) return false;
  const halfway = midCueHalfway(exercise);

  const timed = !!(exercise.duration_seconds && exercise.duration_seconds > 0);
  if (timed) {
    return remainingSeconds > COUNTDOWN_WINDOW_SECONDS && remainingSeconds <= halfway;
  }
  return elapsedSeconds >= halfway;
}

/** Spoken countdown word for the final seconds of a timed exercise, else null. */
export function countdownWordFor(exercise: CueExercise, remainingSeconds: number): string | null {
  if (!(exercise.duration_seconds && exercise.duration_seconds > 0)) return null;
  if (remainingSeconds <= 0 || remainingSeconds > COUNTDOWN_WINDOW_SECONDS) return null;
  return remainingSeconds === 3 ? "Three" : remainingSeconds === 2 ? "Two" : "One";
}

/** Coach's closing line. */
export function buildOutroAnnouncement(outroText?: string | null): string {
  return clean(outroText) || "Workout complete. Great work today.";
}

/* ------------------------------------------------------------------ */
/* Intro sequence (READY → coach speaking → countdown → GO)            */
/* ------------------------------------------------------------------ */

export type IntroPhase = "speaking" | "countdown" | "go";

export function buildWelcomeLine(workoutName: string, totalExercises: number, totalMinutes: number): string {
  const exerciseWord = totalExercises === 1 ? "exercise" : "exercises";
  const minuteWord = totalMinutes === 1 ? "minute" : "minutes";
  return `Welcome to ${workoutName}. Today's session has ${totalExercises} ${exerciseWord} and will take about ${totalMinutes} ${minuteWord}. Let's get started.`;
}

export function buildFirstUpLine(exercise: CueExercise, section?: CueSection | null): string {
  const blockName = clean(section?.name);
  const totalRounds = section?.rounds || 1;
  const targetInfo = exercise.duration_seconds && exercise.duration_seconds > 0
    ? `, ${exercise.duration_seconds} seconds`
    : exercise.reps
      ? `, ${exercise.reps} reps`
      : "";
  const blockAnnounce = blockName ? `${blockName}. ` : "";
  return `${blockAnnounce}Round 1 of ${totalRounds}. First up, ${exercise.exercise_name}${targetInfo}. Get ready.`;
}

/** Ordered intro phases; the waveform overlay is visible only in "speaking". */
export const INTRO_PHASE_ORDER: IntroPhase[] = ["speaking", "countdown", "go"];

export function nextIntroPhase(phase: IntroPhase): IntroPhase | null {
  const idx = INTRO_PHASE_ORDER.indexOf(phase);
  return idx >= 0 && idx < INTRO_PHASE_ORDER.length - 1 ? INTRO_PHASE_ORDER[idx + 1] : null;
}

/** Waveform overlay shows only while the coach is actually speaking. */
export function shouldShowWaveform(phase: IntroPhase, coachSpeaking: boolean): boolean {
  return phase === "speaking" || coachSpeaking;
}

/** Skip Intro is offered in every phase except the GO gate itself. */
export function canSkipIntro(phase: IntroPhase): boolean {
  return phase !== "go";
}
