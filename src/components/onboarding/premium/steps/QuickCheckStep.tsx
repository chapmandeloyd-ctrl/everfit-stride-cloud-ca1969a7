import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Clock, Flame, Scale, CheckCircle2 } from "lucide-react";

const PILLARS = [
  {
    id: "fast",
    icon: Clock,
    title: "FAST",
    tagline: "Train your metabolism to burn fat first.",
    benefit: "A structured eating window that gives your body time to tap into stored energy.",
    color: "hsl(0_0%_100%)",
    borderColor: "hsl(0_0%_100%_/_0.12)",
  },
  {
    id: "fuel",
    icon: Flame,
    title: "FUEL",
    tagline: "Eat with purpose, not just restriction.",
    benefit: "A fuel style that matches your goals — performance, lean, recomp, or extreme.",
    color: "hsl(174_72%_50%)",
    borderColor: "hsl(174_72%_50%_/_0.25)",
  },
  {
    id: "track",
    icon: Scale,
    title: "TRACK",
    tagline: "Real accountability, every morning.",
    benefit: "Your Smart Weight Tracker adjusts your daily target after every weigh-in.",
    color: "hsl(var(--primary))",
    borderColor: "hsl(var(--primary)_/_0.25)",
  },
];

export default function QuickCheckStep({ onNext }: { onNext: () => void }) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className="flex h-full flex-col gap-5 animate-fade-in">
      <div className="text-center">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
          The Complete System
        </div>
        <h2 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight">
          Three levers. One result.
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/70">
          APEX360-IF is not a diet. It is a system that works because each part reinforces the other.
        </p>
      </div>

      <div className="space-y-3">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.id}
              className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm"
              style={{ borderColor: p.borderColor }}
            >
              <div
                className="absolute right-0 top-0 h-24 w-24 -translate-y-1/2 translate-x-1/2 rounded-full opacity-10 blur-2xl"
                style={{ background: p.color }}
              />
              <div className="relative flex items-start gap-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                  style={{ borderColor: p.borderColor, color: p.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tracking-wide" style={{ color: p.color }}>
                      {p.title}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white/95">{p.tagline}</div>
                  <div className="text-xs leading-relaxed text-white/60">{p.benefit}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setAcknowledged((a) => !a)}
        className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
          acknowledged
            ? "border-[hsl(174_72%_50%)] bg-[hsl(174_72%_50%_/0.08)]"
            : "border-white/10 bg-white/[0.03] hover:border-white/20"
        }`}
      >
        <div className="space-y-1">
          <div className="text-sm font-semibold text-white/90">I understand the system.</div>
          <div className="text-xs leading-relaxed text-white/60">
            Fasting + Fuel + Smart Tracking is the APEX360 edge. No other app connects all three.
          </div>
        </div>
        <div
          className={`ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
            acknowledged
              ? "border-[hsl(174_72%_50%)] bg-[hsl(174_72%_50%)] text-black"
              : "border-white/30"
          }`}
        >
          {acknowledged && <CheckCircle2 className="h-4 w-4" />}
        </div>
      </button>

      <div className="mt-auto pb-2 pt-4">
        <Button
          onClick={onNext}
          disabled={!acknowledged}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          Build my plan <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
