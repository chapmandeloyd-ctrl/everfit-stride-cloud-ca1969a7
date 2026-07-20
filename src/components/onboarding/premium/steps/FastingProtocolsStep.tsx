import { Button } from "@/components/ui/button";
import { ChevronRight, Clock, Zap, Activity, Sparkles, Repeat } from "lucide-react";

const PROTOCOLS = [
  { name: "16:8", icon: Clock, effect: "Daily fat adaptation & insulin reset" },
  { name: "18:6", icon: Clock, effect: "Deeper ketosis, sharper focus" },
  { name: "OMAD", icon: Zap, effect: "Maximum autophagy & cellular repair" },
  { name: "ADF", icon: Repeat, effect: "Aggressive fat loss, full reset days" },
  { name: "5:2", icon: Activity, effect: "Sustainable long-term metabolic flex" },
  { name: "Extended", icon: Sparkles, effect: "Deep healing & immune renewal" },
];

export default function FastingProtocolsStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col gap-5 animate-fade-in">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
          Fasting Protocols
        </div>
        <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight">
          Six ways to time your fast.
        </h2>
        <p className="mt-3 text-base leading-relaxed text-white/70">
          Each protocol triggers a different metabolic effect. Your synergy uses the one matched to your biology.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {PROTOCOLS.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.name}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="rounded-lg bg-[hsl(var(--primary)/0.15)] p-2">
                <Icon className="h-4 w-4 text-[hsl(var(--primary))]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-white/60">{p.effect}</div>
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
