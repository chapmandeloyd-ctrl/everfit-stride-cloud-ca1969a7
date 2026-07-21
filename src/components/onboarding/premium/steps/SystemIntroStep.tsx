import { Button } from "@/components/ui/button";
import { Clock, Flame, Scale, Moon } from "lucide-react";

const CARDS = [
  {
    Icon: Clock,
    title: "FAST",
    desc: "Structured eating windows that train your metabolism to burn fat first.",
    color: "hsl(0 0% 100%)",
  },
  {
    Icon: Flame,
    title: "FUEL",
    desc: "Goal-matched fuel style — protein-first nutrition, meal timing, metabolic rhythm.",
    color: "hsl(174 72% 50%)",
  },
  {
    Icon: Scale,
    title: "TRACK",
    desc: "Smart Weight Tracker — real accountability that adapts your daily target every morning.",
    color: "hsl(var(--primary))",
  },
  {
    Icon: Moon,
    title: "RESTORE",
    desc: "Stress reduction, sleep support, nervous system recovery, appetite regulation.",
    color: "hsl(250 65% 68%)",
  },
];

export default function SystemIntroStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <h2 className="text-3xl font-semibold leading-tight tracking-tight">
          You don't need another diet.
        </h2>
        <p className="mt-2 text-lg text-white/70">You need a system.</p>
      </div>

      <div className="space-y-3">
        {CARDS.map(({ Icon, title, desc, color }, i) => (
          <div
            key={title}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl animate-fade-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div
              className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-30 blur-3xl"
              style={{ background: color }}
            />
            <div className="relative flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5">
                <Icon className="h-6 w-6" style={{ color }} />
              </div>
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.25em]" style={{ color }}>{title}</div>
                <div className="mt-1 text-sm leading-relaxed text-white/80">{desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pb-2">
        <Button onClick={onNext} size="lg" className="h-14 w-full rounded-2xl text-base font-medium">
          Continue
        </Button>
      </div>
    </div>
  );
}
