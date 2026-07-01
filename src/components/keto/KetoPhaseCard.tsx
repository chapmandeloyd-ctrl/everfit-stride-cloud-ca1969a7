import { Flame, Zap, ShieldCheck } from "lucide-react";

type PhaseKey = "start" | "adjustment" | "maintenance";

interface PhaseDef {
  key: PhaseKey;
  label: string;
  range: string;
  headline: string;
  cues: string[];
  icon: typeof Flame;
  color: string; // tailwind hue
}

const PHASES: PhaseDef[] = [
  {
    key: "start",
    label: "Start",
    range: "Days 1–7",
    headline: "Keto flu window",
    cues: [
      "Hydrate heavy — 3L water minimum",
      "Sodium, potassium, magnesium daily",
      "Expect low energy — this is normal",
      "Keep carbs under 20g net",
    ],
    icon: Flame,
    color: "amber",
  },
  {
    key: "adjustment",
    label: "Adjustment",
    range: "Days 8–21",
    headline: "Fat adaptation",
    cues: [
      "Energy should stabilize this week",
      "Cravings drop — trust the curve",
      "Add light training back in",
      "Track ketones if you have strips",
    ],
    icon: Zap,
    color: "sky",
  },
  {
    key: "maintenance",
    label: "Maintenance",
    range: "Day 22+",
    headline: "Dialed in",
    cues: [
      "You're fat-adapted — protect it",
      "Dial macros to your goal",
      "Re-feeds only if your coach says so",
      "Watch hidden carbs in sauces/dressings",
    ],
    icon: ShieldCheck,
    color: "emerald",
  },
];

function computePhase(startISO: string): {
  current: PhaseDef;
  daysIn: number;
  daysUntilNext: number | null;
  progressPct: number;
} {
  const start = new Date(startISO).getTime();
  const daysIn = Math.max(0, Math.floor((Date.now() - start) / 86400000));
  let current: PhaseDef;
  let daysUntilNext: number | null;
  let progressPct: number;
  if (daysIn < 7) {
    current = PHASES[0];
    daysUntilNext = 7 - daysIn;
    progressPct = ((daysIn + 1) / 7) * 100;
  } else if (daysIn < 21) {
    current = PHASES[1];
    daysUntilNext = 21 - daysIn;
    progressPct = ((daysIn - 6) / 14) * 100;
  } else {
    current = PHASES[2];
    daysUntilNext = null;
    progressPct = 100;
  }
  return { current, daysIn, daysUntilNext, progressPct };
}

export function KetoPhaseCard({
  startDate,
  themeColor,
}: {
  startDate: string | null | undefined;
  themeColor?: string;
}) {
  if (!startDate) return null;
  const { current, daysIn, daysUntilNext, progressPct } = computePhase(startDate);
  const Icon = current.icon;
  const accent = themeColor ?? "hsl(var(--primary))";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-4"
      style={{
        borderColor: `${accent}55`,
        background: `linear-gradient(180deg, ${accent}12 0%, transparent 60%), hsl(var(--card))`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${accent}25`, color: accent }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: accent }}
          >
            Protocol Phase · {current.range}
          </p>
          <p className="text-base font-black leading-tight">
            {current.label} — {current.headline}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Day {daysIn + 1} on plan
            {daysUntilNext !== null &&
              ` · ${daysUntilNext} day${daysUntilNext === 1 ? "" : "s"} until next phase`}
          </p>
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, Math.max(4, progressPct))}%`, background: accent }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        {PHASES.map((p) => (
          <span
            key={p.key}
            style={{ color: p.key === current.key ? accent : undefined }}
          >
            {p.label}
          </span>
        ))}
      </div>

      <ul className="mt-4 space-y-1.5">
        {current.cues.map((cue) => (
          <li key={cue} className="flex items-start gap-2 text-xs text-foreground/85">
            <span
              className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
              style={{ background: accent }}
            />
            <span>{cue}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}