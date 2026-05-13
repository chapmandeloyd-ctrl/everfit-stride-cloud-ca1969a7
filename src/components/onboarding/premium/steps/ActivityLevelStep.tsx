import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { ActivityLevel } from "@/lib/onboarding/metabolicCalc";
import { Activity, Bike, Dumbbell, Footprints, Trophy } from "lucide-react";

const OPTIONS: { key: ActivityLevel; label: string; helper: string; Icon: any }[] = [
  { key: "sedentary", label: "Sedentary", helper: "Mostly desk work with little exercise", Icon: Footprints },
  { key: "lightly", label: "Lightly Active", helper: "Light walking 1–3 days/week", Icon: Activity },
  { key: "moderately", label: "Moderately Active", helper: "Training 3–5 days/week", Icon: Bike },
  { key: "highly", label: "Highly Active", helper: "Structured training 5–6 days/week", Icon: Dumbbell },
  { key: "athlete", label: "Athlete", helper: "Daily training and competition", Icon: Trophy },
];

export default function ActivityLevelStep({
  initial,
  onNext,
}: {
  initial: ActivityLevel | null;
  onNext: (a: ActivityLevel) => void;
}) {
  const [sel, setSel] = useState<ActivityLevel | null>(initial);
  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">How active are you currently?</h2>
        <p className="mt-1 text-sm text-white/60">Honest answers calibrate your protocol.</p>
      </div>

      <div className="space-y-2.5">
        {OPTIONS.map(({ key, label, helper, Icon }) => {
          const active = sel === key;
          return (
            <button
              key={key}
              onClick={() => setSel(key)}
              className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  active ? "bg-[hsl(var(--primary)/0.2)]" : "bg-white/5"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{label}</div>
                <div className="text-xs text-white/55">{helper}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-auto pb-2">
        <Button
          disabled={!sel}
          onClick={() => sel && onNext(sel)}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
