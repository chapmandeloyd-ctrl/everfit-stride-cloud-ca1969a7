import { useEffect, useRef, useState } from "react";
import { BreathingAnimationLayer } from "@/components/vibes/BreathingAnimationLayer";
import type { BreathingExercise } from "@/lib/breathingExercises";

interface Props {
  exercise: BreathingExercise;
  className?: string;
}

/**
 * BreathPreviewCircle — renders a continuously-animating mini preview of an
 * exercise's breathing animation (ocean / lotus / orbital / aurora / heartbeat)
 * inside a circular mask. Cycles through the exercise's own phases on a loop
 * so the library card shows a "live" feel like a video thumbnail.
 */
export function BreathPreviewCircle({ exercise, className }: Props) {
  const [progress, setProgress] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [time, setTime] = useState(0);
  const startRef = useRef<number>(performance.now());
  const phaseStartRef = useRef<number>(performance.now());

  const phases = exercise.phases;
  const tone = exercise.tone;

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = (now - startRef.current) / 1000;
      setTime(elapsed);

      const phaseElapsed = (now - phaseStartRef.current) / 1000;
      const current = phases[phaseIndex];
      const dur = current?.seconds ?? 4;
      const p = Math.min(1, phaseElapsed / dur);
      setProgress(p);

      if (p >= 1) {
        phaseStartRef.current = now;
        setPhaseIndex((i) => (i + 1) % phases.length);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phases, phaseIndex]);

  const phaseType = phases[phaseIndex]?.type ?? "inhale";

  return (
    <div
      className={`relative overflow-hidden rounded-full ${className ?? ""}`}
      style={{
        background: `radial-gradient(circle at 35% 30%, hsl(${tone.hueBase}, ${tone.hueSat}%, 18%) 0%, hsl(${tone.hueBase}, ${Math.max(20, tone.hueSat - 10)}%, 6%) 70%, #000 100%)`,
      }}
    >
      {/* Scale wrapper — BreathingAnimationLayer's inner SVGs are designed for
          full-screen players (fixed w-64/w-72/w-80, low opacity, blur filters,
          and some are anchored to the bottom half of a 300x300 viewbox). For
          the tiny library circle we force them to fill the box, strip their
          built-in opacity/blur so they read clearly at small size, and
          slightly upscale so artwork like the ocean waves and aurora curtains
          fills the visible circle instead of sitting in one half. */}
      <div
        className="absolute inset-0 [&>div]:!inset-0 [&_svg]:!w-full [&_svg]:!h-full [&_svg]:!opacity-100 [&_svg]:![filter:none]"
        style={{ transform: "scale(1.15)" }}
      >
        <BreathingAnimationLayer
          animation={exercise.animation}
          progress={progress}
          phaseType={phaseType}
          hue={tone.hueBase}
          sat={tone.hueSat}
          brightness={0.7}
          arcIntensity={0.75}
          time={time}
        />
      </div>
      {/* subtle vignette + rim for depth */}
      <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/40" />
      <div className="absolute inset-0 rounded-full pointer-events-none ring-1 ring-inset ring-white/10" />
    </div>
  );
}
