import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

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
    </div>
  );
}
