import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BodySilhouette from "../BodySilhouette";
import { computeBmi, type Sex } from "@/lib/onboarding/metabolicCalc";

interface Data {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number | null;
}

interface Props {
  initial: Data;
  onNext: (data: Data) => void;
}

const SEX_OPTIONS: { key: Sex; label: string }[] = [
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
];

export default function BodyMetricsStep({ initial, onNext }: Props) {
  const [data, setData] = useState<Data>(initial);
  // Imperial display state derived from metric storage
  const initialFeet = data.heightCm ? Math.floor(data.heightCm / 2.54 / 12) : 0;
  const initialInches = data.heightCm
    ? Math.round((data.heightCm / 2.54) - initialFeet * 12)
    : 0;
  const [feet, setFeet] = useState<number>(initialFeet);
  const [inches, setInches] = useState<number>(initialInches);
  const [lbs, setLbs] = useState<number>(
    data.weightKg ? +(data.weightKg * 2.20462).toFixed(0) : 0,
  );
  const [goalLbs, setGoalLbs] = useState<number | null>(
    data.goalWeightKg ? +(data.goalWeightKg * 2.20462).toFixed(0) : null,
  );

  const heightCm = +(((feet * 12) + inches) * 2.54).toFixed(1);
  const weightKg = +(lbs / 2.20462).toFixed(1);
  const goalWeightKg = goalLbs ? +(goalLbs / 2.20462).toFixed(1) : null;

  const bmi = computeBmi(heightCm, weightKg);
  const valid = data.age >= 13 && heightCm >= 120 && weightKg >= 30;

  const handleNext = () => {
    onNext({ ...data, heightCm, weightKg, goalWeightKg });
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Body metrics</h2>
        <p className="mt-1 text-sm text-white/60">A few essentials to calibrate your snapshot.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-white/50">Live BMI</div>
          <div className="mt-1 text-3xl font-semibold">{bmi || "—"}</div>
        </div>
        <BodySilhouette bmi={bmi || 22} sex={data.sex} />
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {SEX_OPTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setData({ ...data, sex: s.key })}
              className={`rounded-xl border px-3 py-3 text-sm transition ${
                data.sex === s.key
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.12)] text-foreground"
                  : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-white/60">Age</Label>
            <Input
              type="number"
              value={data.age || ""}
              onChange={(e) => setData({ ...data, age: parseInt(e.target.value) || 0 })}
              className="mt-1 border-white/10 bg-white/[0.03]"
              placeholder="32"
            />
          </div>
          <div>
            <Label className="text-white/60">Weight (lbs)</Label>
            <Input
              type="number"
              value={lbs || ""}
              onChange={(e) => setLbs(parseFloat(e.target.value) || 0)}
              className="mt-1 border-white/10 bg-white/[0.03]"
              placeholder="180"
            />
          </div>
          <div>
            <Label className="text-white/60">Height</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Input
                type="number"
                value={feet || ""}
                onChange={(e) => setFeet(parseInt(e.target.value) || 0)}
                className="border-white/10 bg-white/[0.03]"
                placeholder="ft"
              />
              <Input
                type="number"
                value={inches || ""}
                onChange={(e) => setInches(parseInt(e.target.value) || 0)}
                className="border-white/10 bg-white/[0.03]"
                placeholder="in"
              />
            </div>
          </div>
          <div>
            <Label className="text-white/60">Goal weight (lbs)</Label>
            <Input
              type="number"
              value={goalLbs || ""}
              onChange={(e) =>
                setGoalLbs(e.target.value ? parseFloat(e.target.value) : null)
              }
              className="mt-1 border-white/10 bg-white/[0.03]"
              placeholder="Optional"
            />
          </div>
        </div>
      </div>

      <div className="mt-auto pb-2">
        <Button
          disabled={!valid}
          onClick={handleNext}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
