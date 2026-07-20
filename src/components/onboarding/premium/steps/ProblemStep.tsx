import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import InterlockingRings from "../education/InterlockingRings";

export default function ProblemStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 animate-fade-in">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
          The Problem
        </div>
        <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight">
          Most plans plateau.
        </h2>
      </div>
      <div className="flex justify-center py-2">
        <InterlockingRings mode="separated" />
      </div>
      <p className="text-base leading-relaxed text-white/75">
        Fasting alone works. Fueling right alone works. But most people stall
        because they're running them out of sync — timing and nutrition fighting
        each other instead of compounding.
      </p>
      <div className="mt-auto pb-2 pt-4">
        <Button
          onClick={onNext}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          Continue <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
