import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Coffee, Leaf } from "lucide-react";

export interface FuelPreferenceData {
  fuelStyle: "Balance" | "Performance" | "Lean" | "Recomp" | "Extreme";
  dietaryRestrictions: string[];
  caffeine: "none" | "morning" | "all_day";
}

const FUEL = [
  { key: "Balance",     desc: "Sustainable, everyday nutrition", macros: { p: 30, c: 40, f: 30 } },
  { key: "Performance", desc: "Training-day fuel priority",      macros: { p: 30, c: 45, f: 25 } },
  { key: "Lean",        desc: "Fat loss with muscle retention",  macros: { p: 40, c: 30, f: 30 } },
  { key: "Recomp",      desc: "Rebuild composition",             macros: { p: 35, c: 35, f: 30 } },
  { key: "Extreme",     desc: "Aggressive cut (short-term)",     macros: { p: 45, c: 20, f: 35 } },
] as const;

const DIET = ["Vegetarian", "Vegan", "Dairy-free", "Gluten-free", "Nut allergy", "No pork", "No shellfish"];

export default function FuelPreferenceStep({
  initial,
  onNext,
}: {
  initial: FuelPreferenceData | null;
  onNext: (d: FuelPreferenceData) => void;
}) {
  const [data, setData] = useState<FuelPreferenceData>(
    initial ?? { fuelStyle: "Balance", dietaryRestrictions: [], caffeine: "morning" },
  );

  const toggleDiet = (d: string) =>
    setData((s) => ({
      ...s,
      dietaryRestrictions: s.dietaryRestrictions.includes(d)
        ? s.dietaryRestrictions.filter((x) => x !== d)
        : [...s.dietaryRestrictions, d],
    }));

  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-white/50">Fuel preference</div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">How do you want to eat?</h2>
      </div>
      <div className="space-y-2">
        {FUEL.map((f) => (
          <button
            key={f.key}
            onClick={() => setData({ ...data, fuelStyle: f.key })}
            className={`w-full rounded-2xl border p-4 text-left transition ${
              data.fuelStyle === f.key
                ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)]"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <div className="text-base font-semibold text-white">{f.key}</div>
            <div className="text-xs text-white/60">{f.desc}</div>
            <div className="mt-3 space-y-1.5">
              <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div className="h-full bg-sky-400" style={{ width: `${f.macros.p}%` }} />
                <div className="h-full bg-emerald-400" style={{ width: `${f.macros.c}%` }} />
                <div className="h-full bg-amber-400" style={{ width: `${f.macros.f}%` }} />
              </div>
              <div className="flex justify-between text-[10px] font-medium tabular-nums text-white/70">
                <span><span className="text-sky-400">■</span> P {f.macros.p}%</span>
                <span><span className="text-emerald-400">■</span> C {f.macros.c}%</span>
                <span><span className="text-amber-400">■</span> F {f.macros.f}%</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-white/60">
          <Leaf className="h-4 w-4" /> Any foods to avoid?
        </div>
        <div className="flex flex-wrap gap-2">
          {DIET.map((d) => (
            <button
              key={d}
              onClick={() => toggleDiet(d)}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                data.dietaryRestrictions.includes(d)
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.12)] text-white"
                  : "border-white/15 bg-white/[0.02] text-white/70"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-white/60">
          <Coffee className="h-4 w-4" /> Caffeine
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["none", "morning", "all_day"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setData({ ...data, caffeine: c })}
              className={`rounded-xl border p-2.5 text-sm capitalize ${
                data.caffeine === c
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] text-white"
                  : "border-white/10 bg-white/[0.02] text-white/80"
              }`}
            >
              {c.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-auto pb-2">
        <Button onClick={() => onNext(data)} size="lg" className="h-14 w-full rounded-2xl text-base font-medium">
          Continue
        </Button>
      </div>
    </div>
  );
}