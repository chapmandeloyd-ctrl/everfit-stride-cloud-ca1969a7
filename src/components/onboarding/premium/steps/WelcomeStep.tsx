import { Button } from "@/components/ui/button";
import MetabolicRing from "../MetabolicRing";
import lionLogo from "@/assets/logo.png";

export default function WelcomeStep({ onNext }: { onNext: () => void }) {
  // Ring starts empty — it will fill as you answer the assessment.
  const progress = 0;

  return (
    <div className="flex h-full flex-col items-center justify-between text-center">
      <div className="flex-1 flex flex-col items-center justify-center gap-14">
        <div className="animate-scale-in relative">
          <MetabolicRing size={240} progress={progress} />
          <img
            src={lionLogo}
            alt="APEX360-IF360"
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
