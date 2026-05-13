import { Button } from "@/components/ui/button";
import { SYNERGIES, type SynergyKey } from "@/lib/onboarding/synergies";
import { Clock, Droplets, Footprints, Moon, UtensilsCrossed } from "lucide-react";

export default function FirstWeekStep({
  synergyKey,
  onNext,
}: {
  synergyKey: SynergyKey;
  onNext: () => void;
}) {
  const s = SYNERGIES[synergyKey];
  const items = [
    { Icon: Clock, label: "Fasting window", value: s.window },
    { Icon: UtensilsCrossed, label: "Eating window", value: s.eatingWindow },
    { Icon: Droplets, label: "Hydration goal", value: "3 L water + electrolytes" },
    { Icon: Footprints, label: "Movement", value: "30 min daily walk + 2 strength sessions" },
    { Icon: Moon, label: "Recovery focus", value: "Consistent sleep window, 7–8 hours" },
  ];
  return (
    <div className="flex h-full flex-col gap-3">
      <div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">Your first week</div>
        <h2 className="mt-0.5 text-xl font-semibold tracking-tight">A clear, simple start</h2>
      </div>

      <div className="space-y-1.5">
        {items.map(({ Icon, label, value }, i) => (
          <div
            key={label}
            className="relative flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
          >
            <div className="absolute left-7 top-12 h-[calc(100%-1rem)] w-px bg-white/5 last:hidden" hidden={i === items.length - 1} />
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-[0.2em] text-white/45">{label}</div>
              <div className="text-[13px] leading-tight text-white/85">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[hsl(174_72%_50%/0.3)] bg-[hsl(174_72%_50%/0.06)] px-3 py-2.5">
        <div className="text-[10px] uppercase tracking-[0.25em] text-[hsl(174_72%_60%)]">Expected benefits</div>
        <p className="mt-1 text-[13px] leading-snug text-white/85">
          Reduced cravings · More stable energy · Improved appetite control
        </p>
      </div>

      <div className="mt-auto pb-2">
        <Button onClick={onNext} size="lg" className="h-12 w-full rounded-2xl text-base font-medium">
          Looks good
        </Button>
      </div>
    </div>
  );
}
