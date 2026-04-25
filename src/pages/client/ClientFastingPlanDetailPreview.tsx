import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import lionLogo from "@/assets/logo.png";

/**
 * Editorial Black & Gold — Fasting Plan Detail (TOP HALF demo).
 * Shows all 3 hero variants stacked, each with a toggle between
 * picker style 1 (wheels) and picker style 2 (tap-to-edit).
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

type PickerMode = "wheel" | "tap";

/* ---------- PICKER 1 — WHEEL ---------- */
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
        {/* selection band */}
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

/* ---------- PICKER 2 — TAP TO EDIT ---------- */
function TapPicker() {
  return (
    <div className="mt-5 space-y-4">
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ background: SURFACE_2, border: `1px solid ${GOLD}22` }}
      >
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.25em] mb-1"
            style={{ color: MUTED }}
          >
            Eating window opens
          </div>
          <div className="font-serif text-2xl" style={{ color: IVORY }}>
            10:00 AM
          </div>
        </div>
        <div className="text-xs" style={{ color: GOLD }}>
          Edit
        </div>
      </div>
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ background: SURFACE_2, border: `1px solid ${GOLD}22` }}
      >
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.25em] mb-1"
            style={{ color: MUTED }}
          >
            Eating window closes
          </div>
          <div className="font-serif text-2xl" style={{ color: IVORY }}>
            8:00 PM
          </div>
        </div>
        <div className="text-xs" style={{ color: GOLD }}>
          Edit
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        {["Early Bird", "Standard", "Night Owl"].map((p, i) => (
          <button
            key={p}
            className="flex-1 py-2 text-[11px] uppercase tracking-[0.2em]"
            style={{
              background: i === 1 ? `${GOLD}15` : "transparent",
              color: i === 1 ? GOLD : MUTED,
              border: `1px solid ${i === 1 ? GOLD : `${GOLD}22`}`,
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- WINDOW BLOCK (shared) ---------- */
function EatingWindow({ mode }: { mode: PickerMode }) {
  return (
    <div
      className="mx-5 mt-6 p-5"
      style={{ background: SURFACE, border: `1px solid ${GOLD}30` }}
    >
      <div
        className="text-center text-[10px] uppercase tracking-[0.3em] mb-4"
        style={{ color: GOLD }}
      >
        Eating Window
      </div>
      <div className="text-center font-serif text-4xl" style={{ color: IVORY }}>
        {SAMPLE.eatHours}
        <span className="text-xl" style={{ color: GOLD_SOFT }}>
          h
        </span>
      </div>
      {mode === "wheel" ? <WheelPicker /> : <TapPicker />}
    </div>
  );
}

/* ---------- HERO 1 — LION WATERMARK ---------- */
function HeroLion() {
  return (
    <div className="relative overflow-hidden px-5 pt-10 pb-8">
      <img
        src={lionLogo}
        alt=""
        aria-hidden
        className="absolute -right-12 top-4 w-56 h-56 object-contain pointer-events-none"
        style={{
          filter: "sepia(1) hue-rotate(-15deg) saturate(2.5) brightness(1.2)",
          opacity: 0.16,
        }}
      />
      <div
        className="text-[10px] uppercase tracking-[0.35em] mb-3"
        style={{ color: GOLD }}
      >
        {SAMPLE.eyebrow}
      </div>
      <h1
        className="font-serif text-5xl leading-[0.95] mb-4"
        style={{ color: IVORY }}
      >
        {SAMPLE.name}
      </h1>
      <p className="text-sm leading-relaxed mb-5" style={{ color: MUTED }}>
        {SAMPLE.description}
      </p>
      <div className="flex items-center gap-3">
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

/* ---------- HERO 2 — GOLD NUMERAL ---------- */
function HeroNumeral() {
  return (
    <div className="relative overflow-hidden px-5 pt-10 pb-8">
      <div
        className="absolute right-2 top-0 font-serif leading-none pointer-events-none select-none"
        style={{
          fontSize: 220,
          color: GOLD,
          opacity: 0.18,
          letterSpacing: "-0.05em",
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

/* ---------- HERO 3 — PURE TYPOGRAPHIC ---------- */
function HeroTypographic() {
  return (
    <div className="px-5 pt-10 pb-8">
      <div
        className="text-[10px] uppercase tracking-[0.35em] mb-4"
        style={{ color: GOLD }}
      >
        {SAMPLE.eyebrow}
      </div>
      <h1
        className="font-serif text-6xl leading-[0.9] mb-5"
        style={{ color: IVORY, letterSpacing: "-0.02em" }}
      >
        {SAMPLE.name}
      </h1>
      <div
        className="flex items-baseline gap-4 py-3 mb-5"
        style={{
          borderTop: `1px solid ${GOLD}40`,
          borderBottom: `1px solid ${GOLD}40`,
        }}
      >
        <div>
          <span className="font-serif text-3xl" style={{ color: GOLD }}>
            {SAMPLE.fastHours}
          </span>
          <span className="ml-1 text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTED }}>
            hr fast
          </span>
        </div>
        <div className="flex-1 h-px" style={{ background: `${GOLD}33` }} />
        <div>
          <span className="font-serif text-3xl" style={{ color: IVORY }}>
            {SAMPLE.eatHours}
          </span>
          <span className="ml-1 text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTED }}>
            hr eat
          </span>
        </div>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
        {SAMPLE.description}
      </p>
    </div>
  );
}

/* ---------- VARIANT BLOCK ---------- */
function VariantBlock({
  label,
  Hero,
}: {
  label: string;
  Hero: () => JSX.Element;
}) {
  const [mode, setMode] = useState<PickerMode>("wheel");
  return (
    <section
      className="mb-10"
      style={{ borderTop: `1px solid ${GOLD}25` }}
    >
      <div
        className="px-5 pt-4 pb-2 text-[10px] uppercase tracking-[0.3em]"
        style={{ color: GOLD }}
      >
        {label}
      </div>
      <Hero />
      <div className="px-5 flex gap-2">
        <button
          onClick={() => setMode("wheel")}
          className="flex-1 py-2 text-[10px] uppercase tracking-[0.25em]"
          style={{
            background: mode === "wheel" ? `${GOLD}18` : "transparent",
            color: mode === "wheel" ? GOLD : MUTED,
            border: `1px solid ${mode === "wheel" ? GOLD : `${GOLD}22`}`,
          }}
        >
          Picker 1 · Wheel
        </button>
        <button
          onClick={() => setMode("tap")}
          className="flex-1 py-2 text-[10px] uppercase tracking-[0.25em]"
          style={{
            background: mode === "tap" ? `${GOLD}18` : "transparent",
            color: mode === "tap" ? GOLD : MUTED,
            border: `1px solid ${mode === "tap" ? GOLD : `${GOLD}22`}`,
          }}
        >
          Picker 2 · Tap to edit
        </button>
      </div>
      <EatingWindow mode={mode} />
    </section>
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
          Detail · Top half demo
        </div>
        <div style={{ width: 22 }} />
      </header>

      <VariantBlock label="Variant 1 · Lion watermark" Hero={HeroLion} />
      <VariantBlock label="Variant 2 · Gold numeral" Hero={HeroNumeral} />
      <VariantBlock label="Variant 3 · Pure typographic" Hero={HeroTypographic} />
    </div>
  );
}
