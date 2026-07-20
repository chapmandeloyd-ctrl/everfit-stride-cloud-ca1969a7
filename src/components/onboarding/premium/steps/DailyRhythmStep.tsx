import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sunrise, Moon, Briefcase, Utensils } from "lucide-react";

export interface DailyRhythmData {
  wakeTime: string;        // "07:00"
  sleepTime: string;       // "23:00"
  workSchedule: "nine_to_five" | "flexible" | "shift" | "night_shift";
  socialMealAnchor: "breakfast" | "lunch" | "dinner" | "none";
  weekendsDifferent: boolean;
}

const WORK = [
  { key: "nine_to_five", label: "9–5 office" },
  { key: "flexible",     label: "Flexible / remote" },
  { key: "shift",        label: "Shift work" },
  { key: "night_shift",  label: "Night shift" },
] as const;

const MEALS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch",     label: "Lunch" },
  { key: "dinner",    label: "Dinner" },
  { key: "none",      label: "No sacred meal" },
] as const;

export default function DailyRhythmStep({
  initial,
  onNext,
}: {
  initial: DailyRhythmData | null;
  onNext: (d: DailyRhythmData) => void;
}) {
  const [data, setData] = useState<DailyRhythmData>(
    initial ?? {
      wakeTime: "07:00",
      sleepTime: "23:00",
      workSchedule: "nine_to_five",
      socialMealAnchor: "dinner",
      weekendsDifferent: true,
    },
  );

  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-white/50">Your daily rhythm</div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">When does your day happen?</h2>
        <p className="mt-1 text-sm text-white/60">
          Your AI coach uses this so it never suggests a 6 AM break-fast if you don't wake up until 10.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/60">
            <Sunrise className="h-4 w-4" /> Wake time
          </div>
          <input
            type="time"
            value={data.wakeTime}
            onChange={(e) => setData({ ...data, wakeTime: e.target.value })}
            className="bg-transparent text-xl font-semibold text-white outline-none"
          />
        </label>
        <label className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/60">
            <Moon className="h-4 w-4" /> Sleep time
          </div>
          <input
            type="time"
            value={data.sleepTime}
            onChange={(e) => setData({ ...data, sleepTime: e.target.value })}
            className="bg-transparent text-xl font-semibold text-white outline-none"
          />
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-white/60">
          <Briefcase className="h-4 w-4" /> Work schedule
        </div>
        <div className="grid grid-cols-2 gap-2">
          {WORK.map((w) => (
            <button
              key={w.key}
              onClick={() => setData({ ...data, workSchedule: w.key })}
              className={`rounded-xl border p-3 text-sm ${
                data.workSchedule === w.key
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] text-white"
                  : "border-white/10 bg-white/[0.02] text-white/80"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-white/60">
          <Utensils className="h-4 w-4" /> Which meal is sacred / social?
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MEALS.map((m) => (
            <button
              key={m.key}
              onClick={() => setData({ ...data, socialMealAnchor: m.key })}
              className={`rounded-xl border p-3 text-sm ${
                data.socialMealAnchor === m.key
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] text-white"
                  : "border-white/10 bg-white/[0.02] text-white/80"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <input
          type="checkbox"
          checked={data.weekendsDifferent}
          onChange={(e) => setData({ ...data, weekendsDifferent: e.target.checked })}
          className="h-4 w-4 accent-[hsl(var(--primary))]"
        />
        <span className="text-sm text-white/80">Weekends look different from weekdays</span>
      </label>

      <div className="mt-auto pb-2">
        <Button onClick={() => onNext(data)} size="lg" className="h-14 w-full rounded-2xl text-base font-medium">
          Continue
        </Button>
      </div>
    </div>
  );
}