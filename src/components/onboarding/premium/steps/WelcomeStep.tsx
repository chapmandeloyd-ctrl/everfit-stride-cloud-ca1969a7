import { Button } from "@/components/ui/button";
import MetabolicRing from "../MetabolicRing";
import lionLogo from "@/assets/logo.png";
import { useEffect, useState } from "react";

export default function WelcomeStep({ onNext }: { onNext: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const target = 68;
    const duration = 1600; // ms
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const delay = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, 250);
    return () => {
      clearTimeout(delay);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-between text-center">
      <div className="flex-1 flex flex-col items-center justify-center gap-14">
        <div className="animate-scale-in relative">
          <MetabolicRing size={240} progress={progress} />
          <img
            src={lionLogo}
            alt="KSOM360"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 object-contain"
            style={{ filter: "grayscale(1) brightness(1.4) opacity(0.95)" }}
          />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Your metabolism tells a story.
          </h1>
          <p className="mx-auto max-w-sm text-base leading-relaxed text-white/60">
            Let's measure where you are today — and build your path forward.
          </p>
        </div>
      </div>
      <div className="w-full pb-4 pt-8">
        <Button onClick={onNext} size="lg" className="h-14 w-full rounded-2xl text-base font-medium">
          Begin Assessment
        </Button>
      </div>
    </div>
  );
}
