import { Button } from "@/components/ui/button";
import { Clock, Flame, Scale, Moon } from "lucide-react";

const CARDS = [
  {
    Icon: Clock,
    title: "FAST",
    desc: "A structured eating window that trains your metabolism to burn fat first.",
    accent: "hsl(0 0% 100%)",
  },
  {
    Icon: Flame,
    title: "FUEL",
    desc: "Protein-first nutrition and a fuel style matched to your goal.",
    accent: "hsl(174 72% 50%)",
  },
  {
    Icon: Scale,
    title: "TRACK",
    desc: "The Smart Weight Tracker adjusts your daily target after every weigh-in.",
    accent: "hsl(var(--primary))",
  },
  {
    Icon: Moon,
    title: "RESTORE",
    desc: "Sleep, stress and nervous-system recovery — the multiplier most plans ignore.",
    accent: "hsl(250 65% 68%)",
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
        {CARDS.map(({ Icon, title, desc, accent }, i) => (
          <div
            key={title}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="relative flex items-start gap-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
                style={{ borderColor: `${accent.replace(")", " / 0.3)")}`, color: accent }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: accent }}>
                  {title}
                </div>
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
