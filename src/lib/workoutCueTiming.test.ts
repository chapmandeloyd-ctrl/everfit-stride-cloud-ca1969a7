import { describe, it, expect } from "vitest";
import {
  buildExerciseAnnouncement,
  buildRestAnnouncement,
  buildOutroAnnouncement,
  buildWelcomeLine,
  buildFirstUpLine,
  shouldSpeakMidCue,
  countdownWordFor,
  midCueHalfway,
  estimatedWorkSeconds,
  nextIntroPhase,
  shouldShowWaveform,
  canSkipIntro,
  INTRO_PHASE_ORDER,
  buildCueSchedule,
  cueAtSecond,
  waveformVisibleAtSecond,
} from "./workoutCueTiming";

const timed = {
  exercise_name: "Air Squat",
  duration_seconds: 40,
  form_cue_start: "Chest tall",
  form_cue_mid: "Halfway, stay tight",
};

const repBased = {
  exercise_name: "Push Up",
  reps: 12,
  form_cue_mid: "Halfway",
};

describe("exercise announcements", () => {
  it("announces block intro, round, name and duration on the first exercise", () => {
    const line = buildExerciseAnnouncement({
      exercise: timed,
      section: { name: "Dynamic Movement Prep", section_type: "circuit", rounds: 3, intro_text: "Warm the hips." },
      exerciseIdx: 0,
      round: 1,
      side: null,
      isUnilateral: false,
      includeSectionIntro: true,
    });
    expect(line).toBe("Warm the hips. Dynamic Movement Prep. Round 1 of 3. Air Squat, 40 seconds. Chest tall");
  });

  it("does not repeat the block intro once it has been spoken", () => {
    const line = buildExerciseAnnouncement({
      exercise: timed,
      section: { name: "Block A", section_type: "circuit", rounds: 3, intro_text: "Warm the hips." },
      exerciseIdx: 0,
      round: 2,
      side: null,
      isUnilateral: false,
      includeSectionIntro: false,
    });
    expect(line).not.toContain("Warm the hips");
    expect(line).toContain("Round 2 of 3");
  });

  it("uses the switch cue for the left side of a unilateral exercise", () => {
    const line = buildExerciseAnnouncement({
      exercise: { ...repBased, form_cue_switch: "Now left side, same form", band: "red" },
      section: { section_type: "straight", rounds: 1 },
      exerciseIdx: 1,
      round: 1,
      side: "left",
      isUnilateral: true,
      includeSectionIntro: false,
    });
    expect(line).toBe("Now left side, same form Push Up, 12 reps");
  });

  it("announces the right side and equipment first", () => {
    const line = buildExerciseAnnouncement({
      exercise: { ...repBased, band: "red", tempo: "3-1-1", rpe: 8 },
      section: { section_type: "straight", rounds: 1 },
      exerciseIdx: 1,
      round: 1,
      side: "right",
      isUnilateral: true,
      includeSectionIntro: false,
    });
    expect(line).toBe("Right side. Push Up, 12 reps, using red, tempo 3-1-1, RPE 8");
  });

  it("builds rest and outro lines", () => {
    expect(buildRestAnnouncement(30, "Air Squat")).toBe("Rest. 30 seconds. Up next: Air Squat");
    expect(buildRestAnnouncement(0, null)).toBe("Rest. You're almost done!");
    expect(buildOutroAnnouncement(null)).toBe("Workout complete. Great work today.");
    expect(buildOutroAnnouncement("  Nice work  ")).toBe("Nice work");
  });
});

describe("mid-cue timing", () => {
  it("estimates work length for rep-based exercises", () => {
    expect(estimatedWorkSeconds(timed)).toBe(40);
    expect(estimatedWorkSeconds(repBased)).toBe(42);
    expect(estimatedWorkSeconds({ exercise_name: "x" })).toBe(40);
  });

  it("fires a timed mid cue at the halfway point only", () => {
    const halfway = midCueHalfway(timed);
    expect(halfway).toBe(20);
    expect(shouldSpeakMidCue({ exercise: timed, remainingSeconds: 21, elapsedSeconds: 19, alreadySpoken: false })).toBe(false);
    expect(shouldSpeakMidCue({ exercise: timed, remainingSeconds: 20, elapsedSeconds: 20, alreadySpoken: false })).toBe(true);
    expect(shouldSpeakMidCue({ exercise: timed, remainingSeconds: 20, elapsedSeconds: 20, alreadySpoken: true })).toBe(false);
  });

  it("never fires a mid cue inside the final countdown window", () => {
    expect(shouldSpeakMidCue({ exercise: timed, remainingSeconds: 3, elapsedSeconds: 37, alreadySpoken: false })).toBe(false);
  });

  it("fires a rep-based mid cue on elapsed time", () => {
    expect(shouldSpeakMidCue({ exercise: repBased, remainingSeconds: 0, elapsedSeconds: 20, alreadySpoken: false })).toBe(false);
    expect(shouldSpeakMidCue({ exercise: repBased, remainingSeconds: 0, elapsedSeconds: 21, alreadySpoken: false })).toBe(true);
  });

  it("skips very short exercises and ones with no saved cue", () => {
    expect(shouldSpeakMidCue({ exercise: { duration_seconds: 8, form_cue_mid: "go" }, remainingSeconds: 4, elapsedSeconds: 4, alreadySpoken: false })).toBe(false);
    expect(shouldSpeakMidCue({ exercise: { duration_seconds: 40 }, remainingSeconds: 20, elapsedSeconds: 20, alreadySpoken: false })).toBe(false);
  });

  it("speaks 3-2-1 only for timed exercises", () => {
    expect(countdownWordFor(timed, 3)).toBe("Three");
    expect(countdownWordFor(timed, 2)).toBe("Two");
    expect(countdownWordFor(timed, 1)).toBe("One");
    expect(countdownWordFor(timed, 4)).toBeNull();
    expect(countdownWordFor(timed, 0)).toBeNull();
    expect(countdownWordFor(repBased, 2)).toBeNull();
  });
});

describe("intro state transitions", () => {
  it("runs READY speech, then countdown, then the GO gate", () => {
    expect(INTRO_PHASE_ORDER).toEqual(["speaking", "countdown", "go"]);
    expect(nextIntroPhase("speaking")).toBe("countdown");
    expect(nextIntroPhase("countdown")).toBe("go");
    expect(nextIntroPhase("go")).toBeNull();
  });

  it("shows the waveform while speaking and hides it otherwise", () => {
    expect(shouldShowWaveform("speaking", false)).toBe(true);
    expect(shouldShowWaveform("countdown", false)).toBe(false);
    expect(shouldShowWaveform("countdown", true)).toBe(true);
    expect(shouldShowWaveform("go", false)).toBe(false);
  });

  it("offers Skip Intro everywhere except the GO gate", () => {
    expect(canSkipIntro("speaking")).toBe(true);
    expect(canSkipIntro("countdown")).toBe(true);
    expect(canSkipIntro("go")).toBe(false);
  });

  it("builds the spoken welcome and first-up lines", () => {
    expect(buildWelcomeLine("Full Body Burn", 1, 1)).toBe(
      "Welcome to Full Body Burn. Today's session has 1 exercise and will take about 1 minute. Let's get started."
    );
    expect(buildWelcomeLine("Full Body Burn", 8, 50)).toContain("8 exercises and will take about 50 minutes");
    expect(buildFirstUpLine(timed, { name: "Dynamic Movement Prep", rounds: 3 })).toBe(
      "Dynamic Movement Prep. Round 1 of 3. First up, Air Squat, 40 seconds. Get ready."
    );
    expect(buildFirstUpLine(repBased, null)).toBe("Round 1 of 1. First up, Push Up, 12 reps. Get ready.");
  });
});

describe("cue-timing alignment", () => {
  it("schedules start, mid and countdown cues at the right seconds", () => {
    const schedule = buildCueSchedule(timed);
    expect(schedule.map((c) => [c.kind, c.atSecond])).toEqual([
      ["start", 0],
      ["mid", 20],
      ["countdown", 37],
      ["countdown", 38],
      ["countdown", 39],
    ]);
  });

  it("gives rep-based exercises a mid cue but never a countdown", () => {
    const kinds = buildCueSchedule(repBased).map((c) => c.kind);
    expect(kinds).not.toContain("countdown");
    expect(kinds).toContain("mid");
  });

  it("matches the spoken overlay to the active exercise second", () => {
    expect(cueAtSecond(timed, 0)?.kind).toBe("start");
    expect(cueAtSecond(timed, 10)).toBeNull();
    expect(cueAtSecond(timed, 20)?.kind).toBe("mid");
    expect(cueAtSecond(timed, 39)?.kind).toBe("countdown");
  });

  it("shows the waveform only while a cue is being spoken", () => {
    expect(waveformVisibleAtSecond(timed, 0)).toBe(true);
    expect(waveformVisibleAtSecond(timed, 2)).toBe(true);
    expect(waveformVisibleAtSecond(timed, 10)).toBe(false);
    expect(waveformVisibleAtSecond(timed, 21)).toBe(true);
  });
});
