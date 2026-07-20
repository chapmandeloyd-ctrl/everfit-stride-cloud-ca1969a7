import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import MetabolicRing from "../MetabolicRing";
import lionLogo from "@/assets/logo.png";

export default function AICoachIntroStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-between text-center animate-fade-in">
      <div className="flex-1 flex flex-col items-center justify-center gap-8 pt-4">
        <div className="animate-scale-in relative">
          <MetabolicRing size={220} progress={0} />
          <img
            src={lionLogo}
            alt="Apex360-IF"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 object-contain"
            style={{ filter: "grayscale(1) brightness(1.4) opacity(0.95)" }}
          />
        </div>
        <div className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
            YOUR AI COACH
          </div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Your metabolism tells a story.
          </h1>
          <p className="mx-auto max-w-sm text-base leading-relaxed text-white/70">
            APEX360 AI will guide you through a few quick questions about your body, schedule, goals, and fasting experience — then design your entire FAST + FUEL program, personalized to your biology and lifestyle.
          </p>
        </div>
      </div>
      <div className="w-full pb-2 pt-6">
        <Button
          onClick={onNext}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          Begin Assessment <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
