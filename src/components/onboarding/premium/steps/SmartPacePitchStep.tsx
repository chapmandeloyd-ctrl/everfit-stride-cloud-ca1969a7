import { Button } from "@/components/ui/button";
import { ChevronRight, Scale, TrendingDown, Sparkles, Gauge } from "lucide-react";

export default function SmartPacePitchStep({ onNext }: { onNext: () => void }) {
  const bullets = [
    {
      icon: Gauge,
      title: "A daily target that adapts",
      desc: "Every weigh-in recalculates exactly what you need to lose today to stay on pace.",
    },
    {
      icon: TrendingDown,
      title: "Debt & credit, not guesswork",
      desc: "Fall behind? You'll see the exact catch-up. Ahead? You bank credit for tougher days.",
    },
    {
      icon: Scale,
      title: "Real accountability",
      desc: "No more 'weekly check-ins.' Your coach knows the truth every single morning.",
    },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-between text-center animate-fade-in overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center gap-5 pt-2">
        <div className="animate-scale-in relative mx-auto flex h-20 w-20 items-center justify-center">
          <div
            className="absolute inset-0 rounded-full blur-2xl"
            style={{ background: "hsl(var(--primary) / 0.3)" }}
          />
          <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <Scale className="h-9 w-9 text-[hsl(var(--primary))]" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
            <Sparkles className="h-3 w-3" />
            The Apex360 Edge
            <Sparkles className="h-3 w-3" />
          </div>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">
            Meet your Smart Weight Tracker.
          </h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-white/70">
            Most apps ask you to weigh in and hope for the best. APEX360 gives
            you a real-pace coach that adjusts your daily target after every
            weigh-in — so you always know exactly what to lose today to stay on
            track.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-2">
          {bullets.map((b) => (
            <div
              key={b.title}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left backdrop-blur-sm"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[hsl(var(--primary))]">
                <b.icon className="h-3.5 w-3.5" />
              </div>
              <div className="space-y-0">
                <div className="text-sm font-medium text-white/90">{b.title}</div>
                <div className="text-xs leading-snug text-white/60">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-sm rounded-xl border border-[hsl(174_72%_50%_/0.25)] bg-[hsl(174_72%_50%_/0.08)] p-3 text-xs leading-relaxed text-white/80">
          <span className="font-semibold text-[hsl(174_72%_50%)]">Why this matters:</span>{" "}
          A fasting timer tells you when to eat. A Smart Weight Tracker tells
          you if it's actually working. You get both — nobody else does.
        </div>
      </div>

      <div className="w-full pb-2 pt-4">
        <Button
          onClick={onNext}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          I'm in — keep going <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}