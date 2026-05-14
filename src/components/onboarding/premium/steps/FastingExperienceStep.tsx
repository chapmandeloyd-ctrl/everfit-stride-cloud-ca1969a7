import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Coffee, Flame, Zap, AlertTriangle } from "lucide-react";

export type FastingExperienceLevel = "none" | "casual" | "regular" | "advanced";
export type FastingTolerance = "easy" | "manageable" | "challenging" | "difficult";
export type SafetyFlag =
  | "pregnant_breastfeeding"
  | "disordered_eating_history"
  | "diabetic_blood_sugar_meds"
  | "under_18"
  | "none";

export interface FastingExperienceData {
  experienceLevel: FastingExperienceLevel;
  longestFastHours: number | null;
  tolerance: FastingTolerance | null;
  safetyFlags: SafetyFlag[];
}

const EXPERIENCE_OPTIONS: {
  key: FastingExperienceLevel;
  title: string;
  desc: string;
  icon: any;
}[] = [
  { key: "none", title: "Never fasted", desc: "Fasting is new to me", icon: Sparkles },
  { key: "casual", title: "Tried it casually", desc: "Skipped meals, 12–14h here and there", icon: Coffee },
  { key: "regular", title: "Regular practice", desc: "16:8 multiple times a week", icon: Flame },
  { key: "advanced", title: "Advanced", desc: "18:6, OMAD, or 24h+ fasts", icon: Zap },
];

const LONGEST_OPTIONS: { hours: number; label: string }[] = [
  { hours: 13, label: "Under 14 hours" },
  { hours: 15, label: "14–16 hours" },
  { hours: 18, label: "16–20 hours" },
  { hours: 22, label: "20–24 hours" },
  { hours: 30, label: "Over 24 hours" },
];

const TOLERANCE_OPTIONS: { key: FastingTolerance; label: string; desc: string }[] = [
  { key: "easy", label: "Easy", desc: "I barely notice" },
  { key: "manageable", label: "Manageable", desc: "Some hunger, no issue" },
  { key: "challenging", label: "Challenging", desc: "I push through" },
  { key: "difficult", label: "Difficult", desc: "I often break early" },
];

const SAFETY_OPTIONS: { key: SafetyFlag; label: string }[] = [
  { key: "pregnant_breastfeeding", label: "Pregnant or breastfeeding" },
  { key: "disordered_eating_history", label: "History of disordered eating" },
  { key: "diabetic_blood_sugar_meds", label: "Diabetic / on blood sugar medication" },
  { key: "under_18", label: "Under 18" },
  { key: "none", label: "None of the above" },
];

export default function FastingExperienceStep({
  initial,
  onNext,
}: {
  initial: Partial<FastingExperienceData> | null;
  onNext: (data: FastingExperienceData) => void;
}) {
  const [sub, setSub] = useState<1 | 2 | 3 | 4>(1);
  const [level, setLevel] = useState<FastingExperienceLevel | null>(
    initial?.experienceLevel ?? null,
  );
  const [longest, setLongest] = useState<number | null>(initial?.longestFastHours ?? null);
  const [tol, setTol] = useState<FastingTolerance | null>(initial?.tolerance ?? null);
  const [flags, setFlags] = useState<SafetyFlag[]>(initial?.safetyFlags ?? []);

  const toggleFlag = (f: SafetyFlag) => {
    setFlags((prev) => {
      if (f === "none") return prev.includes("none") ? [] : ["none"];
      const without = prev.filter((x) => x !== "none");
      return without.includes(f) ? without.filter((x) => x !== f) : [...without, f];
    });
  };

  const finish = () => {
    if (!level) return;
    onNext({
      experienceLevel: level,
      longestFastHours: level === "none" ? null : longest,
      tolerance: level === "none" ? null : tol,
      safetyFlags: flags,
    });
  };

  const advanceFromLevel = () => {
    if (!level) return;
    if (level === "none") setSub(4);
    else setSub(2);
  };

  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-white/50">
          Your fasting profile · {sub}/{level === "none" ? 2 : 4}
        </div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          {sub === 1 && "Have you fasted before?"}
          {sub === 2 && "Longest fast you've completed?"}
          {sub === 3 && "How does fasting usually feel?"}
          {sub === 4 && "Anything we should know?"}
        </h2>
        {sub === 4 && (
          <p className="mt-1 text-sm text-white/60">
            For your safety. Select all that apply.
          </p>
        )}
      </div>

      {sub === 1 && (
        <div className="space-y-2.5">
          {EXPERIENCE_OPTIONS.map((o) => {
            const Icon = o.icon;
            const active = level === o.key;
            return (
              <button
                key={o.key}
                onClick={() => setLevel(o.key)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{o.title}</div>
                  <div className="text-xs text-white/55">{o.desc}</div>
                </div>
                {active && <Check className="h-4 w-4 text-[hsl(var(--primary))]" />}
              </button>
            );
          })}
        </div>
      )}

      {sub === 2 && (
        <div className="space-y-2.5">
          {LONGEST_OPTIONS.map((o) => {
            const active = longest === o.hours;
            return (
              <button
                key={o.hours}
                onClick={() => setLongest(o.hours)}
                className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                <span className="text-sm font-medium">{o.label}</span>
                {active && <Check className="h-4 w-4 text-[hsl(var(--primary))]" />}
              </button>
            );
          })}
        </div>
      )}

      {sub === 3 && (
        <div className="space-y-2.5">
          {TOLERANCE_OPTIONS.map((o) => {
            const active = tol === o.key;
            return (
              <button
                key={o.key}
                onClick={() => setTol(o.key)}
                className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                <div>
                  <div className="text-sm font-semibold">{o.label}</div>
                  <div className="text-xs text-white/55">{o.desc}</div>
                </div>
                {active && <Check className="h-4 w-4 text-[hsl(var(--primary))]" />}
              </button>
            );
          })}
        </div>
      )}

      {sub === 4 && (
        <div className="space-y-2.5">
          {SAFETY_OPTIONS.map((o) => {
            const active = flags.includes(o.key);
            const isWarn = o.key !== "none";
            return (
              <button
                key={o.key}
                onClick={() => toggleFlag(o.key)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                {isWarn && (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400/80" />
                )}
                <span className="flex-1 text-sm font-medium">{o.label}</span>
                {active && <Check className="h-4 w-4 text-[hsl(var(--primary))]" />}
              </button>
            );
          })}
          {flags.some((f) => f !== "none") && (
            <p className="px-1 pt-1 text-[11px] leading-snug text-amber-300/80">
              Based on your selection, we'll start you on the gentlest protocol and recommend you check in with your physician.
            </p>
          )}
        </div>
      )}

      <div className="mt-auto pb-2">
        {sub === 1 && (
          <Button
            onClick={advanceFromLevel}
            disabled={!level}
            size="lg"
            className="h-14 w-full rounded-2xl text-base font-medium"
          >
            Continue
          </Button>
        )}
        {sub === 2 && (
          <Button
            onClick={() => setSub(3)}
            disabled={longest === null}
            size="lg"
            className="h-14 w-full rounded-2xl text-base font-medium"
          >
            Continue
          </Button>
        )}
        {sub === 3 && (
          <Button
            onClick={() => setSub(4)}
            disabled={!tol}
            size="lg"
            className="h-14 w-full rounded-2xl text-base font-medium"
          >
            Continue
          </Button>
        )}
        {sub === 4 && (
          <Button
            onClick={finish}
            disabled={flags.length === 0}
            size="lg"
            className="h-14 w-full rounded-2xl text-base font-medium"
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}