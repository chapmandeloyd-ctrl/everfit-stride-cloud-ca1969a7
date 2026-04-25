import { useNavigate } from "react-router-dom";
import { ChevronLeft, Sparkles } from "lucide-react";
import { useState } from "react";

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

/* ---------- KETO TYPES (mock library) ---------- */
const KETO_TYPES = [
  { id: "skd", abbr: "SKD", name: "Standard Keto", assigned: true,  matchScore: 95 },
  { id: "hpkd", abbr: "HPKD", name: "High Protein", assigned: false, matchScore: 88 },
  { id: "ckd", abbr: "CKD", name: "Cyclical", assigned: false, matchScore: 72 },
  { id: "tkd", abbr: "TKD", name: "Targeted", assigned: false, matchScore: 65 },
  { id: "lazy", abbr: "LAZY", name: "Lazy Keto", assigned: false, matchScore: 50 },
  { id: "dirty", abbr: "DIRTY", name: "Dirty Keto", assigned: false, matchScore: 40 },
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

const MEAL_TIMELINE = [
  { window: "8:00 PM – 10:00 AM", label: "Fast", tone: "fast", text: "Water, black coffee, electrolytes. No cream, no sweeteners." },
  { window: "10:00 AM", label: "Break-Fast", tone: "meal", text: "3 eggs scrambled in butter, ½ avocado, sea salt.", cal: 480, fat: 38, carbs: 6, protein: 24 },
  { window: "1:30 PM", label: "Lunch", tone: "meal", text: "Grilled salmon, leafy greens, olive oil + lemon.", cal: 560, fat: 40, carbs: 8, protein: 42 },
  { window: "4:30 PM", label: "Snack", tone: "snack", text: "Macadamia nuts or a small fat bomb.", cal: 220, fat: 22, carbs: 3, protein: 3 },
  { window: "7:30 PM", label: "Dinner", tone: "meal", text: "Ribeye, roasted broccoli in ghee, mineral water.", cal: 720, fat: 52, carbs: 9, protein: 55 },
];

/* ---------- HERO — GOLD NUMERAL ---------- */
function Hero() {
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
        {SAMPLE.numeral}
      </div>
      <div
        className="relative text-[10px] uppercase tracking-[0.35em] mb-3"
        style={{ color: GOLD }}
      >
        {SAMPLE.eyebrow}
      </div>
      <h1
        className="relative font-serif text-5xl leading-[0.95] mb-4"
        style={{ color: IVORY }}
      >
        {SAMPLE.name}
      </h1>
      <p className="relative text-sm leading-relaxed mb-5" style={{ color: MUTED }}>
        {SAMPLE.description}
      </p>
      <div className="relative flex items-center gap-3">
        <span className="font-serif text-lg" style={{ color: IVORY }}>
          {SAMPLE.fastHours}h
        </span>
        <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTED }}>
          fasting
        </span>
        <span style={{ color: `${GOLD}66` }}>·</span>
        <span className="font-serif text-lg" style={{ color: IVORY }}>
          {SAMPLE.eatHours}h
        </span>
        <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTED }}>
          eating
        </span>
      </div>
    </div>
  );
}

/* ---------- WHEEL PICKER ---------- */
function WheelPicker() {
  return (
    <div className="mt-5">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <TimeColumn label="opens at" value="10:00 AM" />
        <TimeColumn label="closes at" value="8:00 PM" />
      </div>
      <div
        className="relative overflow-hidden py-2"
        style={{ background: SURFACE_2, border: `1px solid ${GOLD}22` }}
      >
        <div className="grid grid-cols-3 text-center font-serif">
          <Wheel items={["9", "10", "11"]} active={1} />
          <Wheel items={["59", "00", "01"]} active={1} />
          <Wheel items={["", "AM", "PM"]} active={1} />
        </div>
        <div
          className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-10 pointer-events-none"
          style={{
            borderTop: `1px solid ${GOLD}55`,
            borderBottom: `1px solid ${GOLD}55`,
          }}
        />
      </div>
    </div>
  );
}

function Wheel({ items, active }: { items: string[]; active: number }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2 text-lg">
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            color: i === active ? IVORY : MUTED,
            opacity: i === active ? 1 : 0.4,
            fontWeight: i === active ? 600 : 400,
          }}
        >
          {it || " "}
        </div>
      ))}
    </div>
  );
}

function TimeColumn({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="px-4 py-3"
      style={{ background: SURFACE_2, border: `1px solid ${GOLD}22` }}
    >
      <div
        className="text-[10px] uppercase tracking-[0.25em] mb-1"
        style={{ color: MUTED }}
      >
        {label}
      </div>
      <div className="font-serif text-xl" style={{ color: IVORY }}>
        {value}
      </div>
    </div>
  );
}

/* ---------- EATING WINDOW BLOCK ---------- */
function EatingWindow() {
  return (
    <div
      className="mx-5 mt-2 p-5"
      style={{ background: SURFACE, border: `1px solid ${GOLD}30` }}
    >
      <div
        className="text-center text-[10px] uppercase tracking-[0.3em] mb-4"
        style={{ color: GOLD }}
      >
        Eating Window
      </div>
      <div className="text-center font-serif text-5xl" style={{ color: IVORY }}>
        {SAMPLE.eatHours}
        <span className="text-2xl ml-1" style={{ color: GOLD_SOFT }}>
          h
        </span>
      </div>
      <WheelPicker />
    </div>
  );
}

/* =================================================================
   BOTTOM HALF — VARIANTS
   ================================================================= */

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="px-5 mb-4">
      <div className="text-[10px] uppercase tracking-[0.35em] mb-2" style={{ color: GOLD }}>
        {kicker}
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
function KetoTabsAll({ active, setActive }: { active: string; setActive: (id: string) => void }) {
  return (
    <div className="px-5 mb-5">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-none">
        {KETO_TYPES.map((k) => {
          const isActive = k.id === active;
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
              {k.assigned && (
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
function KetoTabsAssignedExplore({ active, setActive }: { active: string; setActive: (id: string) => void }) {
  const assigned = KETO_TYPES.find((k) => k.assigned)!;
  const explore = KETO_TYPES.filter((k) => !k.assigned);
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
function KetoTabsTop3({ active, setActive }: { active: string; setActive: (id: string) => void }) {
  const top3 = [...KETO_TYPES].sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
  return (
    <div className="px-5 mb-5">
      <div
        className="text-[9px] uppercase tracking-[0.3em] mb-2 pl-1"
        style={{ color: MUTED }}
      >
        Best Pairings for {SAMPLE.fastHours}h
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
              {k.assigned && (
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
function SynergyContent({ ketoId, withCoach }: { ketoId: string; withCoach: "trainer" | "brand" | "none" }) {
  const keto = KETO_TYPES.find((k) => k.id === ketoId)!;
  const copy = SYNERGY_COPY[ketoId] ?? SYNERGY_COPY.skd;
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
        {SAMPLE.fastHours}h × {keto.abbr} — Why it works
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
      <div className="space-y-3">
        {MEAL_TIMELINE.map((m, i) => (
          <div
            key={i}
            className="p-4"
            style={{
              background: SURFACE,
              border: `1px solid ${m.tone === "fast" ? `${GOLD}55` : `${GOLD}22`}`,
            }}
          >
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-serif text-sm" style={{ color: IVORY }}>
                {m.label}
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
                {m.window}
              </span>
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
        ))}
      </div>
    </div>
  );
}

/* ---------- DEMO BLOCK (combines tabs variant + coach option) ---------- */
function DemoBlock({
  tabsVariant,
  coachVariant,
  defaultActive,
}: {
  tabsVariant: "all" | "explore" | "top3";
  coachVariant: "trainer" | "brand" | "none";
  defaultActive: string;
}) {
  const [active, setActive] = useState(defaultActive);
  return (
    <div className="pt-4 pb-8" style={{ background: SURFACE_2 }}>
      <SectionTitle kicker="Nutrition" title="Recommendations" />
      {tabsVariant === "all" && <KetoTabsAll active={active} setActive={setActive} />}
      {tabsVariant === "explore" && <KetoTabsAssignedExplore active={active} setActive={setActive} />}
      {tabsVariant === "top3" && <KetoTabsTop3 active={active} setActive={setActive} />}
      <SynergyContent ketoId={active} withCoach={coachVariant} />
    </div>
  );
}

export default function ClientFastingPlanDetailPreview() {
  const navigate = useNavigate();

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
          className="text-[10px] uppercase tracking-[0.35em]"
          style={{ color: GOLD }}
        >
          Protocol
        </div>
        <div style={{ width: 22 }} />
      </header>

      <Hero />
      <EatingWindow />

      {/* Locked: Assigned + Explore (all keto types) · Coach Trainer */}
      <div className="mt-6">
        <DemoBlock tabsVariant="explore" coachVariant="trainer" defaultActive="skd" />
      </div>
    </div>
  );
}
