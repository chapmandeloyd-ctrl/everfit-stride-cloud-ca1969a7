import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FastingTimer } from "@/components/FastingTimer";
import { cn } from "@/lib/utils";
import lionBg from "@/assets/fasting-timer-bg.png";
import { Check, ChevronDown, ChevronRight, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { useCaptionNarration } from "@/hooks/useCaptionNarration";

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
  fuelOpen: 4000,
  fuelPick: 7000,
  protoOpen: 10000,
  protoPick: 13000,
  numbers: 16000,
  macros: 23000,
  schedule: 30000,
  saved: 40000,
  timerIntro: 46000,
  countdown: 48000,
  fasting: 53000,
  fastingEnd: 68000,
  done: 71000,
};
const TOTAL = T.done;

/**
 * Narrated beats. Several beats can share the same timeline position — the
 * demo pauses on each one, the voice explains it, then the user taps Next.
 * This turns the walkthrough into a crash course on every dropdown option.
 */
type Beat = {
  chapter: string;
  at: number;
  title: string;
  caption: string;
  fuelHi?: number;
  protoHi?: number;
  /** When true the on-screen title is not spoken (avoids repeating the name). */
  captionOnly?: boolean;
};

const BEATS: Beat[] = [
  {
    chapter: "Intro",
    at: 0,
    title: "APEXBEAST AI takes over",
    caption:
      "Sit back. APEXBEAST AI is about to build your entire plan. Before each choice, I'll explain every option so you know exactly what you're picking.",
  },

  // ---- Fuel Style: one beat per option, then the pick ----
  {
    chapter: "Fuel",
    at: T.fuelOpen,
    title: "Fuel Style · Apex Balance",
    caption:
      "Fuel style, Apex Balance. Fifty percent protein, thirty percent carbs, twenty percent fat. This is your foundational everyday fuel — an even split that's the easiest to sustain long term.",
    fuelHi: 0,
    captionOnly: true,
  },
  {
    chapter: "Fuel",
    at: T.fuelOpen,
    title: "Fuel Style · Apex Performance",
    caption:
      "Fuel style, Apex Performance. Forty-five percent protein, thirty-five percent carbs, twenty percent fat. The highest carbs of the group, built for training volume so you protect muscle while you train hard.",
    fuelHi: 1,
    captionOnly: true,
  },
  {
    chapter: "Fuel",
    at: T.fuelOpen,
    title: "Fuel Style · Apex Lean",
    caption:
      "Fuel style, Apex Lean. Forty percent protein, thirty percent carbs, thirty percent fat, with strategic carb cycling — more carbs on training days, fewer on rest days. Made for active people who still want to drop fat.",
    fuelHi: 2,
    captionOnly: true,
  },
  {
    chapter: "Fuel",
    at: T.fuelOpen,
    title: "Fuel Style · Apex Recomp",
    caption:
      "Fuel style, Apex Recomp. Also forty, thirty, thirty, but loaded toward your training days. This is the one for building muscle and dropping fat at the same time.",
    fuelHi: 3,
    captionOnly: true,
  },
  {
    chapter: "Fuel",
    at: T.fuelOpen,
    title: "Fuel Style · Apex Low-Carb Extreme",
    caption:
      "Fuel style, Apex Low-Carb Extreme. Twenty percent protein, ten percent carbs, seventy percent fat. A deep low-carb reset for stubborn fat and strong appetite control.",
    fuelHi: 4,
    captionOnly: true,
  },
  {
    chapter: "Fuel",
    at: T.fuelPick,
    title: "Fuel Style selected",
    caption:
      "For this example we'll use Apex Lean.",
    fuelHi: 2,
    captionOnly: true,
  },

  // ---- Fasting Protocol: one beat per option, then the pick ----
  {
    chapter: "Protocol",
    at: T.protoOpen,
    title: "Protocol · 16:8 Daily",
    caption:
      "Sixteen eight daily. You fast sixteen hours and eat within eight, every single day. This is the proven starting point and the easiest rhythm to keep.",
    protoHi: 0,
    captionOnly: true,
  },
  {
    chapter: "Protocol",
    at: T.protoOpen,
    title: "Protocol · 16:8 Weekdays",
    caption:
      "Sixteen eight weekdays. The same sixteen hour fast Monday through Friday, with relaxed weekends. Best if you have a social schedule you don't want to fight.",
    protoHi: 1,
    captionOnly: true,
  },
  {
    chapter: "Protocol",
    at: T.protoOpen,
    title: "Protocol · 18:6 Daily",
    caption:
      "Eighteen six daily. Eighteen hours fasting, six hours eating. This pushes you deeper into ketosis every day — step up to it once sixteen eight feels easy.",
    protoHi: 2,
    captionOnly: true,
  },
  {
    chapter: "Protocol",
    at: T.protoOpen,
    title: "Protocol · 20:4 Warrior",
    caption:
      "Twenty four warrior. Twenty hours fasting with one large meal and one small one. Strong autophagy and serious appetite control.",
    protoHi: 3,
    captionOnly: true,
  },
  {
    chapter: "Protocol",
    at: T.protoOpen,
    title: "Protocol · OMAD",
    caption:
      "O-MAD, one meal a day. Twenty-three hours fasting. This is the maximum fat-burning window, and it's for advanced fasters only.",
    protoHi: 4,
    captionOnly: true,
  },
  {
    chapter: "Protocol",
    at: T.protoPick,
    title: "Protocol selected",
    caption:
      "For this example we'll use sixteen eight weekdays.",
    protoHi: 1,
    captionOnly: true,
  },

  // ---- Numbers ----
  {
    chapter: "Numbers",
    at: T.numbers,
    title: "Your numbers · Weight",
    caption:
      "Your current weight is the anchor for everything. It sets your baseline calorie burn, so keep it updated as you progress.",
  },
  {
    chapter: "Numbers",
    at: T.numbers + 900,
    title: "Your numbers · Goal",
    caption:
      "Your goal decides the direction. Cut pulls calories below your burn rate, maintain holds you steady, and gain pushes above it.",
  },
  {
    chapter: "Numbers",
    at: T.numbers + 1300,
    title: "Your numbers · Activity",
    caption:
      "Activity level tells the engine how much you move outside of fasting. Moderate means three to five training days a week.",
  },
  {
    chapter: "Numbers",
    at: T.numbers + 1600,
    title: "Your numbers · Recalculation",
    caption:
      "Change any one of these later and the whole plan recalculates — calories, macros, and every day on your calendar.",
  },

  // ---- Macros ----
  {
    chapter: "Macros",
    at: T.macros,
    title: "Calories",
    caption:
      "Your daily calorie target is calculated from your weight, activity, and goal. For this example that lands at one thousand nine hundred and eighty calories.",
  },
  {
    chapter: "Macros",
    at: T.macros + 1200,
    title: "Protein",
    caption:
      "Protein protects your muscle while you're in a deficit and keeps you full. One hundred and ninety-eight grams, forty percent of your intake.",
  },
  {
    chapter: "Macros",
    at: T.macros + 1400,
    title: "Carbs",
    caption:
      "Carbs fuel your training and refill glycogen. One hundred and forty-nine grams, thirty percent — cycled higher on training days.",
  },
  {
    chapter: "Macros",
    at: T.macros + 1600,
    title: "Fat",
    caption:
      "Fat drives your hormones and carries you through the fasted hours. Sixty-six grams, thirty percent of your intake.",
  },

  // ---- Weekly schedule ----
  {
    chapter: "Schedule",
    at: T.schedule,
    title: "Weekly schedule · Day types",
    caption:
      "Your week is built from four day types. Standard fasting days, harder days like eighteen six, an O-MAD day, and an eat all day — a full refeed with no fast, used to keep your metabolism and your adherence high.",
  },
  {
    chapter: "Schedule",
    at: T.schedule + 4000,
    title: "Weekly schedule · Weekdays",
    caption:
      "Monday through Thursday run your standard sixteen eight — fast starts at eight PM and breaks at noon the next day.",
  },
  {
    chapter: "Schedule",
    at: T.saved - 300,
    title: "Weekly schedule · Weekend",
    caption:
      "Friday steps up to eighteen six, Saturday runs an O-MAD, and Sunday is your eat all day. Hard days, lighter days, and a full eating day are all normal.",
  },

  // ---- Saved + timer ----
  {
    chapter: "Saved",
    at: T.saved,
    title: "Plan saved and armed",
    caption:
      "Your plan lands on the calendar and the timer is armed. You can still tweak a single day from the day strip at the top of your home page.",
  },
  {
    chapter: "Timer",
    at: T.timerIntro,
    title: "The fast starts itself",
    caption:
      "No button to remember — at your scheduled start time the timer arms and begins automatically.",
  },
  {
    chapter: "Fasting",
    at: T.fasting,
    title: "Watching the fast run",
    caption:
      "The ring fills as you move through each stage — blood sugar drop, glycogen burn, ketosis, then fat burning.",
  },
];

const CHAPTER_LABELS = Array.from(new Set(BEATS.map((b) => b.chapter)));

const TARGET_CALS = 1980;
const MACROS = [
  { label: "Protein", grams: 198, pct: 40, color: "#60a5fa" },
  { label: "Carbs", grams: 149, pct: 30, color: "#4ade80" },
  { label: "Fat", grams: 66, pct: 30, color: "#facc15" },
];

function useScrubbableTicker(resetKey: number, stopAt: number) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const tRef = useRef(0);
  const originRef = useRef(0);

  const commit = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), TOTAL);
    tRef.current = clamped;
    originRef.current = performance.now() - clamped;
    setT(clamped);
  };

  useEffect(() => {
    commit(0);
    setPlaying(true);
  }, [resetKey]);

  useEffect(() => {
    if (!playing) return;
    originRef.current = performance.now() - tRef.current;
    let raf = 0;
    const loop = (now: number) => {
      const elapsed = Math.min(now - originRef.current, stopAt, TOTAL);
      tRef.current = elapsed;
      setT(elapsed);
      if (elapsed < stopAt && elapsed < TOTAL) raf = requestAnimationFrame(loop);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, resetKey, stopAt]);

  const seek = (next: number) => commit(next);
  const toggle = () => {
    if (!playing && tRef.current >= TOTAL) commit(0);
    setPlaying((p) => !p);
  };

  const advance = (next: number) => {
    commit(next);
    setPlaying(true);
  };

  return { t, playing, seek, toggle, advance };
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
  pulse,
  done,
}: {
  label: string;
  children: React.ReactNode;
  active?: boolean;
  pulse?: boolean;
  done?: boolean;
}) {
  return (
    <div className="relative min-w-0">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors duration-300",
            active ? "text-[hsl(var(--primary))]" : "text-white/45"
          )}
        >
          {label}
        </span>
        {active && (
          <span className="rounded-full bg-[hsl(var(--primary))/20] px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
            AI
          </span>
        )}
        {!active && done && <Check className="h-3 w-3 text-emerald-400" />}
      </div>
      <div
        className={cn(
          "flex h-11 items-center justify-between gap-2 rounded-xl border px-3 text-sm transition-all duration-300",
          active
            ? cn(
                "border-[hsl(var(--primary))] bg-[hsl(var(--primary))/10] shadow-[0_0_0_4px_hsl(var(--primary)/0.18),0_0_22px_hsl(var(--primary)/0.35)]",
                pulse !== false && "scale-[1.015] animate-[pulse_1.6s_ease-in-out_infinite]"
              )
            : done
            ? "border-emerald-500/35 bg-emerald-500/[0.06]"
            : "border-white/10 bg-white/[0.04]"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function SectionCard({
  step,
  title,
  focused,
  children,
  className,
}: {
  step: number;
  title: string;
  focused?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focused]);
  return (
    <div
      ref={ref}
      className={cn(
        "relative rounded-2xl border p-4 transition-all duration-500",
        focused
          ? "border-[hsl(var(--primary))/60] bg-[hsl(var(--primary))/[0.06]] shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_0_30px_hsl(var(--primary)/0.18)]"
          : "border-white/10 bg-white/[0.03]",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.25em] transition-colors duration-300",
            focused ? "text-[hsl(var(--primary))]" : "text-white/40"
          )}
        >
          {step} · {title}
        </span>
        {focused && (
          <span className="flex items-center gap-1 rounded-full border border-[hsl(var(--primary))/40] bg-[hsl(var(--primary))/15] px-2 py-[2px] text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
            <Sparkles className="h-2.5 w-2.5" /> Filling now
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function AutoBuilderDemo({
  onFinish,
  narration: narrationProp,
}: {
  onFinish?: () => void;
  narration?: boolean;
}) {
  const [resetKey, setResetKey] = useState(0);
  const [guidedPage, setGuidedPage] = useState(0);
  const narration = narrationProp ?? false;
  const GUIDED_STARTS = useMemo(() => BEATS.map((beat) => beat.at), []);
  const pageStart = GUIDED_STARTS[guidedPage] ?? 0;
  const nextPageStart = GUIDED_STARTS[guidedPage + 1] ?? TOTAL;
  const pageStop = guidedPage === GUIDED_STARTS.length - 1 ? TOTAL : Math.max(pageStart, nextPageStart - 100);
  const { t, playing, toggle, advance } = useScrubbableTicker(resetKey, pageStop);
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

  // ---- what the AI is touching right now ----
  const focusFuel = t >= T.fuelOpen && t < T.protoOpen;
  const focusProto = t >= T.protoOpen && t < T.numbers;
  const focusSection1 = focusFuel || focusProto;
  const focusWeight = t >= T.numbers && t < T.numbers + 900;
  const focusGoal = t >= T.numbers + 900 && t < T.numbers + 1300;
  const focusActivity = t >= T.numbers + 1300 && t < T.macros;
  const focusNumbers = t >= T.numbers && t < T.macros;
  const focusMacros = t >= T.macros && t < T.schedule;
  const focusSchedule = t >= T.schedule && t < T.saved;

  const macroP = ease(seg(t, T.macros, T.macros + 1100));
  const calsShown = Math.round(macroP * TARGET_CALS);

  const rowsIn = Math.floor(seg(t, T.schedule, T.saved - 200) * WEEK_ROWS.length + 0.0001);
  const saved = t >= T.saved;

  const showTimer = t >= T.timerIntro;
  const countdownLeft = Math.max(0, Math.ceil((T.fasting - t) / 1000));
  const fastProgress = seg(t, T.fasting, T.fastingEnd);
  const isFasting = t >= T.fasting;

  const fakeStart = useMemo(() => new Date(2026, 0, 1, 20, 0, 0), []);
  const fakeNow = useMemo(
    () => new Date(fakeStart.getTime() + fastProgress * 16 * 3600000),
    [fakeStart, fastProgress]
  );

  const overallPct = (t / TOTAL) * 100;

  const activeBeat = BEATS[Math.min(guidedPage, BEATS.length - 1)];
  const activeCaption = activeBeat;

  const chapterBeats = useMemo(
    () => BEATS.filter((b) => b.chapter === activeBeat.chapter),
    [activeBeat.chapter]
  );
  const beatInChapter = chapterBeats.indexOf(activeBeat) + 1;
  const activeChapterIndex = CHAPTER_LABELS.indexOf(activeBeat.chapter);

  const {
    stop: stopNarration,
    isLoading: narrationLoading,
    isSpeaking,
    isComplete: narrationComplete,
  } = useCaptionNarration(
    narration
      ? activeCaption.captionOnly
        ? activeCaption.caption
        : `${activeCaption.title}. ${activeCaption.caption}`
      : "",
    narration
  );

  const pageAnimationComplete = t >= pageStop;
  const canAdvance = pageAnimationComplete && (!narration || narrationComplete);
  const isLastPage = guidedPage === GUIDED_STARTS.length - 1;

  const goNext = () => {
    if (!canAdvance) return;
    if (isLastPage) {
      onFinish?.();
      return;
    }
    stopNarration();
    const nextPage = guidedPage + 1;
    setGuidedPage(nextPage);
    advance(GUIDED_STARTS[nextPage] ?? TOTAL);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Guided progress — chapters advance only after narration + animation */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause demo" : "Play demo"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 translate-x-[1px]" />}
          </button>

          <div className="relative flex-1" aria-label={`Demo page ${guidedPage + 1} of ${GUIDED_STARTS.length}`}>
            <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[hsl(var(--primary))]"
                style={{ width: `${overallPct}%` }}
              />
            </div>
            {GUIDED_STARTS.slice(1).map((at, i) => (
              <span
                key={`${at}-${i}`}
                className="pointer-events-none absolute top-1/2 h-2 w-[2px] -translate-y-1/2 rounded-full bg-white/35"
                style={{ left: `${(at / TOTAL) * 100}%` }}
              />
            ))}
          </div>

          <span className="w-12 shrink-0 text-right text-[10px] tabular-nums text-white/50">
            {guidedPage + 1} / {GUIDED_STARTS.length}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5" aria-label="Demo chapters">
          {CHAPTER_LABELS.map((label, index) => (
            <span
              key={label}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                index === activeChapterIndex
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))/15] text-white"
                  : index < activeChapterIndex
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-white/[0.04] text-white/35"
              )}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* caption */}
      <div
        key={activeCaption.title}
        className="sticky top-0 z-30 min-h-[112px] rounded-2xl border border-white/10 bg-[hsl(0_0%_6%/0.96)] px-4 py-3 shadow-xl backdrop-blur-md animate-fade-in"
        aria-live="polite"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
            {activeCaption.title}
          </div>
          <span className="shrink-0 text-[10px] font-medium text-white/40">
            {chapterBeats.length > 1
              ? `${beatInChapter} of ${chapterBeats.length}`
              : `${activeChapterIndex + 1} of ${CHAPTER_LABELS.length}`}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/80">{activeCaption.caption}</p>
        <div className="mt-3 border-t border-white/10 pt-3">
          <Button
            type="button"
            size="sm"
            onClick={goNext}
            disabled={!canAdvance}
            className="h-10 w-full rounded-xl text-sm font-semibold"
          >
            {narration && narrationLoading
              ? "Preparing voice…"
              : narration && isSpeaking
              ? "Voice guide is speaking…"
              : !pageAnimationComplete
              ? "Showing this step…"
              : isLastPage
              ? "Finish demo"
              : "Click Next to continue"}
            {canAdvance && !isLastPage && <ChevronRight className="ml-1.5 h-4 w-4" />}
          </Button>
        </div>
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
          <SectionCard step={1} title="Fuel Style & Protocol" focused={focusSection1}>
            <div className="space-y-3">
              <div className="relative">
                <FieldShell
                  label="Fuel Style"
                  active={focusFuel}
                  pulse={focusFuel && activeBeat.fuelHi === undefined}
                  done={fuelChosen}
                >
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
                      <button
                        type="button"
                        key={o.code}
                        onClick={activeBeat.fuelHi === i ? goNext : undefined}
                        disabled={activeBeat.fuelHi !== i || !canAdvance}
                        className={cn(
                          "block w-full rounded-lg px-2.5 py-2 text-left transition-colors duration-200 disabled:cursor-default",
                          fuelChosen && i === FUEL_PICK && "bg-white/10",
                          activeBeat.fuelHi === i &&
                            "bg-white/10 ring-2 ring-[hsl(var(--primary))] shadow-[0_0_22px_hsl(var(--primary)/0.4)] animate-[pulse_1.2s_ease-in-out_infinite]"
                        )}
                      >
                        <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: o.color }}>
                          <span className="h-2 w-2 rounded-full" style={{ background: o.color }} />
                          {o.code} · {o.name}
                        </div>
                        <div className="mt-0.5 pl-4 text-[11px] text-white/55">
                          {o.macros} — {o.blurb}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <FieldShell
                  label="Fasting Protocol"
                  active={focusProto}
                  pulse={focusProto && activeBeat.protoHi === undefined}
                  done={protoChosen}
                >
                  <span className={cn("truncate", protoChosen ? "text-white" : "text-white/40")}>
                    {protoChosen ? PROTOCOL_OPTIONS[PROTOCOL_PICK] : "Choose protocol…"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-white/40" />
                </FieldShell>
                {protoOpen && (
                  <div className="absolute left-0 right-0 top-[64px] z-20 space-y-0.5 rounded-xl border border-white/15 bg-[#0c0c0c] p-2 shadow-2xl animate-scale-in">
                    {PROTOCOL_OPTIONS.map((o, i) => (
                      <button
                        type="button"
                        key={o}
                        onClick={activeBeat.protoHi === i ? goNext : undefined}
                        disabled={activeBeat.protoHi !== i || !canAdvance}
                        className={cn(
                          "block w-full rounded-lg px-2.5 py-2 text-left text-[13px] text-white/85 transition-colors duration-200 disabled:cursor-default",
                          protoChosen && i === PROTOCOL_PICK && "bg-[hsl(var(--primary))/25] text-white",
                          activeBeat.protoHi === i &&
                            "bg-white/10 text-white ring-2 ring-[hsl(var(--primary))] shadow-[0_0_22px_hsl(var(--primary)/0.4)] animate-[pulse_1.2s_ease-in-out_infinite]"
                        )}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Section 2 — numbers */}
          {t >= T.numbers && (
            <SectionCard step={2} title="Your Numbers" focused={focusNumbers} className="animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <FieldShell label="Weight (lbs)" active={focusWeight} done={weightTyped.length === 3}>
                  <span className="text-white">
                    {weightTyped || <span className="text-white/30">—</span>}
                    {weightTyped.length > 0 && weightTyped.length < 3 && (
                      <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-[2px] bg-[hsl(var(--primary))] align-middle animate-pulse" />
                    )}
                  </span>
                </FieldShell>
                <FieldShell label="Goal" active={focusGoal} done={goalSet}>
                  <span className={goalSet ? "text-white" : "text-white/30"}>
                    {goalSet ? "Cut (−20%)" : "—"}
                  </span>
                </FieldShell>
              </div>
              <div className="mt-3">
                <FieldShell label="Activity" active={focusActivity} done={activitySet}>
                  <span className={activitySet ? "text-white" : "text-white/30"}>
                    {activitySet ? "Moderate (3–5 days/wk)" : "—"}
                  </span>
                </FieldShell>
              </div>
            </SectionCard>
          )}

          {/* Section 3 — macros */}
          {t >= T.macros && (
            <SectionCard step={3} title="Calculated Macros" focused={focusMacros} className="animate-fade-in">
              <div className="mb-3 flex items-baseline justify-end">
                <span
                  className={cn(
                    "text-sm font-bold tabular-nums transition-colors duration-300",
                    focusMacros ? "text-[hsl(var(--primary))]" : "text-white"
                  )}
                >
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
                    <div
                      className={cn(
                        "h-2 overflow-hidden rounded-full bg-white/8 transition-shadow duration-300",
                        focusMacros && "shadow-[0_0_0_2px_hsl(var(--primary)/0.18)]"
                      )}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${m.pct * macroP}%`, background: m.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Section 4 — weekly schedule */}
          {t >= T.schedule && (
            <SectionCard step={4} title="Weekly Fasting Schedule" focused={focusSchedule} className="animate-fade-in">
              <div className="space-y-1.5">
                {WEEK_ROWS.slice(0, rowsIn).map((r, i) => (
                  <div
                    key={r.day}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-[12px] transition-all duration-300 animate-fade-in",
                      focusSchedule && i === rowsIn - 1
                        ? "border border-[hsl(var(--primary))/50] bg-[hsl(var(--primary))/10] shadow-[0_0_14px_hsl(var(--primary)/0.25)]"
                        : "border border-transparent bg-white/[0.04]"
                    )}
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
            </SectionCard>
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
              onClick={() => {
                stopNarration();
                setGuidedPage(0);
                setResetKey((k) => k + 1);
              }}
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