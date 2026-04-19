import { useEffect, useRef, useState } from "react";
import { BreathPreviewArtwork } from "@/components/portal/BreathPreviewArtwork";
import type { BreathingExercise } from "@/lib/breathingExercises";

interface Props {
  exercise: BreathingExercise;
  className?: string;
}

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
        background: `radial-gradient(circle at 35% 30%, hsl(${tone.hueBase}, ${tone.hueSat}%, 18%) 0%, hsl(${tone.hueBase}, ${Math.max(20, tone.hueSat - 10)}%, 6%) 70%, hsl(${tone.hueBase}, 20%, 3%) 100%)`,
      }}
    >
      <div className="absolute inset-0">
        <BreathPreviewArtwork
          animation={exercise.animation}
          progress={progress}
          phaseType={phaseType}
          hue={tone.hueBase}
          sat={tone.hueSat}
          time={time}
        />
      </div>
      <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-b from-white/8 via-transparent to-black/40" />
      <div className="absolute inset-0 rounded-full pointer-events-none shadow-[inset_0_0_0_2px_rgba(255,255,255,0.72),inset_0_0_0_4px_rgba(255,255,255,0.14),inset_0_-24px_32px_rgba(0,0,0,0.24)]" />
    </div>
  );
}

