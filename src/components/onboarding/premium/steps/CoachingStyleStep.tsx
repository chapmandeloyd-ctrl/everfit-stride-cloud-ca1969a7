import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";

type Style = "guided" | "self";

const FEATURES: Record<Style, string[]> = {
  guided: [
    "Coach accountability",
    "Personalized fasting adjustments",
    "Progress reviews",
    "Direct support",
    "Structured guidance",
  ],
  self: [
    "Fasting protocols",
    "Tracking tools",
    "Meal guidance",
    "Progress scoring",
  ],
};

export default function CoachingStyleStep({
  initial,
  onNext,
}: {
  initial: Style | null;
  onNext: (s: Style) => void;
}) {
  const [sel, setSel] = useState<Style | null>(initial);
  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Choose your coaching style</h2>
        <p className="mt-1 text-sm text-white/60">Both unlock the full system.</p>
      </div>

      <button
        onClick={() => setSel("guided")}
        className={`relative overflow-hidden rounded-2xl border p-5 text-left transition ${
          sel === "guided"
            ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)]"
            : "border-white/10 bg-white/[0.03] hover:border-white/20"
        }`}
      >
        <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[hsl(var(--primary))] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          <Sparkles className="h-3 w-3" /> Most Effective
        </div>
        <div className="text-lg font-semibold">Guided Coaching</div>
        <ul className="mt-3 space-y-1.5 text-sm text-white/75">
          {FEATURES.guided.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> {f}
            </li>
          ))}
        </ul>
      </button>

      <button
        onClick={() => setSel("self")}
        className={`relative overflow-hidden rounded-2xl border p-5 text-left transition ${
          sel === "self"
            ? "border-[hsl(174_72%_50%)] bg-[hsl(174_72%_50%/0.06)]"
            : "border-white/10 bg-white/[0.03] hover:border-white/20"
        }`}
      >
        <div className="absolute right-4 top-4 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
          Flexible
        </div>
        <div className="text-lg font-semibold">Self-Guided</div>
        <ul className="mt-3 space-y-1.5 text-sm text-white/75">
          {FEATURES.self.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-[hsl(174_72%_50%)]" /> {f}
            </li>
          ))}
        </ul>
      </button>

      <div className="mt-auto pb-2">
        <Button
          disabled={!sel}
          onClick={() => sel && onNext(sel)}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          {sel === "guided" ? "Apply For Coaching" : sel === "self" ? "Continue Self-Guided" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
