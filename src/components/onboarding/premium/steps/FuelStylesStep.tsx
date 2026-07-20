import { Button } from "@/components/ui/button";
import { ChevronRight, Flame, Zap, Activity, Scale, Dumbbell } from "lucide-react";

const FUEL_STYLES = [
  { name: "Balance", icon: Scale, who: "Sustainable everyday eating — steady energy, no extremes" },
  { name: "Performance", icon: Activity, who: "Carbs timed around training for output and recovery" },
  { name: "Lean", icon: Flame, who: "Aggressive fat loss with a tighter calorie & carb ceiling" },
  { name: "Recomp", icon: Dumbbell, who: "Protein-led fueling to build muscle while losing fat" },
  { name: "Extreme", icon: Zap, who: "Deep metabolic reset — lowest carbs, highest discipline" },
];

export default function FuelStylesStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col gap-5 animate-fade-in">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
          Fuel Styles
        </div>
        <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight">
          Five ways to fuel.
        </h2>
        <p className="mt-3 text-base leading-relaxed text-white/70">
          Not all eating is the same. The right style depends on activity, goals, and how your body responds.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {FUEL_STYLES.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.name}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="rounded-lg bg-[hsl(174_72%_50%/0.15)] p-2">
                <Icon className="h-4 w-4 text-[hsl(174_72%_50%)]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{k.name}</div>
                <div className="text-xs text-white/60">{k.who}</div>
              </div>
            </div>
          );
        })}
      </div>

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
