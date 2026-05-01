import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { PairRequiredDialog } from "@/components/client/PairRequiredDialog";

/**
 * Editorial Black & Gold — Fasting Plan Detail (TOP HALF).
 * Locked design: Variant 2 (Gold numeral hero) + Wheel picker.
 */

const GOLD = "hsl(42 70% 55%)";
const GOLD_SOFT = "hsl(42 60% 65%)";
const IVORY = "hsl(40 20% 92%)";
const MUTED = "hsl(40 10% 60%)";
const BLACK = "hsl(0 0% 4%)";
const SURFACE = "hsl(0 0% 7%)";
const SURFACE_2 = "hsl(0 0% 10%)";

const SAMPLE = {
  eyebrow: "Beginner Window",
  name: "Easy Start+",
  numeral: "14",
  fastHours: 14,
  eatHours: 10,
  description:
    "Start skipping breakfast, and don't snack in the evening after dinner. Include a variety of healthy whole foods at each meal.",
};

/* ---------- LIVE PLAN TYPE ---------- */
interface PlanView {
  eyebrow: string;
  name: string;
  numeral: string;
  fastHours: number;
  eatHours: number;
  description: string;
  opensAt: string;
  closesAt: string;
}

const TIER_EYEBROW: Record<string, string> = {
  low: "Beginner Window",
  medium: "Intermediate Window",
  high: "Advanced Window",
  extreme: "Extended Fast",
};

function pickDescription(desc: unknown): string {
  if (typeof desc === "string") return desc;
  if (desc && typeof desc === "object") {
    const d = desc as Record<string, unknown>;
    return (
      (typeof d.how_it_works === "string" && d.how_it_works) ||
      (typeof d.subtitle === "string" && d.subtitle) ||
      (typeof d.focus === "string" && d.focus) ||
      ""
    );
  }
  return "";
}

function pickWindowTimes(desc: unknown): { opensAt: string; closesAt: string } {
  let opens = "10:00 AM";
  let closes = "8:00 PM";
  if (desc && typeof desc === "object") {
    const d = desc as Record<string, unknown>;
    const ds = d.daily_structure as Record<string, unknown> | undefined;
    if (ds && typeof ds === "object") {
      if (typeof ds.break_fast === "string") {
        // e.g. "11:00 AM–12:00 PM" → opens at start
        opens = ds.break_fast.split(/[–-]/)[0].trim();
      }
      if (typeof ds.stop_eating === "string") {
        const parts = ds.stop_eating.split(/[–-]/);
        closes = (parts[1] || parts[0]).trim();
      }
    }
  }
  return { opensAt: opens, closesAt: closes };
}

/* ---------- KETO TYPES (mock library) ---------- */
const KETO_TYPES = [
  { id: "skd", abbr: "SKD", name: "Standard Keto", matchScore: 95 },
  { id: "hpkd", abbr: "HPKD", name: "High Protein", matchScore: 88 },
  { id: "ckd", abbr: "CKD", name: "Cyclical", matchScore: 72 },
  { id: "tkd", abbr: "TKD", name: "Targeted", matchScore: 65 },
  { id: "lazy", abbr: "LAZY", name: "Lazy Keto", matchScore: 50 },
  { id: "dirty", abbr: "DIRTY", name: "Dirty Keto", matchScore: 40 },
];

const SYNERGY_COPY: Record<string, { intro: string; bullets: string[] }> = {
  skd: {
    intro: "A 14-hour fast paired with Standard Keto creates a clean, sustainable burn — your eating window is long enough to hit fat + moderate protein without rushing macros.",
    bullets: [
      "Glycogen drains overnight; ketones rise gently",
      "10h window = 2 keto meals + 1 fat-led snack",
      "Easiest entry point for metabolic flexibility",
    ],
  },
  hpkd: {
    intro: "14h fasting × HPKD prioritizes lean mass. The shorter fast keeps cortisol calm while the 30%+ protein refeed drives muscle protein synthesis.",
    bullets: [
      "Protein-led refeed protects lean tissue",
      "Best paired with strength training in the eating window",
      "Higher satiety — easier to hold the 14h fast",
    ],
  },
  ckd: { intro: "Cyclical keto rotates a carb refeed once or twice weekly. With a 14h fast, time the refeed inside your eating window for maximum glycogen reload.", bullets: ["Refeed days = inside the 10h window only","Train hard on refeed days","Strict keto on the other 5 days"] },
  tkd: { intro: "Targeted keto adds 15–30g carbs pre-workout. The 14h fast lets you train fasted or fed depending on session intensity.", bullets: ["Pre-workout carbs only","Stay ≤50g net total","Best for performance days"] },
  lazy: { intro: "Lazy keto tracks carbs only. With a 14h fast, the simpler structure keeps adherence high while you build the habit.", bullets: ["Carbs ≤20g — that's the only rule","Don't stress fat or protein grams","Great for beginners"] },
  dirty: { intro: "Dirty keto allows processed keto-friendly foods. Useful as a transition tool but not the long-term play.", bullets: ["Convenience over food quality","Watch sodium and seed oils","Plan to graduate to SKD"] },
};

/* ---------- SYNERGY PRIMER (above Start button) ----------
 * Editorial coach voice. Dynamic per protocol + keto type.
 * Headline + 3 micro-bullets — the user's last beat before they commit.
 */
const SYNERGY_PRIMER: Record<
  string,
  { headline: string; bullets: [string, string, string] }
> = {
  skd: {
    headline: "Your 14h fast + Standard Keto, working as one.",
    bullets: ["Steady all-day energy", "Easier fasts by week two", "Faster fat-adaptation"],
  },
  hpkd: {
    headline: "Your 14h fast + High-Protein Keto protect lean mass while you burn fat.",
    bullets: ["Muscle stays on", "Stronger lifts in the window", "Highest satiety of any keto"],
  },
  ckd: {
    headline: "Your 14h fast + Cyclical Keto give you keto's burn with a weekly carb reload.",
    bullets: ["Train hard on refeed days", "Strict ketosis the rest of the week", "Best for athletes"],
  },
  tkd: {
    headline: "Your 14h fast + Targeted Keto fuel your workouts without breaking ketosis.",
    bullets: ["Pre-workout carbs only", "Power on demand", "Built for performance days"],
  },
  lazy: {
    headline: "Your 14h fast + Lazy Keto keep it simple — one rule, real results.",
    bullets: ["Track carbs, ignore the rest", "Highest adherence", "Perfect first month"],
  },
  dirty: {
    headline: "Your 14h fast + Dirty Keto get you started today, no meal-prep required.",
    bullets: ["Convenience-first", "Watch sodium + seed oils", "Plan to graduate to SKD"],
  },
};

const MEAL_TIMELINE = [
  { window: "8:00 PM – 10:00 AM", label: "Fast", tone: "fast", text: "Water, black coffee, electrolytes. No cream, no sweeteners." },
  { window: "10:00 AM", label: "Break-Fast", tone: "meal", text: "3 eggs scrambled in butter, ½ avocado, sea salt.", cal: 480, fat: 38, carbs: 6, protein: 24 },
  { window: "1:30 PM", label: "Lunch", tone: "meal", text: "Grilled salmon, leafy greens, olive oil + lemon.", cal: 560, fat: 40, carbs: 8, protein: 42 },
  { window: "4:30 PM", label: "Snack", tone: "snack", text: "Macadamia nuts or a small fat bomb.", cal: 220, fat: 22, carbs: 3, protein: 3 },
  { window: "7:30 PM", label: "Dinner", tone: "meal", text: "Ribeye, roasted broccoli in ghee, mineral water.", cal: 720, fat: 52, carbs: 9, protein: 55 },
];

/* ---------- PER-KETO MEAL TIMELINES ----------
 * Real foods, real macros. Each keto type gets its own meal plan that
 * matches its macro split (Fat / Protein / Carbs %). When user taps a
 * different keto type, the meals AND macros update.
 * USDA-aligned values, rounded to whole grams.
 */
type Meal = {
  window: string;
  label: string;
  tone: "fast" | "meal" | "snack";
  text: string;
  cal?: number;
  fat?: number;
  carbs?: number;
  protein?: number;
};

const FAST_BLOCK: Meal = {
  window: "8:00 PM – 10:00 AM",
  label: "Fast",
  tone: "fast",
  text: "Water, black coffee, electrolytes. No cream, no sweeteners.",
};

const MEAL_PLANS: Record<string, { totals: { cal: number; fat: number; carbs: number; protein: number }; meals: Meal[] }> = {
  // Standard Keto — 70% fat / 25% protein / 5% carbs
  skd: {
    totals: { cal: 1820, fat: 142, carbs: 25, protein: 113 },
    meals: [
      FAST_BLOCK,
      { window: "10:00 AM", label: "Break-Fast", tone: "meal", text: "3 eggs scrambled in butter, ½ avocado, sea salt.", cal: 470, fat: 38, carbs: 7, protein: 22 },
      { window: "1:30 PM", label: "Lunch", tone: "meal", text: "5 oz grilled salmon, 2 cups spinach, 1 tbsp olive oil, lemon.", cal: 480, fat: 35, carbs: 4, protein: 35 },
      { window: "4:30 PM", label: "Snack", tone: "snack", text: "1 oz macadamia nuts.", cal: 200, fat: 21, carbs: 4, protein: 2 },
      { window: "7:30 PM", label: "Dinner", tone: "meal", text: "6 oz ribeye, 1 cup broccoli roasted in 1 tbsp ghee, 16 oz mineral water.", cal: 670, fat: 52, carbs: 6, protein: 54 },
    ],
  },
  // High Protein Keto — 60% fat / 35% protein / 5% carbs
  hpkd: {
    totals: { cal: 1900, fat: 127, carbs: 24, protein: 165 },
    meals: [
      FAST_BLOCK,
      { window: "10:00 AM", label: "Break-Fast", tone: "meal", text: "4 eggs + 3 oz turkey sausage, ¼ avocado.", cal: 520, fat: 38, carbs: 4, protein: 40 },
      { window: "1:30 PM", label: "Lunch", tone: "meal", text: "7 oz chicken thigh, 2 cups arugula, 1 tbsp olive oil.", cal: 540, fat: 35, carbs: 3, protein: 50 },
      { window: "4:30 PM", label: "Snack", tone: "snack", text: "¾ cup full-fat Greek yogurt + 1 tbsp chia.", cal: 180, fat: 9, carbs: 8, protein: 16 },
      { window: "7:30 PM", label: "Dinner", tone: "meal", text: "8 oz ribeye, 1 cup broccoli in 1 tbsp ghee, 16 oz water.", cal: 760, fat: 58, carbs: 6, protein: 62 },
    ],
  },
  // Cyclical Keto — strict day shown (refeed days vary)
  ckd: {
    totals: { cal: 1830, fat: 138, carbs: 28, protein: 118 },
    meals: [
      FAST_BLOCK,
      { window: "10:00 AM", label: "Break-Fast", tone: "meal", text: "3 eggs in butter, 2 strips bacon, ½ avocado.", cal: 510, fat: 42, carbs: 5, protein: 26 },
      { window: "1:30 PM", label: "Lunch", tone: "meal", text: "5 oz grass-fed beef patty, lettuce wrap, 1 tbsp mayo.", cal: 470, fat: 36, carbs: 3, protein: 32 },
      { window: "4:30 PM", label: "Snack", tone: "snack", text: "1 oz pecans + 4 olives.", cal: 210, fat: 22, carbs: 4, protein: 3 },
      { window: "7:30 PM", label: "Dinner", tone: "meal", text: "6 oz ribeye, 1 cup broccoli in 1 tbsp ghee, 16 oz water.", cal: 640, fat: 52, carbs: 6, protein: 50 },
    ],
  },
  // Targeted Keto — adds 15-20g carbs around training
  tkd: {
    totals: { cal: 1880, fat: 132, carbs: 45, protein: 120 },
    meals: [
      FAST_BLOCK,
      { window: "10:00 AM", label: "Break-Fast", tone: "meal", text: "3 eggs, 2 oz smoked salmon, ¼ avocado.", cal: 460, fat: 33, carbs: 4, protein: 32 },
      { window: "1:30 PM", label: "Lunch", tone: "meal", text: "5 oz chicken breast, 2 cups mixed greens, 1 tbsp olive oil.", cal: 430, fat: 28, carbs: 5, protein: 38 },
      { window: "4:30 PM", label: "Pre-Workout", tone: "snack", text: "½ banana + 1 tbsp almond butter (targeted carbs).", cal: 200, fat: 9, carbs: 22, protein: 4 },
      { window: "7:30 PM", label: "Dinner", tone: "meal", text: "6 oz ribeye, 1 cup broccoli in 1 tbsp ghee, 16 oz water.", cal: 670, fat: 52, carbs: 6, protein: 54 },
    ],
  },
  // Lazy Keto — carbs only, simple plate
  lazy: {
    totals: { cal: 1750, fat: 130, carbs: 19, protein: 115 },
    meals: [
      FAST_BLOCK,
      { window: "10:00 AM", label: "Break-Fast", tone: "meal", text: "3 eggs cooked in butter, ¼ avocado.", cal: 410, fat: 33, carbs: 4, protein: 22 },
      { window: "1:30 PM", label: "Lunch", tone: "meal", text: "5 oz rotisserie chicken, 1 cup spinach, ranch dressing.", cal: 470, fat: 34, carbs: 3, protein: 35 },
      { window: "4:30 PM", label: "Snack", tone: "snack", text: "1 oz cheddar + 1 oz almonds.", cal: 280, fat: 23, carbs: 6, protein: 12 },
      { window: "7:30 PM", label: "Dinner", tone: "meal", text: "6 oz ribeye, 1 cup broccoli in 1 tbsp ghee, 16 oz water.", cal: 590, fat: 40, carbs: 6, protein: 46 },
    ],
  },
  // Dirty Keto — convenience foods, still under 20g carbs
  dirty: {
    totals: { cal: 1900, fat: 145, carbs: 22, protein: 115 },
    meals: [
      FAST_BLOCK,
      { window: "10:00 AM", label: "Break-Fast", tone: "meal", text: "Bunless fast-food sausage & egg patty, side of bacon.", cal: 520, fat: 42, carbs: 4, protein: 28 },
      { window: "1:30 PM", label: "Lunch", tone: "meal", text: "Bunless double cheeseburger, no ketchup, side of pickles.", cal: 540, fat: 42, carbs: 6, protein: 35 },
      { window: "4:30 PM", label: "Snack", tone: "snack", text: "Pork rinds + 2 string cheese.", cal: 250, fat: 19, carbs: 2, protein: 18 },
      { window: "7:30 PM", label: "Dinner", tone: "meal", text: "6 oz ribeye, 1 cup broccoli in 1 tbsp ghee, 16 oz water.", cal: 590, fat: 42, carbs: 6, protein: 50 },
    ],
  },
};

/* ---------- WHAT CHANGED — per-keto headline + swap notes ----------
 * Surfaced as a gold callout above the timeline whenever the user picks
 * a non-default keto type, so the swap is obvious at a glance.
 */
const CHANGE_HIGHLIGHTS: Record<string, { headline: string; swaps: string[] }> = {
  skd: { headline: "", swaps: [] }, // baseline — no callout
  hpkd: {
    headline: "Protein-led refeed",
    swaps: [
      "Break-Fast: +1 egg & turkey sausage for MPS",
      "Lunch: chicken thigh swap → +15g protein",
      "Snack: nuts → Greek yogurt + chia",
      "Dinner: 8 oz ribeye instead of 6 oz",
    ],
  },
  ckd: {
    headline: "Strict day (refeed rotates weekly)",
    swaps: [
      "Break-Fast: bacon added for higher fat",
      "Lunch: beef patty + mayo replaces salmon",
      "Snack: pecans + olives for variety",
    ],
  },
  tkd: {
    headline: "Targeted carbs around training",
    swaps: [
      "Break-Fast: smoked salmon for lean protein",
      "Lunch: chicken breast (lower fat) to leave room",
      "Snack → Pre-Workout: banana + almond butter (+22g carbs)",
    ],
  },
  lazy: {
    headline: "Simpler plate — track carbs only",
    swaps: [
      "Lunch: rotisserie chicken + ranch (no measuring)",
      "Snack: cheese + almonds (grab & go)",
      "Dinner: same ribeye, looser fat target",
    ],
  },
  dirty: {
    headline: "Convenience-first, still under 20g carbs",
    swaps: [
      "Break-Fast: fast-food sausage & egg patty",
      "Lunch: bunless double cheeseburger",
      "Snack: pork rinds + string cheese",
    ],
  },
};

/** Compare a plan to the user's assigned baseline; returns indices of changed meals. */
function getChangedMealIndices(ketoId: string, baselineKetoId: string): Set<number> {
  if (ketoId === baselineKetoId) return new Set();
  const base = (MEAL_PLANS[baselineKetoId] ?? MEAL_PLANS.skd).meals;
  const target = (MEAL_PLANS[ketoId] ?? MEAL_PLANS.skd).meals;
  const changed = new Set<number>();
  target.forEach((m, i) => {
    const b = base[i];
    if (!b) return;
    if (b.text !== m.text || b.label !== m.label) changed.add(i);
  });
  return changed;
}

/** Format a signed delta like "+18g" or "−10g" (uses real minus sign). */
function fmtDelta(n: number, suffix = "g"): string {
  if (n === 0) return `0${suffix}`;
  if (n > 0) return `+${n}${suffix}`;
  return `−${Math.abs(n)}${suffix}`;
}

/** Compute per-meal macro deltas (target − baseline) for a given keto vs. assigned. */
function getMealDelta(
  baselineKetoId: string,
  targetKetoId: string,
  mealIdx: number,
): { fat: number; carbs: number; protein: number; cal: number } | null {
  const base = MEAL_PLANS[baselineKetoId]?.meals[mealIdx];
  const tgt = MEAL_PLANS[targetKetoId]?.meals[mealIdx];
  if (!base || !tgt || base.cal == null || tgt.cal == null) return null;
  return {
    fat: (tgt.fat ?? 0) - (base.fat ?? 0),
    carbs: (tgt.carbs ?? 0) - (base.carbs ?? 0),
    protein: (tgt.protein ?? 0) - (base.protein ?? 0),
    cal: (tgt.cal ?? 0) - (base.cal ?? 0),
  };
}

/* ---------- HERO — GOLD NUMERAL ---------- */
function Hero({ plan }: { plan: PlanView }) {
  return (
    <div className="relative overflow-hidden px-5 pt-8 pb-8">
      <div
        className="absolute right-0 top-0 font-serif leading-none pointer-events-none select-none"
        style={{
          fontSize: 260,
          color: GOLD,
          opacity: 0.18,
          letterSpacing: "-0.05em",
          lineHeight: 0.85,
        }}
      >
        {plan.numeral}
      </div>
      <div
        className="relative text-[10px] uppercase tracking-[0.35em] mb-3"
        style={{ color: GOLD }}
      >
        {plan.eyebrow}
      </div>
      <h1
        className="relative font-serif text-5xl leading-[0.95] mb-4"
        style={{ color: IVORY }}
      >
        {plan.name}
      </h1>
      <p className="relative text-sm leading-relaxed mb-5" style={{ color: MUTED }}>
        {plan.description}
      </p>
      <div className="relative flex items-center gap-3">
        <span className="font-serif text-lg" style={{ color: IVORY }}>
          {plan.fastHours}h
        </span>
        <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTED }}>
          fasting
        </span>
        <span style={{ color: `${GOLD}66` }}>·</span>
        <span className="font-serif text-lg" style={{ color: IVORY }}>
          {plan.eatHours}h
        </span>
        <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTED }}>
          eating
        </span>
      </div>
    </div>
  );
}

/* ---------- TIME PARSING / FORMATTING HELPERS ---------- */
type Period = "AM" | "PM";
interface TimeParts {
  hour: number; // 1-12
  minute: number; // 0-59
  period: Period;
}

function parseTime(str: string): TimeParts {
  // accepts "10:00 AM", "8:00 PM", "10 AM", "10:30AM"
  const m = str.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return { hour: 10, minute: 0, period: "AM" };
  let hour = parseInt(m[1], 10);
  if (hour < 1) hour = 12;
  if (hour > 12) hour = 12;
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const period = (m[3].toUpperCase() === "PM" ? "PM" : "AM") as Period;
  return { hour, minute, period };
}

function formatTime({ hour, minute, period }: TimeParts): string {
  return `${hour}:${minute.toString().padStart(2, "0")} ${period}`;
}

function sqlTimeToUiTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (!match) return null;
  const h24 = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period: Period = h24 >= 12 ? "PM" : "AM";
  let hour = h24 % 12;
  if (hour === 0) hour = 12;
  return formatTime({ hour, minute, period });
}

function uiTimeToSqlTime(value: string): string {
  const { hour, minute, period } = parseTime(value);
  const h24 = period === "AM" ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;
  return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

/** Convert TimeParts to minutes-of-day (0-1439). */
function toMinutes({ hour, minute, period }: TimeParts): number {
  const h24 = period === "AM" ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;
  return h24 * 60 + minute;
}

/** Convert minutes-of-day back to TimeParts (wraps at 24h). */
function fromMinutes(total: number): TimeParts {
  const m = ((total % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const minute = m % 60;
  const period: Period = h24 >= 12 ? "PM" : "AM";
  let hour = h24 % 12;
  if (hour === 0) hour = 12;
  return { hour, minute, period };
}

/* ---------- WHEEL PICKER (interactive) ---------- */
const WHEEL_ITEM_HEIGHT = 36;

function WheelPicker({
  opensAt,
  closesAt,
  eatHours,
  onChange,
}: {
  opensAt: string;
  closesAt: string;
  eatHours: number;
  onChange: (next: { opensAt: string; closesAt: string }) => void;
}) {
  // Which side is being edited
  const [editing, setEditing] = useState<"opens" | "closes">("opens");

  // Live editable state — initialised from props, then driven by the wheels.
  const [opens, setOpens] = useState<TimeParts>(() => parseTime(opensAt));
  const [closes, setCloses] = useState<TimeParts>(() => parseTime(closesAt));

  // Re-sync when the underlying plan changes (user picked a different lion card)
  useEffect(() => {
    setOpens(parseTime(opensAt));
    setCloses(parseTime(closesAt));
  }, [opensAt, closesAt]);

  const active = editing === "opens" ? opens : closes;

  const updateActive = (next: TimeParts) => {
    if (editing === "opens") {
      setOpens(next);
      // Keep window length constant: closes = opens + eatHours
      const nextCloses = fromMinutes(toMinutes(next) + eatHours * 60);
      setCloses(nextCloses);
      onChange({ opensAt: formatTime(next), closesAt: formatTime(nextCloses) });
    } else {
      setCloses(next);
      const nextOpens = fromMinutes(toMinutes(next) - eatHours * 60);
      setOpens(nextOpens);
      onChange({ opensAt: formatTime(nextOpens), closesAt: formatTime(next) });
    }
  };

  const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
  const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0..59
  const PERIODS: Period[] = ["AM", "PM"];

  return (
    <div className="mt-5">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <TimeColumn
          label="fast starts"
          value={formatTime(closes)}
          active={editing === "closes"}
          onClick={() => setEditing("closes")}
        />
        <TimeColumn
          label="fast ends"
          value={formatTime(opens)}
          active={editing === "opens"}
          onClick={() => setEditing("opens")}
        />
      </div>
      <div
        className="relative overflow-hidden py-2"
        style={{ background: SURFACE_2, border: `1px solid ${GOLD}22` }}
      >
        <div className="grid grid-cols-3 text-center font-serif">
          <Wheel
            items={HOURS.map((h) => String(h))}
            activeIndex={HOURS.indexOf(active.hour)}
            onChangeIndex={(i) => updateActive({ ...active, hour: HOURS[i] })}
          />
          <Wheel
            items={MINUTES.map((m) => m.toString().padStart(2, "0"))}
            activeIndex={MINUTES.indexOf(active.minute)}
            onChangeIndex={(i) => updateActive({ ...active, minute: MINUTES[i] })}
          />
          <Wheel
            items={PERIODS}
            activeIndex={PERIODS.indexOf(active.period)}
            onChangeIndex={(i) => updateActive({ ...active, period: PERIODS[i] })}
          />
        </div>
        <div
          className="absolute left-3 right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            height: WHEEL_ITEM_HEIGHT,
            borderTop: `1px solid ${GOLD}55`,
            borderBottom: `1px solid ${GOLD}55`,
          }}
        />
      </div>
      <div
        className="text-center text-[9px] uppercase tracking-[0.3em] mt-3"
        style={{ color: MUTED }}
      >
        Tap a time, then scroll to adjust
      </div>
    </div>
  );
}

/** Touch / wheel scrollable column with snap. */
function Wheel({
  items,
  activeIndex,
  onChangeIndex,
}: {
  items: string[];
  activeIndex: number;
  onChangeIndex: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const settleTimer = useRef<number | null>(null);
  const isUserScrolling = useRef(false);

  // Sync external activeIndex → scroll position (when not actively scrolling)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isUserScrolling.current) return;
    el.scrollTo({ top: activeIndex * WHEEL_ITEM_HEIGHT, behavior: "smooth" });
  }, [activeIndex]);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    isUserScrolling.current = true;
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      const idx = Math.round(el.scrollTop / WHEEL_ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      // Snap exactly
      el.scrollTo({ top: clamped * WHEEL_ITEM_HEIGHT, behavior: "smooth" });
      isUserScrolling.current = false;
      if (clamped !== activeIndex) onChangeIndex(clamped);
    }, 120);
  };

  // Tap on a row to jump to it
  const tapTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: i * WHEEL_ITEM_HEIGHT, behavior: "smooth" });
    if (i !== activeIndex) onChangeIndex(i);
  };

  // Wheel/trackpad support
  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < 2) return;
    const dir = e.deltaY > 0 ? 1 : -1;
    const next = Math.max(0, Math.min(items.length - 1, activeIndex + dir));
    if (next !== activeIndex) onChangeIndex(next);
  };

  // Visible viewport = 3 items tall; pad with one blank above/below so the
  // selected (centered) row aligns under the gold horizontal rails.
  const viewportHeight = WHEEL_ITEM_HEIGHT * 3;

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      onWheel={handleWheel}
      className="overflow-y-scroll scrollbar-none touch-pan-y"
      style={{
        height: viewportHeight,
        scrollSnapType: "y mandatory",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
      }}
    >
      {/* top spacer to allow first item to center */}
      <div style={{ height: WHEEL_ITEM_HEIGHT }} />
      {items.map((it, i) => {
        const isActive = i === activeIndex;
        return (
          <button
            type="button"
            key={`${it}-${i}`}
            onClick={() => tapTo(i)}
            className="block w-full text-lg select-none"
            style={{
              height: WHEEL_ITEM_HEIGHT,
              lineHeight: `${WHEEL_ITEM_HEIGHT}px`,
              scrollSnapAlign: "center",
              color: isActive ? IVORY : MUTED,
              opacity: isActive ? 1 : 0.4,
              fontWeight: isActive ? 600 : 400,
              background: "transparent",
            }}
          >
            {it}
          </button>
        );
      })}
      {/* bottom spacer */}
      <div style={{ height: WHEEL_ITEM_HEIGHT }} />
    </div>
  );
}

function TimeColumn({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative px-4 py-3 text-left transition"
      style={{
        background: SURFACE_2,
        border: `1px solid ${GOLD}22`,
      }}
    >
      {active && (
        <span
          aria-hidden
          className="absolute top-2 right-2 inline-block rounded-full"
          style={{ width: 6, height: 6, background: GOLD }}
        />
      )}
      <div
        className="text-[10px] uppercase tracking-[0.25em] mb-1"
        style={{ color: MUTED }}
      >
        {label}
      </div>
      <div className="font-serif text-xl" style={{ color: IVORY }}>
        {value}
      </div>
    </button>
  );
}

/* ---------- EATING WINDOW BLOCK ---------- */
function EatingWindow({
  plan,
  times,
  onTimesChange,
}: {
  plan: PlanView;
  times: { opensAt: string; closesAt: string };
  onTimesChange: (next: { opensAt: string; closesAt: string }) => void;
}) {
  return (
    <div
      className="mx-5 mt-2 p-5"
      style={{ background: SURFACE, border: `1px solid ${GOLD}30` }}
    >
      <div
        className="text-center text-[10px] uppercase tracking-[0.3em] mb-4"
        style={{ color: GOLD }}
      >
        Fasting Window
      </div>
      <div className="text-center font-serif text-5xl" style={{ color: IVORY }}>
        {24 - plan.eatHours}
        <span className="text-2xl ml-1" style={{ color: GOLD_SOFT }}>
          h
        </span>
      </div>
      <WheelPicker
        opensAt={times.opensAt}
        closesAt={times.closesAt}
        eatHours={plan.eatHours}
        onChange={onTimesChange}
      />
    </div>
  );
}

/* =================================================================
   BOTTOM HALF — VARIANTS
   ================================================================= */

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  // If kicker contains a "Part N ·" prefix, render that prefix in muted grey
  const partMatch = kicker.match(/^(Part\s+\d+)\s*·\s*(.+)$/i);
  return (
    <div className="px-5 mb-4">
      <div className="text-[10px] uppercase tracking-[0.35em] mb-2 flex items-baseline justify-center gap-1.5" style={{ color: GOLD }}>
        {partMatch ? (
          <>
            <span style={{ color: MUTED }}>{partMatch[1]}</span>
            <span style={{ color: `${GOLD}66` }}>·</span>
            <span>{partMatch[2]}</span>
          </>
        ) : (
          kicker
        )}
      </div>
      <h2 className="font-serif text-3xl leading-[1]" style={{ color: IVORY }}>
        {title}
      </h2>
    </div>
  );
}

function VariantHeader({ n, label }: { n: number; label: string }) {
  return (
    <div className="px-5 mt-12 mb-4">
      <div className="flex items-center gap-3">
        <div className="font-serif text-2xl" style={{ color: GOLD }}>
          {String(n).padStart(2, "0")}
        </div>
        <div className="h-px flex-1" style={{ background: `${GOLD}33` }} />
        <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>
          {label}
        </div>
      </div>
    </div>
  );
}

/* ---------- KETO TABS — VARIANT A: ALL TYPES ---------- */
function KetoTabsAll({ active, setActive, assignedKetoId }: { active: string; setActive: (id: string) => void; assignedKetoId: string }) {
  return (
    <div className="px-5 mb-5">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-none">
        {KETO_TYPES.map((k) => {
          const isActive = k.id === active;
          const isAssigned = k.id === assignedKetoId;
          return (
            <button
              key={k.id}
              onClick={() => setActive(k.id)}
              className="shrink-0 px-4 py-2 font-serif text-sm transition"
              style={{
                background: isActive ? GOLD : "transparent",
                color: isActive ? BLACK : IVORY,
                border: `1px solid ${isActive ? GOLD : `${GOLD}44`}`,
                letterSpacing: "0.05em",
              }}
            >
              {k.abbr}
              {isAssigned && (
                <span
                  className="ml-2 text-[8px] uppercase tracking-widest"
                  style={{ color: isActive ? BLACK : GOLD, opacity: 0.7 }}
                >
                  Yours
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- KETO TABS — VARIANT B: ASSIGNED + EXPLORE ---------- */
function KetoTabsAssignedExplore({ active, setActive, assignedKetoId }: { active: string; setActive: (id: string) => void; assignedKetoId: string }) {
  const assigned = KETO_TYPES.find((k) => k.id === assignedKetoId) ?? KETO_TYPES[0];
  const explore = KETO_TYPES.filter((k) => k.id !== assigned.id);
  const assignedActive = active === assigned.id;
  return (
    <div className="px-5 mb-5">
      <button
        onClick={() => setActive(assigned.id)}
        className="w-full text-left px-5 py-4 mb-3 transition"
        style={{
          background: assignedActive ? `${GOLD}14` : SURFACE,
          border: `1px solid ${assignedActive ? GOLD : `${GOLD}22`}`,
          opacity: assignedActive ? 1 : 0.75,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.3em] mb-1" style={{ color: GOLD }}>
              Your Keto Type
            </div>
            <div className="font-serif text-xl" style={{ color: IVORY }}>
              {assigned.name}
              <span className="ml-2 text-sm" style={{ color: GOLD_SOFT }}>
                {assigned.abbr}
              </span>
            </div>
          </div>
          <Sparkles size={18} style={{ color: GOLD }} />
        </div>
      </button>
      <div
        className="text-[9px] uppercase tracking-[0.3em] mb-2 pl-1"
        style={{ color: MUTED }}
      >
        Explore Pairings · {explore.length} more
      </div>
      <div className="grid grid-cols-2 gap-2">
        {explore.map((k) => {
          const isActive = k.id === active;
          return (
            <button
              key={k.id}
              onClick={() => setActive(k.id)}
              className="text-left px-3 py-3 transition"
              style={{
                background: isActive ? `${GOLD}18` : SURFACE,
                border: `1px solid ${isActive ? GOLD : "hsl(0 0% 14%)"}`,
              }}
            >
              <div
                className="font-serif text-base leading-none mb-1"
                style={{ color: isActive ? GOLD : IVORY }}
              >
                {k.abbr}
              </div>
              <div
                className="text-[10px] uppercase tracking-[0.15em] truncate"
                style={{ color: MUTED }}
              >
                {k.name}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- KETO TABS — VARIANT C: TOP 3 RELEVANT ---------- */
function KetoTabsTop3({ active, setActive, fastHours, assignedKetoId }: { active: string; setActive: (id: string) => void; fastHours: number; assignedKetoId: string }) {
  const top3 = [...KETO_TYPES].sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
  return (
    <div className="px-5 mb-5">
      <div
        className="text-[9px] uppercase tracking-[0.3em] mb-2 pl-1"
        style={{ color: MUTED }}
      >
        Best Pairings for {fastHours}h
      </div>
      <div className="grid grid-cols-3 gap-2">
        {top3.map((k) => {
          const isActive = k.id === active;
          return (
            <button
              key={k.id}
              onClick={() => setActive(k.id)}
              className="text-center py-3 px-2 transition"
              style={{
                background: isActive ? `${GOLD}18` : SURFACE,
                border: `1px solid ${isActive ? GOLD : `${GOLD}33`}`,
              }}
            >
              <div
                className="font-serif text-base mb-0.5"
                style={{ color: isActive ? GOLD : IVORY }}
              >
                {k.abbr}
              </div>
              <div className="text-[8px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
                {k.matchScore}% match
              </div>
              {k.id === assignedKetoId && (
                <div className="text-[8px] mt-1" style={{ color: GOLD }}>
                  ★ yours
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- SYNERGY CONTENT BLOCK ---------- */
function SynergyContent({
  ketoId,
  assignedKetoId,
  withCoach,
  fastHours,
  planName,
  planType,
  planId,
  windowOpensAt,
  windowClosesAt,
}: {
  ketoId: string;
  assignedKetoId: string;
  withCoach: "trainer" | "brand" | "none";
  fastHours: number;
  planName: string;
  planType: "quick" | "program";
  planId: string | null;
  windowOpensAt: string;
  windowClosesAt: string;
}) {
  const keto = KETO_TYPES.find((k) => k.id === ketoId)!;
  const baseCopy = SYNERGY_COPY[ketoId] ?? SYNERGY_COPY.skd;
  // Rewrite hardcoded "14h" / "14-hour" references to the live plan's hours.
  const copy = {
    intro: baseCopy.intro
      .replace(/14-hour/g, `${fastHours}-hour`)
      .replace(/14h/g, `${fastHours}h`),
    bullets: baseCopy.bullets,
  };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clientId = useEffectiveClientId();

  const startFastMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Not signed in");
      if (!planId) throw new Error("No plan selected");
      const updates: Record<string, unknown> = {
        active_fast_target_hours: fastHours,
        active_fast_start_at: new Date().toISOString(),
        last_fast_ended_at: null,
        eating_window_ends_at: null,
        preferred_eating_window_opens_at: uiTimeToSqlTime(windowOpensAt),
        preferred_eating_window_closes_at: uiTimeToSqlTime(windowClosesAt),
      };
      if (planType === "quick") {
        updates.selected_quick_plan_id = planId;
        updates.selected_protocol_id = null;
        updates.protocol_start_date = null;
      } else {
        updates.selected_protocol_id = planId;
        updates.selected_quick_plan_id = null;
        updates.protocol_start_date = new Date().toISOString().slice(0, 10);
      }
      const { data, error } = await supabase
        .from("client_feature_settings")
        .update(updates)
        .eq("client_id", clientId)
        .select("client_id, active_fast_start_at")
        .maybeSingle();
      if (error) throw error;
      if (!data?.active_fast_start_at) throw new Error("Fast timer could not be started.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting", clientId] });
      queryClient.invalidateQueries({ queryKey: ["fasting-gate-state"] });
      queryClient.invalidateQueries({ queryKey: ["fasting-profile-data"] });
      toast.success(`${fastHours}h fast started`, {
        description: `${planName} · ${keto.name} (${keto.abbr}) · begins now`,
        duration: 4000,
      });
      navigate("/client/dashboard");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not start fast"),
  });
  return (
    <div className="px-5">
      {withCoach !== "none" && (
        <div
          className="flex items-center gap-3 pb-4 mb-4"
          style={{ borderBottom: `1px solid ${GOLD}22` }}
        >
          {withCoach === "trainer" ? (
            <>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-serif"
                style={{ background: `${GOLD}22`, color: GOLD, border: `1px solid ${GOLD}55` }}
              >
                NM
              </div>
              <div>
                <div className="text-sm font-serif" style={{ color: IVORY }}>
                  Coach Nora Minno
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
                  Your Assigned Trainer · RD
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                className="w-10 h-10 flex items-center justify-center font-serif text-xs"
                style={{ background: `${GOLD}14`, color: GOLD, border: `1px solid ${GOLD}55` }}
              >
                K360
              </div>
              <div>
                <div className="text-sm font-serif" style={{ color: IVORY }}>
                  KSOM-360 Nutrition Team
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
                  Editorial Standard
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: GOLD }}>
        {fastHours}h × {keto.abbr} — Why it works
      </div>
      <p className="text-sm leading-relaxed mb-5" style={{ color: IVORY, opacity: 0.85 }}>
        {copy.intro}
      </p>
      <ul className="space-y-2 mb-6">
        {copy.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-3 text-sm" style={{ color: MUTED }}>
            <span className="font-serif" style={{ color: GOLD }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="text-[10px] uppercase tracking-[0.3em] mb-3" style={{ color: GOLD }}>
        Daily Meal Timeline
      </div>
      {(() => {
        const plan = MEAL_PLANS[ketoId] ?? MEAL_PLANS.skd;
        const change = CHANGE_HIGHLIGHTS[ketoId];
        const assignedKeto = KETO_TYPES.find((k) => k.id === assignedKetoId) ?? KETO_TYPES[0];
        const assignedId = assignedKeto.id;
        const isAssigned = ketoId === assignedId;
        const isComparingToBaseline = ketoId !== assignedId;
        const changedIdx = isComparingToBaseline
          ? getChangedMealIndices(ketoId, assignedId)
          : new Set<number>();
        const basePlan = MEAL_PLANS[assignedId] ?? MEAL_PLANS.skd;
        const dayDelta = isAssigned
          ? null
          : {
              cal: plan.totals.cal - basePlan.totals.cal,
              fat: plan.totals.fat - basePlan.totals.fat,
              carbs: plan.totals.carbs - basePlan.totals.carbs,
              protein: plan.totals.protein - basePlan.totals.protein,
            };
        // Shift the hardcoded MEAL_PLANS times (anchored at "10:00 AM" opens)
        // by the delta between the live eating-window opens-at and that anchor.
        // Handles single times ("1:30 PM") and ranges ("8:00 PM – 10:00 AM").
        const BASELINE_OPENS = "10:00 AM";
        const shiftMinutes =
          toMinutes(parseTime(windowOpensAt)) - toMinutes(parseTime(BASELINE_OPENS));
        const shiftOne = (t: string) => formatTime(fromMinutes(toMinutes(parseTime(t)) + shiftMinutes));
        const shiftWindowText = (raw: string): string => {
          if (!shiftMinutes) return raw;
          const parts = raw.split(/\s*[–-]\s*/);
          if (parts.length === 2) {
            try {
              return `${shiftOne(parts[0])} – ${shiftOne(parts[1])}`;
            } catch {
              return raw;
            }
          }
          try {
            return shiftOne(raw);
          } catch {
            return raw;
          }
        };
        return (
          <>
            {/* "What changed" callout — only when not on baseline SKD */}
            {!isAssigned && change && change.headline && (
              <div
                className="mb-3 p-4"
                style={{
                  background: `${GOLD}10`,
                  border: `1px solid ${GOLD}55`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={12} style={{ color: GOLD }} />
                  <span
                    className="text-[9px] uppercase tracking-[0.3em]"
                    style={{ color: GOLD }}
                  >
                    What changed for {keto.abbr}
                  </span>
                </div>
                <div className="font-serif text-base mb-2" style={{ color: IVORY }}>
                  {change.headline}
                </div>
                <ul className="space-y-1">
                  {change.swaps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: MUTED }}>
                      <span style={{ color: GOLD }}>→</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Daily delta strip (B) — headline of the whole-day shift */}
            {dayDelta && (
              <div
                className="mb-3 p-3"
                style={{
                  background: SURFACE_2,
                  border: `1px dashed ${GOLD}55`,
                }}
              >
                <div className="text-[8px] uppercase tracking-[0.3em] mb-2" style={{ color: GOLD }}>
                  Switching {assignedKeto.abbr} → {keto.abbr} · daily shift
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: "Cal", value: fmtDelta(dayDelta.cal, ""), n: dayDelta.cal, dot: GOLD },
                    { label: "Fat", value: fmtDelta(dayDelta.fat), n: dayDelta.fat, dot: "#E8C77A" },
                    { label: "Carbs", value: fmtDelta(dayDelta.carbs), n: dayDelta.carbs, dot: "#7DB6E8" },
                    { label: "Protein", value: fmtDelta(dayDelta.protein), n: dayDelta.protein, dot: "#9B7DD9" },
                  ].map((d) => (
                    <div key={d.label}>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="inline-block rounded-full" style={{ width: 5, height: 5, background: d.dot }} />
                        <span className="text-[8px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
                          {d.label}
                        </span>
                      </div>
                      <div
                        className="font-serif text-sm"
                        style={{ color: d.n === 0 ? MUTED : IVORY, opacity: d.n === 0 ? 0.6 : 1 }}
                      >
                        {d.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily totals strip — updates per keto type */}
            <div
              className="mb-3 p-3 grid grid-cols-4 gap-2 text-center"
              style={{ background: SURFACE, border: `1px solid ${GOLD}33` }}
            >
              {[
                { label: "Cal", value: plan.totals.cal, dot: GOLD },
                { label: "Fat", value: `${plan.totals.fat}g`, dot: "#E8C77A" },
                { label: "Carbs", value: `${plan.totals.carbs}g`, dot: "#7DB6E8" },
                { label: "Protein", value: `${plan.totals.protein}g`, dot: "#9B7DD9" },
              ].map((t) => (
                <div key={t.label}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span className="inline-block rounded-full" style={{ width: 5, height: 5, background: t.dot }} />
                    <span className="text-[8px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
                      {t.label}
                    </span>
                  </div>
                  <div className="font-serif text-sm" style={{ color: IVORY }}>
                    {t.value}
                  </div>
                </div>
              ))}
            </div>
      <div key={ketoId} className="relative">
        {/* continuous dotted rail spanning the entire timeline */}
        <div
          aria-hidden
          className="absolute top-0 bottom-0"
          style={{
            left: 4,
            width: 4,
            backgroundImage: `radial-gradient(circle, ${GOLD} 1.6px, transparent 1.8px)`,
            backgroundSize: "4px 8px",
            backgroundRepeat: "repeat-y",
            backgroundPosition: "center top",
          }}
        />
        <div className="space-y-3">
        {plan.meals.map((m, i) => (
          (() => {
            const isMealChanged = isComparingToBaseline && changedIdx.has(i);
            const dotColor =
              m.tone === "fast"
                ? GOLD
                : m.label.toLowerCase().includes("snack")
                ? "#E8C77A"
                : "#7DB6E8";
            return (
          <div key={i} className="relative pl-6">
            {/* dot on the rail — vertically centered on the entire row (label + card) */}
            <span
              aria-hidden
              className="absolute rounded-full top-1/2 -translate-y-1/2"
              style={{
                left: 0,
                width: 12,
                height: 12,
                background: BLACK,
                border: `2px solid ${dotColor}`,
                boxShadow: `0 0 0 3px ${BLACK}`,
              }}
            />
            <div
              className="text-[9px] uppercase tracking-[0.25em] mb-1"
              style={{ color: MUTED }}
            >
              {shiftWindowText(m.window)}
            </div>
          <div
            className="p-4"
            style={{
              background: SURFACE,
              border: `1px solid ${
                m.tone === "fast"
                  ? `${GOLD}55`
                  : isMealChanged
                  ? GOLD
                  : `${GOLD}22`
              }`,
            }}
          >
            <div className="flex items-baseline justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-serif text-sm" style={{ color: IVORY }}>
                  {m.label}
                </span>
                {isMealChanged && (() => {
                  const md = getMealDelta(assignedId, ketoId, i);
                  if (!md) return null;
                  // Pick the 1-2 most significant macro deltas (by absolute g)
                  const candidates = [
                    { key: "carbs", val: md.carbs, label: "carbs" },
                    { key: "fat", val: md.fat, label: "fat" },
                    { key: "protein", val: md.protein, label: "protein" },
                  ]
                    .filter((c) => c.val !== 0)
                    .sort((a, b) => Math.abs(b.val) - Math.abs(a.val))
                    .slice(0, 2);
                  if (candidates.length === 0) {
                    return (
                      <span
                        className="text-[8px] uppercase tracking-[0.2em] px-1.5 py-0.5"
                        style={{
                          background: `${GOLD}22`,
                          color: GOLD,
                          border: `1px solid ${GOLD}66`,
                        }}
                      >
                        Swapped
                      </span>
                    );
                  }
                  const text = candidates.map((c) => `${fmtDelta(c.val)} ${c.label}`).join(" · ");
                  return (
                    <span
                      className="text-[8px] uppercase tracking-[0.18em] px-1.5 py-0.5 whitespace-nowrap"
                      style={{
                        background: `${GOLD}22`,
                        color: GOLD,
                        border: `1px solid ${GOLD}66`,
                      }}
                    >
                      {text}
                    </span>
                  );
                })()}
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
              {m.text}
            </p>

            {m.tone !== "fast" && m.cal != null && (
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${GOLD}1f` }}>
                {/* Calorie headline */}
                <div className="flex items-baseline justify-between mb-2">
                  <span
                    className="text-[9px] uppercase tracking-[0.25em]"
                    style={{ color: GOLD }}
                  >
                    Macros
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif text-base" style={{ color: IVORY }}>
                      {m.cal}
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
                      cal
                    </span>
                  </div>
                </div>

                {/* Macro squares */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "F", label: "Fat", value: m.fat, dot: "#E8C77A" },
                    { key: "C", label: "Carbs", value: m.carbs, dot: "#7DB6E8" },
                    { key: "P", label: "Protein", value: m.protein, dot: "#9B7DD9" },
                  ].map((macro) => (
                    <div
                      key={macro.key}
                      className="p-2 text-center"
                      style={{
                        background: SURFACE_2,
                        border: `1px solid ${GOLD}14`,
                      }}
                    >
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span
                          className="inline-block rounded-full"
                          style={{ width: 5, height: 5, background: macro.dot }}
                        />
                        <span
                          className="text-[8px] uppercase tracking-[0.2em]"
                          style={{ color: MUTED }}
                        >
                          {macro.label}
                        </span>
                      </div>
                      <div className="font-serif text-sm" style={{ color: IVORY }}>
                        {macro.value}
                        <span className="text-[9px] ml-0.5" style={{ color: MUTED }}>
                          g
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>
            );
          })()
        ))}
      </div>
      </div>
          </>
        );
      })()}

      {/* ---------- Synergy primer + Start CTA ---------- */}
      {(() => {
        const basePrimer = SYNERGY_PRIMER[ketoId] ?? SYNERGY_PRIMER.skd;
        const primer = {
          headline: basePrimer.headline.replace(/14h/g, `${fastHours}h`),
          bullets: basePrimer.bullets,
        };
        return (
          <div className="mt-8">
            <div
              className="p-5 mb-4"
              style={{
                background: SURFACE,
                border: `1px solid ${GOLD}55`,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={12} style={{ color: GOLD }} />
                <span
                  className="text-[9px] uppercase tracking-[0.3em]"
                  style={{ color: GOLD }}
                >
                  Why this combo works
                </span>
              </div>
              <p
                className="font-serif text-lg leading-snug mb-4"
                style={{ color: IVORY }}
              >
                {primer.headline}
              </p>
              <ul className="space-y-2">
                {primer.bullets.map((b, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm"
                    style={{ color: MUTED }}
                  >
                    <span
                      aria-hidden
                      className="inline-block rounded-full mt-1.5"
                      style={{ width: 5, height: 5, background: GOLD, flexShrink: 0 }}
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              disabled={startFastMutation.isPending || !clientId || !planId}
              className="w-full py-4 text-sm uppercase tracking-[0.3em] font-serif transition active:scale-[0.99]"
              style={{
                background: GOLD,
                color: BLACK,
                border: `1px solid ${GOLD}`,
                opacity: startFastMutation.isPending ? 0.6 : 1,
              }}
              onClick={() => startFastMutation.mutate()}
            >
              {startFastMutation.isPending ? "Starting…" : "Start Your Fast"}
            </button>
            <p
              className="text-[10px] uppercase tracking-[0.25em] text-center mt-2"
              style={{ color: MUTED }}
            >
              {fastHours}h × {keto.abbr} · begins now
            </p>
          </div>
        );
      })()}
    </div>
  );
}

/* ---------- DEMO BLOCK (combines tabs variant + coach option) ---------- */
function DemoBlock({
  tabsVariant,
  coachVariant,
  defaultActive,
  assignedKetoId,
  fastHours,
  planName,
  planType,
  planId,
  windowOpensAt,
  windowClosesAt,
}: {
  tabsVariant: "all" | "explore" | "top3";
  coachVariant: "trainer" | "brand" | "none";
  defaultActive: string;
  assignedKetoId: string;
  fastHours: number;
  planName: string;
  planType: "quick" | "program";
  planId: string | null;
  windowOpensAt: string;
  windowClosesAt: string;
}) {
  const [active, setActive] = useState(defaultActive);
  return (
    <div className="pt-4 pb-8" style={{ background: SURFACE_2 }}>
      <SectionTitle kicker="Part 2 · Keto Type" title="Recommendations" />
      {tabsVariant === "all" && <KetoTabsAll active={active} setActive={setActive} assignedKetoId={assignedKetoId} />}
      {tabsVariant === "explore" && <KetoTabsAssignedExplore active={active} setActive={setActive} assignedKetoId={assignedKetoId} />}
      {tabsVariant === "top3" && <KetoTabsTop3 active={active} setActive={setActive} fastHours={fastHours} assignedKetoId={assignedKetoId} />}
      <SynergyContent
        ketoId={active}
        assignedKetoId={assignedKetoId}
        withCoach={coachVariant}
        fastHours={fastHours}
        planName={planName}
        planType={planType}
        planId={planId}
        windowOpensAt={windowOpensAt}
        windowClosesAt={windowClosesAt}
      />
    </div>
  );
}

export default function ClientFastingPlanDetailPreview() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();

  const { data: featureSettings } = useQuery({
    queryKey: ["fasting-detail-feature-settings", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, selected_quick_plan_id, preferred_eating_window_opens_at, preferred_eating_window_closes_at")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const routePlanType = params.get("type") as "quick" | "program" | null;
  const routePlanId = params.get("id");
  const assignedPlanType = featureSettings?.selected_protocol_id
    ? "program"
    : featureSettings?.selected_quick_plan_id
      ? "quick"
      : null;
  const assignedPlanId = featureSettings?.selected_protocol_id ?? featureSettings?.selected_quick_plan_id ?? null;

  const planType = (routePlanType ?? assignedPlanType ?? "quick") as "quick" | "program";
  const planId = routePlanId ?? assignedPlanId;

  const { data: ketoAssignment } = useQuery({
    queryKey: ["fasting-detail-keto-assignment", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_keto_assignments")
        .select("keto_type_id, keto_types(id, abbreviation, name)")
        .eq("client_id", clientId!)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: quickPlan } = useQuery({
    queryKey: ["fasting-detail-quick", planId],
    enabled: planType === "quick" && !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quick_fasting_plans")
        .select("id, name, fast_hours, intensity_tier, description")
        .eq("id", planId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: program } = useQuery({
    queryKey: ["fasting-detail-program", planId],
    enabled: planType === "program" && !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select(
          "id, name, description, duration_days, intensity_tier, fast_target_hours",
        )
        .eq("id", planId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const assignedKeto = ketoAssignment?.keto_types as { id: string; abbreviation: string; name: string } | null;

  const plan: PlanView = useMemo(() => {
    if (planType === "quick" && quickPlan) {
      const fast = quickPlan.fast_hours ?? 14;
      const eat = Math.max(0, 24 - fast);
      const { opensAt, closesAt } = pickWindowTimes(quickPlan.description);
      return {
        eyebrow: TIER_EYEBROW[quickPlan.intensity_tier ?? "low"] ?? "Fasting Window",
        name: quickPlan.name,
        numeral: String(fast),
        fastHours: fast,
        eatHours: eat,
        description:
          pickDescription(quickPlan.description) ||
          "A curated KSOM fasting window.",
        opensAt,
        closesAt,
      };
    }
    if (planType === "program" && program) {
      const fast = program.fast_target_hours ?? 16;
      const eat = Math.max(0, 24 - fast);
      return {
        eyebrow:
          program.duration_days && program.duration_days > 0
            ? `${program.duration_days}-Day Program`
            : "Structured Program",
        name: program.name,
        numeral: String(program.duration_days ?? fast),
        fastHours: fast,
        eatHours: eat,
        description:
          pickDescription(program.description) ||
          "A structured KSOM fasting program.",
        opensAt: "10:00 AM",
        closesAt: "8:00 PM",
      };
    }
    // Fallback to the original Easy Start+ sample (for direct visits without an id)
    return {
      eyebrow: SAMPLE.eyebrow,
      name: SAMPLE.name,
      numeral: SAMPLE.numeral,
      fastHours: SAMPLE.fastHours,
      eatHours: SAMPLE.eatHours,
      description: SAMPLE.description,
      opensAt: "10:00 AM",
      closesAt: "8:00 PM",
    };
  }, [planType, quickPlan, program]);

  const defaultKetoId = assignedKeto?.id ? assignedKeto.id.toLowerCase() : "skd";

  const preferredTimes = useMemo(
    () => ({
      opensAt: sqlTimeToUiTime(featureSettings?.preferred_eating_window_opens_at) ?? plan.opensAt,
      closesAt: sqlTimeToUiTime(featureSettings?.preferred_eating_window_closes_at) ?? plan.closesAt,
    }),
    [
      featureSettings?.preferred_eating_window_closes_at,
      featureSettings?.preferred_eating_window_opens_at,
      plan.closesAt,
      plan.opensAt,
    ],
  );

  // Live, user-editable eating-window times. Shared by the wheel picker AND
  // the Daily Meal Timeline so adjusting "opens at" shifts every meal slot.
  const [times, setTimes] = useState(preferredTimes);
  const lastPersistedTimesRef = useRef(preferredTimes);

  const [pairDialogOpen, setPairDialogOpen] = useState(false);

  const isActivePlan =
    !!planId &&
    ((planType === "program" && featureSettings?.selected_protocol_id === planId) ||
      (planType === "quick" && featureSettings?.selected_quick_plan_id === planId));

  const hasKeto = !!ketoAssignment?.keto_type_id;
  const ketoLabel = assignedKeto ? `${assignedKeto.abbreviation} — ${assignedKeto.name}` : null;

  const setProtocolMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Not signed in");
      if (!planId) throw new Error("No plan selected");
      const updates: Record<string, unknown> = {
        preferred_eating_window_opens_at: uiTimeToSqlTime(times.opensAt),
        preferred_eating_window_closes_at: uiTimeToSqlTime(times.closesAt),
      };
      if (planType === "quick") {
        updates.selected_quick_plan_id = planId;
        updates.selected_protocol_id = null;
        updates.protocol_start_date = null;
      } else {
        updates.selected_protocol_id = planId;
        updates.selected_quick_plan_id = null;
        updates.protocol_start_date = new Date().toISOString().slice(0, 10);
      }
      const { error } = await supabase
        .from("client_feature_settings")
        .update(updates)
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting", clientId] });
      queryClient.invalidateQueries({ queryKey: ["fasting-detail-feature-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["fasting-gate-state"] });
      toast.success(`${plan.name} set as your fasting protocol`);
      setPairDialogOpen(true);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save protocol"),
  });

  useEffect(() => {
    setTimes(preferredTimes);
    lastPersistedTimesRef.current = preferredTimes;
  }, [preferredTimes]);

  useEffect(() => {
    if (!clientId) return;
    if (
      times.opensAt === lastPersistedTimesRef.current.opensAt &&
      times.closesAt === lastPersistedTimesRef.current.closesAt
    ) {
      return;
    }

    const timer = window.setTimeout(async () => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          preferred_eating_window_opens_at: uiTimeToSqlTime(times.opensAt),
          preferred_eating_window_closes_at: uiTimeToSqlTime(times.closesAt),
        })
        .eq("client_id", clientId);

      if (error) {
        toast.error("Could not save eating window");
        return;
      }

      lastPersistedTimesRef.current = times;
      queryClient.invalidateQueries({ queryKey: ["fasting-detail-feature-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting", clientId] });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [clientId, queryClient, times]);

  return (
    <div className="min-h-screen pb-24" style={{ background: BLACK }}>
      <header className="flex items-center justify-between px-5 py-5">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{ color: IVORY }}
        >
          <ChevronLeft size={22} />
        </button>
        <div
          className="text-[10px] uppercase tracking-[0.35em] flex items-baseline gap-1.5"
          style={{ color: GOLD }}
        >
          <span style={{ color: MUTED }}>Part 1</span>
          <span style={{ color: `${GOLD}66` }}>·</span>
          <span>Protocol</span>
        </div>
        <div style={{ width: 22 }} />
      </header>

      <Hero plan={plan} />
      <EatingWindow plan={plan} times={times} onTimesChange={setTimes} />
    </div>
  );
}
