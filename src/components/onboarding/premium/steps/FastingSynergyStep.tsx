import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sparkles, Flame, Zap, Activity, Check } from "lucide-react";
import { SYNERGIES, SYNERGY_LIST, type SynergyKey } from "@/lib/onboarding/synergies";

const ICONS: Record<string, any> = { Sparkles, Flame, Zap, Activity };

export default function FastingSynergyStep({
  recommended,
  initial,
  onNext,
}: {
  recommended: SynergyKey;
  initial: SynergyKey | null;
  onNext: (k: SynergyKey) => void;
}) {
  const [sel, setSel] = useState<SynergyKey>(initial ?? recommended);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? SYNERGY_LIST : [SYNERGIES[recommended]];

  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-white/50">Personalized for you</div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Select your fasting synergy</h2>
      </div>

      <div className="space-y-3">
        {visible.map((s) => {
          const Icon = ICONS[s.icon] ?? Sparkles;
          const isSelected = sel === s.key;
          const isRec = s.key === recommended;
          return (
            <button
              key={s.key}
              onClick={() => setSel(s.key)}
              className={`relative w-full overflow-hidden rounded-2xl border p-5 text-left transition ${
                isSelected
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              {isRec && (
                <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[hsl(var(--primary))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  <Sparkles className="h-3 w-3" /> Recommended
                </div>
              )}
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold">{s.name}</div>
                  <div className="mt-0.5 text-xs text-white/55">
                    {s.difficulty} · {s.window}
                  </div>
                  <div className="mt-2 text-sm text-white/75">{s.description}</div>
                  <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/45">
                    Best for: {s.bestFor}
                  </div>
                </div>
                {isSelected && (
                  <Check className="h-5 w-5 shrink-0 text-[hsl(var(--primary))]" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {!showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-center text-sm text-white/60 underline-offset-4 hover:underline"
        >
          See other options
        </button>
      )}

      <div className="mt-auto pb-2">
        <Button onClick={() => onNext(sel)} size="lg" className="h-14 w-full rounded-2xl text-base font-medium">
          Continue with {SYNERGIES[sel].name}
        </Button>
      </div>
    </div>
  );
}
