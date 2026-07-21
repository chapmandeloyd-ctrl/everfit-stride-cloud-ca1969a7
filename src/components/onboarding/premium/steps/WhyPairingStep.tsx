import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import PlateauVsCompound from "../education/PlateauVsCompound";

export default function WhyPairingStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 animate-fade-in">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
          Why Pairing Matters
        </div>
        <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight">
          Four levers compound results.
        </h2>
      </div>
      <div className="flex justify-center py-2">
        <PlateauVsCompound />
      </div>
      <p className="text-base leading-relaxed text-white/75">
        One pillar alone = plateau. Stack FAST + FUEL + TRACK + RESTORE and
        fat adaptation accelerates, cravings vanish, energy stabilizes,
        recovery compounds. This is the APEX360 edge.
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
