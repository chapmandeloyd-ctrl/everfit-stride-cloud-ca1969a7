import { Button } from "@/components/ui/button";
import { Flame, Dumbbell, Moon } from "lucide-react";

const CARDS = [
  {
    Icon: Flame,
    title: "FUEL",
    desc: "Fasting structure, protein-first nutrition, meal timing, metabolic rhythm.",
  },
  {
    Icon: Dumbbell,
    title: "TRAIN",
    desc: "Movement guidance, progressive training, recovery-aware workouts.",
  },
  {
    Icon: Moon,
    title: "RESTORE",
    desc: "Stress reduction, sleep support, nervous system recovery, appetite regulation.",
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
        {CARDS.map(({ Icon, title, desc }, i) => (
          <div
            key={title}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl animate-fade-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div
              className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-30 blur-3xl"
              style={{
                background:
                  i === 0
                    ? "hsl(var(--primary))"
                    : i === 1
                      ? "hsl(28 92% 58%)"
                      : "hsl(174 72% 50%)",
              }}
            />
            <div className="relative flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5">
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.25em] text-white/50">{title}</div>
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
