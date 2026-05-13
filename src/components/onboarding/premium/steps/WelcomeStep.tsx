import { Button } from "@/components/ui/button";
import MetabolicRing from "../MetabolicRing";

export default function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-between text-center">
      <div className="flex-1 flex flex-col items-center justify-center gap-10">
        <div className="animate-scale-in">
          <MetabolicRing size={240} progress={68} sublabel="KSOM360" label="◐" />
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
      <div className="w-full pb-4">
        <Button onClick={onNext} size="lg" className="h-14 w-full rounded-2xl text-base font-medium">
          Begin Assessment
        </Button>
      </div>
    </div>
  );
}
