import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FastingTimer } from "@/components/FastingTimer";
import { cn } from "@/lib/utils";
import lionBg from "@/assets/fasting-timer-bg.png";
import { Check, ChevronDown, RotateCcw, Sparkles } from "lucide-react";

/**
 * Auto-playing, non-persisting walkthrough of the Full Plan builder.
 * Everything here is a scripted animation over fake data — it never reads
 * or writes real client state.
 */

const FUEL_OPTIONS = [
  { code: "APEX-B", name: "Apex Balance", macros: "P 50% · C 30% · F 20%", blurb: "Foundational daily fuel", color: "#ef4444" },
  { code: "APEX-P", name: "Apex Performance", macros: "P 45% · C 35% · F 20%", blurb: "High protein for muscle retention", color: "#3b82f6" },
  { code: "APEX-L", name: "Apex Lean", macros: "P 40% · C 30% · F 30%", blurb: "Strategic carb cycling for active lifestyles", color: "#22c55e" },
  { code: "APEX-R", name: "Apex Recomp", macros: "P 40% · C 30% · F 30%", blurb: "Fuel workouts on training days", color: "#eab308" },
  { code: "APEX-X", name: "Apex Low-Carb Extreme", macros: "P 20% · C 10% · F 70%", blurb: "Deep low-carb reset", color: "#a855f7" },
];
const FUEL_PICK = 2; // Apex Lean

const PROTOCOL_OPTIONS = [
  "16:8 Daily (16h)",
  "16:8 Weekdays (16h)",
  "18:6 Daily (18h)",
  "20:4 Warrior (20h)",
  "OMAD (23h)",
];
const PROTOCOL_PICK = 1;

const WEEK_ROWS = [
  { day: "MON", ratio: "16:8", start: "8:00 PM", breaks: "12:00 PM" },
  { day: "TUE", ratio: "16:8", start: "8:00 PM", breaks: "12:00 PM" },
  { day: "WED", ratio: "16:8", start: "8:00 PM", breaks: "12:00 PM" },
  { day: "THU", ratio: "16:8", start: "8:00 PM", breaks: "12:00 PM" },
  { day: "FRI", ratio: "18:6", start: "8:00 PM", breaks: "2:00 PM" },
  { day: "SAT", ratio: "OMAD", start: "7:00 PM", breaks: "6:00 PM" },
  { day: "SUN", ratio: "Eat all day", start: "—", breaks: "—" },
];

// ---- Timeline (ms) -------------------------------------------------------
const T = {
  thinking: 0,
  fuelOpen: 1100,
  fuelPick: 2300,
  protoOpen: 3200,
  protoPick: 4400,
  numbers: 5300,
  macros: 7000,
  schedule: 8400,
  saved: 11600,
  timerIntro: 12800,
  countdown: 13600,
  fasting: 17600,
  fastingEnd: 27600,
  done: 29000,
};
const TOTAL = T.done;

const TARGET_CALS = 1980;
const MACROS = [
  { label: "Protein", grams: 198, pct: 40, color: "#60a5fa" },
  { label: "Carbs", grams: 149, pct: 30, color: "#4ade80" },
  { label: "Fat", grams: 66, pct: 30, color: "#facc15" },
];

function useTicker(running: boolean, resetKey: number) {
  const [t, setT] = useState(0);
  const startRef = useRef(0);
  useEffect(() => {
    setT(0);
    if (!running) return;
    startRef.current = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const elapsed = now - startRef.current;
      setT(Math.min(elapsed, TOTAL));
      if (elapsed < TOTAL) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, resetKey]);
  return t;
}

function ease(x: number) {
  return 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
}
function seg(t: number, from: number, to: number) {
  return Math.min(Math.max((t - from) / (to - from), 0), 1);
}

function FieldShell({
  label,
  children,
  active,
}: {
  label: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">{label}</div>
      <div
        className={cn(
          "flex h-11 items-center justify-between gap-2 rounded-xl border px-3 text-sm transition-all duration-300",
          active
            ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))/10] shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
            : "border-white/10 bg-white/[0.04]"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function AutoBuilderDemo({ onFinish }: { onFinish?: () => void }) {
  const [resetKey, setResetKey] = useState(0);
  const t = useTicker(true, resetKey);
  const finished = t >= TOTAL;

  // ---- derived animation state ----
  const fuelOpen = t >= T.fuelOpen && t < T.fuelPick + 250;
  const fuelChosen = t >= T.fuelPick;
  const protoOpen = t >= T.protoOpen && t < T.protoPick + 250;
  const protoChosen = t >= T.protoPick;

  const numbersP = seg(t, T.numbers, T.macros);
  const weightTyped = useMemo(() => {
    const full = "185";
    const n = Math.round(ease(seg(t, T.numbers, T.numbers + 700)) * full.length);
    return full.slice(0, n);
  }, [t]);
  const goalSet = t >= T.numbers + 900;
  const activitySet = t >= T.numbers + 1300;

  const macroP = ease(seg(t, T.macros, T.macros + 1100));
  const calsShown = Math.round(macroP * TARGET_CALS);

  const rowsIn = Math.floor(seg(t, T.schedule, T.saved - 200) * WEEK_ROWS.length + 0.0001);
  const saved = t >= T.saved;

  const showTimer = t >= T.timerIntro;
  const countdownLeft = Math.max(0, Math.ceil((T.fasting - t) / 1000));
  const fastProgress = seg(t, T.fasting, T.fastingEnd);
  const isFasting = t >= T.fasting;

  useEffect(() => {
    if (finished) onFinish?.();
  }, [finished, onFinish]);

  const fakeStart = useMemo(() => new Date(2026, 0, 1, 20, 0, 0), []);
  const fakeNow = useMemo(
    () => new Date(fakeStart.getTime() + fastProgress * 16 * 3600000),
    [fakeStart, fastProgress]
  );

  const overallPct = (t / TOTAL) * 100;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* progress */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[hsl(var(--primary))]"
          style={{ width: `${overallPct}%` }}
        />
      </div>

      {!showTimer ? (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles
              className={cn(
                "h-4 w-4 text-[hsl(var(--primary))]",
                !saved && "animate-[pulse_1.4s_ease-in-out_infinite]"
              )}
            />
            <span className="text-sm font-semibold text-white">
              {saved ? "Plan built" : "APEXBEAST AI is building your plan…"}
            </span>
          </div>

          {/* Section 1 — fuel + protocol */}
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
              1 · Fuel Style &amp; Protocol
            </div>

            <div className="space-y-3">
              <div className="relative">
                <FieldShell label="Fuel Style" active={fuelOpen}>
                  <span className={cn("truncate", fuelChosen ? "text-white" : "text-white/40")}>
                    {fuelChosen
                      ? `${FUEL_OPTIONS[FUEL_PICK].code} · ${FUEL_OPTIONS[FUEL_PICK].name}`
                      : "Choose Fuel Style…"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-white/40" />
                </FieldShell>
                {fuelOpen && (
                  <div className="absolute left-0 right-0 top-[64px] z-20 space-y-1 rounded-xl border border-white/15 bg-[#0c0c0c] p-2 shadow-2xl animate-scale-in">
                    {FUEL_OPTIONS.map((o, i) => (
                      <div
                        key={o.code}
                        className={cn(
                          "rounded-lg px-2.5 py-2 transition-colors duration-200",
                          fuelChosen && i === FUEL_PICK && "bg-white/10"
                        )}
                      >
                        <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: o.color }}>
                          <span className="h-2 w-2 rounded-full" style={{ background: o.color }} />
                          {o.code} · {o.name}
                        </div>
                        <div className="mt-0.5 pl-4 text-[11px] text-white/55">
                          {o.macros} — {o.blurb}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <FieldShell label="Fasting Protocol" active={protoOpen}>
                  <span className={cn("truncate", protoChosen ? "text-white" : "text-white/40")}>
                    {protoChosen ? PROTOCOL_OPTIONS[PROTOCOL_PICK] : "Choose protocol…"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-white/40" />
                </FieldShell>
                {protoOpen && (
                  <div className="absolute left-0 right-0 top-[64px] z-20 space-y-0.5 rounded-xl border border-white/15 bg-[#0c0c0c] p-2 shadow-2xl animate-scale-in">
                    {PROTOCOL_OPTIONS.map((o, i) => (
                      <div
                        key={o}
                        className={cn(
                          "rounded-lg px-2.5 py-2 text-[13px] text-white/85 transition-colors duration-200",
                          protoChosen && i === PROTOCOL_PICK && "bg-[hsl(var(--primary))/25] text-white"
                        )}
                      >
                        {o}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2 — numbers */}
          {numbersP > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 animate-fade-in">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
                2 · Your Numbers
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FieldShell label="Weight (lbs)" active={weightTyped.length > 0 && weightTyped.length < 3}>
                  <span className="text-white">
                    {weightTyped || <span className="text-white/30">—</span>}
                    {weightTyped.length > 0 && weightTyped.length < 3 && (
                      <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-[2px] bg-[hsl(var(--primary))] align-middle animate-pulse" />
                    )}
                  </span>
                </FieldShell>
                <FieldShell label="Goal" active={goalSet && !activitySet}>
                  <span className={goalSet ? "text-white" : "text-white/30"}>
                    {goalSet ? "Cut (−20%)" : "—"}
                  </span>
                </FieldShell>
              </div>
              <div className="mt-3">
                <FieldShell label="Activity" active={activitySet && t < T.macros}>
                  <span className={activitySet ? "text-white" : "text-white/30"}>
                    {activitySet ? "Moderate (3–5 days/wk)" : "—"}
                  </span>
                </FieldShell>
              </div>
            </div>
          )}

          {/* Section 3 — macros */}
          {macroP > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 animate-fade-in">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
                  3 · Calculated Macros
                </span>
                <span className="text-sm font-bold tabular-nums text-white">
                  {calsShown.toLocaleString()} kcal
                </span>
              </div>
              <div className="space-y-2.5">
                {MACROS.map((m) => (
                  <div key={m.label}>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span style={{ color: m.color }}>{m.label}</span>
                      <span className="tabular-nums text-white/70">
                        {Math.round(m.grams * macroP)}g · {m.pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${m.pct * macroP}%`, background: m.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4 — weekly schedule */}
          {rowsIn > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 animate-fade-in">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
                4 · Weekly Fasting Schedule
              </div>
              <div className="space-y-1.5">
                {WEEK_ROWS.slice(0, rowsIn).map((r) => (
                  <div
                    key={r.day}
                    className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2 text-[12px] animate-fade-in"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 text-[10px] font-bold tracking-wider text-white/45">{r.day}</span>
                      <span className="font-semibold text-white">{r.ratio}</span>
                    </div>
                    <span className="text-white/55">
                      {r.start === "—" ? "No fast" : `Starts ${r.start} → breaks ${r.breaks}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {saved && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 animate-scale-in">
              <Check className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-300">Plan saved · timer armed</span>
            </div>
          )}
        </div>
      ) : (
        /* ---- Timer phase ---- */
        <div className="flex flex-1 flex-col items-center justify-center gap-4 animate-fade-in">
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[hsl(var(--primary))]">
              {isFasting ? "Your timer, live" : "Tonight at 8:00 PM"}
            </div>
            <div className="mt-1 text-sm text-white/60">
              {isFasting
                ? "16 hours, sped up — watch the ring and stages fill"
                : "The fast starts itself. No button to remember."}
            </div>
          </div>

          {!isFasting ? (
            <div className="flex flex-col items-center">
              <span className="text-[3rem] font-bold leading-none tabular-nums text-white drop-shadow-lg">
                00:00:0{countdownLeft}
              </span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
                Fast starts in
              </span>
              <div className="relative mt-2 h-[236px] w-[236px]">
                <img
                  src={lionBg}
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-90"
                />
                <svg width={236} height={236} className="relative">
                  <circle cx={118} cy={118} r={102} fill="none" stroke="black" strokeWidth={32} opacity={0.85} />
                  <circle cx={118} cy={118} r={102} fill="none" stroke="white" strokeWidth={1.5} opacity={0.7} />
                </svg>
              </div>
            </div>
          ) : (
            <FastingTimer
              fastStartAt={fakeStart.toISOString()}
              targetHours={16}
              now={fakeNow}
              demoProgress={fastProgress}
              compact
              centerImageSrc={lionBg}
            />
          )}

          {finished && (
            <Button
              variant="outline"
              onClick={() => setResetKey((k) => k + 1)}
              className="mt-2 rounded-full border-white/20 bg-white/5 text-xs hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Replay demo
            </Button>
          )}
        </div>
      )}
    </div>
  );
}