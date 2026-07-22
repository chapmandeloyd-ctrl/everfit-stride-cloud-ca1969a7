import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Coffee, Leaf, Sparkles, AlertTriangle, Pencil } from "lucide-react";
import { recommendFuelStyle, type RecommenderInput, type FuelStyle } from "@/lib/onboarding/aiRecommender";

export interface FuelPreferenceData {
  fuelStyle: FuelStyle;
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
  context,
  onNext,
}: {
  initial: FuelPreferenceData | null;
  context: RecommenderInput;
  onNext: (d: FuelPreferenceData) => void;
}) {
  const rec = useMemo(() => recommendFuelStyle(context), [context]);
  const [data, setData] = useState<FuelPreferenceData>(
    initial ?? { fuelStyle: rec.choice, dietaryRestrictions: [], caffeine: "morning" },
  );
  const [adjusting, setAdjusting] = useState(false);
  const chosen = FUEL.find((f) => f.key === data.fuelStyle) ?? FUEL[0];

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
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[hsl(var(--primary))]">
          <Sparkles className="h-3.5 w-3.5" /> Apex360 AI Recommends
        </div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Your fuel style</h2>
        <p className="mt-1 text-sm text-white/60">Built from what you told us — you can adjust below.</p>
      </div>

      {/* AI pick card */}
      <div className="rounded-2xl border border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] p-4">
        <div className="flex items-baseline justify-between">
          <div className="text-xl font-semibold">{chosen.key}</div>
          <div className="text-[11px] uppercase tracking-wider text-white/60">Recommended</div>
        </div>
        <div className="mt-0.5 text-xs text-white/70">{chosen.desc}</div>
        <div className="mt-3 space-y-1.5">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div className="h-full bg-sky-400" style={{ width: `${chosen.macros.p}%` }} />
            <div className="h-full bg-emerald-400" style={{ width: `${chosen.macros.c}%` }} />
            <div className="h-full bg-amber-400" style={{ width: `${chosen.macros.f}%` }} />
          </div>
          <div className="flex justify-between text-[10px] font-medium tabular-nums text-white/70">
            <span><span className="text-sky-400">■</span> P {chosen.macros.p}%</span>
            <span><span className="text-emerald-400">■</span> C {chosen.macros.c}%</span>
            <span><span className="text-amber-400">■</span> F {chosen.macros.f}%</span>
          </div>
        </div>
        <ul className="mt-4 space-y-1.5 text-sm text-white/80">
          {rec.reasons.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-[hsl(var(--primary))]" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
        {rec.warning && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-2.5 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>{rec.warning}</span>
          </div>
        )}
        {!rec.warning && (
          <button
            onClick={() => setAdjusting((v) => !v)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2 text-xs font-medium text-white/70 hover:bg-white/5"
          >
            <Pencil className="h-3 w-3" /> {adjusting ? "Hide options" : "Adjust fuel style"}
          </button>
        )}
      </div>

      {adjusting && !rec.warning && (
        <div className="space-y-2">
          {FUEL.map((f) => (
            <button
              key={f.key}
              onClick={() => setData({ ...data, fuelStyle: f.key })}
              className={`w-full rounded-xl border p-3 text-left transition ${
                data.fuelStyle === f.key
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)]"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{f.key}</div>
                <div className="text-[10px] tabular-nums text-white/60">
                  P{f.macros.p}/C{f.macros.c}/F{f.macros.f}
                </div>
              </div>
              <div className="text-[11px] text-white/60">{f.desc}</div>
            </button>
          ))}
        </div>
      )}

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