import { Button } from "@/components/ui/button";
import MetabolicRing from "../MetabolicRing";
import lionLogo from "@/assets/logo.png";

export default function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-between text-center">
      <div className="flex-1 flex flex-col items-center justify-center gap-10">
        <div className="animate-scale-in relative">
          <MetabolicRing size={240} progress={68} sublabel="KSOM360" />
          <img
            src={lionLogo}
            alt="KSOM360"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[58%] w-20 h-20 object-contain"
            style={{ filter: "grayscale(1) brightness(1.4) opacity(0.9)" }}
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
      <div className="w-full pb-4">
        <Button onClick={onNext} size="lg" className="h-14 w-full rounded-2xl text-base font-medium">
          Begin Assessment
        </Button>
      </div>
    </div>
  );
}
