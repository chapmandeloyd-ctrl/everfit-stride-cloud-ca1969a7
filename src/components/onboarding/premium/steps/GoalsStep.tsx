import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Check } from "lucide-react";

const GOALS = [
  "Fat Loss",
  "Energy",
  "Blood Sugar Stability",
  "Reduce Cravings",
  "Mental Clarity",
  "Longevity",
  "Better Sleep",
  "Performance",
  "Reduce Belly Fat",
  "Hormonal Support",
];

export default function GoalsStep({
  initial,
  onNext,
}: {
  initial: string[];
  onNext: (goals: string[]) => void;
}) {
  const [sel, setSel] = useState<string[]>(initial);
  const toggle = (g: string) =>
    setSel((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">What would you like to improve?</h2>
        <p className="mt-1 text-sm text-white/60">Select all that apply.</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {GOALS.map((g) => {
          const active = sel.includes(g);
          return (
            <button
              key={g}
              onClick={() => toggle(g)}
              className={`relative rounded-2xl border p-4 text-left text-sm transition ${
                active
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              <span className="block font-medium">{g}</span>
              {active && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--primary))]">
                  <Check className="h-3 w-3 text-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto pb-2">
        <Button
          disabled={sel.length === 0}
          onClick={() => onNext(sel)}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
