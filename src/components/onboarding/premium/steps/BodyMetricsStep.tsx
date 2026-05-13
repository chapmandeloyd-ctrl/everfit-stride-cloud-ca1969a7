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
  { key: "other", label: "Other" },
];

export default function BodyMetricsStep({ initial, onNext }: Props) {
  const [data, setData] = useState<Data>(initial);
  const bmi = computeBmi(data.heightCm, data.weightKg);

  const valid = data.age >= 13 && data.heightCm >= 120 && data.weightKg >= 30;

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
            <Label className="text-white/60">Height (cm)</Label>
            <Input
              type="number"
              value={data.heightCm || ""}
              onChange={(e) => setData({ ...data, heightCm: parseFloat(e.target.value) || 0 })}
              className="mt-1 border-white/10 bg-white/[0.03]"
              placeholder="175"
            />
          </div>
          <div>
            <Label className="text-white/60">Weight (kg)</Label>
            <Input
              type="number"
              value={data.weightKg || ""}
              onChange={(e) => setData({ ...data, weightKg: parseFloat(e.target.value) || 0 })}
              className="mt-1 border-white/10 bg-white/[0.03]"
              placeholder="80"
            />
          </div>
          <div>
            <Label className="text-white/60">Goal weight (kg)</Label>
            <Input
              type="number"
              value={data.goalWeightKg || ""}
              onChange={(e) =>
                setData({
                  ...data,
                  goalWeightKg: e.target.value ? parseFloat(e.target.value) : null,
                })
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
          onClick={() => onNext(data)}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
