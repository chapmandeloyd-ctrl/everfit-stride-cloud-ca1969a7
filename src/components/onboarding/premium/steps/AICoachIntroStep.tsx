import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import InterlockingRings from "../education/InterlockingRings";

export default function AICoachIntroStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 animate-fade-in">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
          YOUR AI COACH
        </div>
        <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight">
          Your AI Coach will build your plan.
        </h2>
      </div>
      <div className="flex justify-center py-2">
        <InterlockingRings mode="locked" size={200} />
      </div>
      <p className="text-base leading-relaxed text-white/75">
        APEX360 AI will guide you through a few quick questions about your body, schedule, goals, and fasting experience. Then it will design your entire FAST + FUEL program — personalized to your biology and lifestyle.
      </p>
      <div className="mt-auto pb-2 pt-4">
        <Button
          onClick={onNext}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          Start Building My Plan <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
