import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Check, X } from "lucide-react";

const Q_OPTIONS = [
  {
    id: "pairing",
    label: "When you eat and how you fuel have to work together — out of sync, you stall.",
    correct: true,
  },
  {
    id: "alone",
    label: "It doesn't really matter — fasting alone is enough.",
    correct: false,
  },
];

export default function QuickCheckStep({ onNext }: { onNext: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const showResult = picked !== null;
  const isCorrect = picked && Q_OPTIONS.find((o) => o.id === picked)?.correct;

  return (
    <div className="flex h-full flex-col gap-5 animate-fade-in">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
          Quick Check
        </div>
        <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight">
          Why does pairing matter?
        </h2>
        <p className="mt-3 text-base leading-relaxed text-white/70">
          One tap. Locks in the principle.
        </p>
      </div>

      <div className="space-y-2">
        {Q_OPTIONS.map((o) => {
          const isPicked = picked === o.id;
          return (
            <button
              key={o.id}
              onClick={() => !showResult && setPicked(o.id)}
              disabled={showResult}
              className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                isPicked && o.correct
                  ? "border-[hsl(174_72%_50%)] bg-[hsl(174_72%_50%/0.08)]"
                  : isPicked && !o.correct
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)]"
                    : showResult && o.correct
                      ? "border-[hsl(174_72%_50%/0.5)] bg-[hsl(174_72%_50%/0.04)]"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              <div
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  isPicked && o.correct
                    ? "border-[hsl(174_72%_50%)] bg-[hsl(174_72%_50%)] text-black"
                    : isPicked && !o.correct
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white"
                      : showResult && o.correct
                        ? "border-[hsl(174_72%_50%)] bg-[hsl(174_72%_50%)] text-black"
                        : "border-white/30"
                }`}
              >
                {isPicked || (showResult && o.correct) ? (
                  o.correct ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />
                ) : null}
              </div>
              <span className="text-sm leading-relaxed">{o.label}</span>
            </button>
          );
        })}
      </div>

      {showResult && (
        <p className="text-sm text-white/80">
          {isCorrect
            ? "Correct. Fasting and fueling are two sides of the same system."
            : "Not quite. Timing without fuel alignment, or fuel without timing, leaves results on the table."}
        </p>
      )}

      <div className="mt-auto pb-2 pt-4">
        <Button
          onClick={onNext}
          disabled={!showResult}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          Continue <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
