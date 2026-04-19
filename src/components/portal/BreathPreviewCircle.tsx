import { useEffect, useMemo, useRef, useState } from "react";
import { BreathingAnimationLayer } from "@/components/vibes/BreathingAnimationLayer";
import type { BreathingExercise } from "@/lib/breathingExercises";

interface Props {
  exercise: BreathingExercise;
  className?: string;
}

/**
 * BreathPreviewCircle — renders a continuously-animating mini preview of an
 * exercise's breathing animation (ocean / lotus / orbital / aurora / heartbeat)
 * inside a circular mask. Each animation gets its own thumbnail framing so the
 * visible artwork fills the circle instead of leaving dead zones.
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

  const frame = useMemo(() => {
    switch (exercise.animation) {
      case "ocean":
        return {
          scale: 1.42,
          translateX: "0%",
          translateY: "14%",
          brightness: 0.78,
          arcIntensity: 0.88,
        };
      case "aurora":
        return {
          scale: 1.55,
          translateX: "6%",
          translateY: "0%",
          brightness: 0.82,
          arcIntensity: 1,
        };
      case "lotus":
        return {
          scale: 1.24,
          translateX: "0%",
          translateY: "0%",
          brightness: 0.74,
          arcIntensity: 0.84,
        };
      case "orbital":
        return {
          scale: 1.22,
          translateX: "0%",
          translateY: "0%",
          brightness: 0.76,
          arcIntensity: 0.82,
        };
      case "heartbeat":
      default:
        return {
          scale: 1.2,
          translateX: "0%",
          translateY: "0%",
          brightness: 0.74,
          arcIntensity: 0.82,
        };
    }
  }, [exercise.animation]);

  return (
    <div
      className={`relative overflow-hidden rounded-full ${className ?? ""}`}
      style={{
        background: `radial-gradient(circle at 35% 30%, hsl(${tone.hueBase}, ${tone.hueSat}%, 18%) 0%, hsl(${tone.hueBase}, ${Math.max(20, tone.hueSat - 10)}%, 6%) 70%, hsl(${tone.hueBase}, 20%, 3%) 100%)`,
      }}
    >
      <div
        className="absolute inset-0 [&>div]:!inset-0 [&_svg]:!w-full [&_svg]:!h-full [&_svg]:!max-w-none [&_svg]:!max-h-none [&_svg]:!opacity-100 [&_svg]:![filter:none]"
        style={{
          transform: `translate(${frame.translateX}, ${frame.translateY}) scale(${frame.scale})`,
          transformOrigin: "center",
        }}
      >
        <BreathingAnimationLayer
          animation={exercise.animation}
          progress={progress}
          phaseType={phaseType}
          hue={tone.hueBase}
          sat={tone.hueSat}
          brightness={frame.brightness}
          arcIntensity={frame.arcIntensity}
          time={time}
        />
      </div>
      <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-b from-white/5 via-transparent to-black/45" />
      <div className="absolute inset-0 rounded-full pointer-events-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35),inset_0_0_30px_rgba(255,255,255,0.06)]" />
    </div>
  );
}

