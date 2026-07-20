import { Button } from "@/components/ui/button";
import { ChevronRight, Clock, Zap, Sparkles, Sunrise, Sunset } from "lucide-react";
import type { FastType } from "./FastTypeSelectionStep";

const INTERMITTENT_PROTOCOLS = [
  { name: "14:10", icon: Sunrise, effect: "Gentle introduction — steady energy and appetite control" },
  { name: "16:8", icon: Clock, effect: "Daily fat adaptation & insulin reset" },
  { name: "18:6", icon: Clock, effect: "Deeper ketosis, sharper focus" },
  { name: "20:4", icon: Sunset, effect: "Warrior window — aggressive fat burning" },
  { name: "OMAD", icon: Zap, effect: "Maximum autophagy & cellular repair" },
];

const EXTENDED_PROTOCOLS = [
  { name: "24h", icon: Clock, effect: "Full digestive reset and glycogen depletion" },
  { name: "36h", icon: Clock, effect: "Deep ketosis and mental clarity" },
  { name: "48h", icon: Sparkles, effect: "Autophagy activation and immune refresh" },
  { name: "72h", icon: Sparkles, effect: "3-day deep metabolic and cellular renewal" },
  { name: "5-Day Extended", icon: Sparkles, effect: "Maximum healing, immune reset, and metabolic rebuild" },
];

const HEADERS: Record<FastType, { eyebrow: string; title: string; subtitle: string }> = {
  intermittent: {
    eyebrow: "Daily Window Fasting",
    title: "Five daily windows to build around.",
    subtitle: "From beginner-friendly 14:10 all the way to OMAD. Your Apex360 AI will pick the window that fits your biology.",
  },
  long: {
    eyebrow: "Extended Fasting",
    title: "Five advanced fast lengths.",
    subtitle: "Continuous fasts from 24 hours up to 5 days. Your Apex360 AI will recommend the safest duration for your experience level.",
  },
};

export default function FastingProtocolsStep({
  fastType,
  onNext,
}: {
  fastType: FastType;
  onNext: () => void;
}) {
  const protocols = fastType === "intermittent" ? INTERMITTENT_PROTOCOLS : EXTENDED_PROTOCOLS;
  const header = HEADERS[fastType];

  return (
    <div className="flex h-full flex-col gap-5 animate-fade-in">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
          {header.eyebrow}
        </div>
        <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight">
          {header.title}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-white/70">
          {header.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {protocols.map((p) => {
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
