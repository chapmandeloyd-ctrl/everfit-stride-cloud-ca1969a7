import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import MetabolicRing from "../MetabolicRing";
import lionLogo from "@/assets/logo.png";

export default function ActivateStep({
  loading,
  score,
  onActivate,
  onExplore,
}: {
  loading: boolean;
  score: number;
  onActivate: () => void;
  onExplore: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const target = Math.max(0, Math.min(100, Math.round(score)));
    const duration = 1800;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(eased * target);
      setProgress(v);
      setDisplayScore(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const delay = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, 250);
    return () => {
      clearTimeout(delay);
      cancelAnimationFrame(raf);
    };
  }, [score]);

  return (
    <div className="flex h-full flex-col items-center justify-between text-center">
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="animate-scale-in relative">
          <MetabolicRing size={240} progress={progress} />
          <img
            src={lionLogo}
            alt="KSOM360"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 object-contain"
            style={{ filter: "grayscale(1) brightness(1.4) opacity(0.95)" }}
          />
          <div className="pointer-events-none absolute inset-x-0 -bottom-2 flex flex-col items-center">
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
              Readiness
            </div>
            <div className="text-2xl font-semibold tracking-tight text-white">
              {displayScore}
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Your metabolic reset starts now.
          </h1>
          <p className="mx-auto max-w-sm text-base leading-relaxed text-white/65">
            Your personalized path is ready. One simple action at a time.
          </p>
        </div>
      </div>
      <div className="w-full space-y-3 pb-2">
        <Button
          onClick={onActivate}
          disabled={loading}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          {loading ? "Activating..." : "Activate My Plan"}
        </Button>
        <button
          onClick={onExplore}
          disabled={loading}
          className="w-full text-sm text-white/60 underline-offset-4 hover:underline"
        >
          Explore Dashboard
        </button>
      </div>
    </div>
  );
}
