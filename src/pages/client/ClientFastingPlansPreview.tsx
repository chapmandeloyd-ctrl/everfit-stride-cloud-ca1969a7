import { useState } from "react";
import lionLogo from "@/assets/logo.png";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Preview page comparing two card illustration treatments:
 *   1. Faint gold lion watermark on right of each card
 *   2. Huge gold hour numeral on right of each card
 *
 * Both share the Editorial Black & Gold theme.
 */

const GOLD = "hsl(42 70% 55%)";
const IVORY = "hsl(40 20% 92%)";
const MUTED = "hsl(40 10% 65%)";
const BLACK = "hsl(0 0% 4%)";
const CARD_BG = "hsl(0 0% 7%)";

const PLANS = [
  { hours: 16, name: "Leangains", desc: "One of the most popular methods", recommended: true },
  { hours: 12, name: "Easy Start", desc: "Great for beginners" },
  { hours: 14, name: "Easy Start +", desc: "Easily fits into any lifestyle" },
  { hours: 18, name: "Leangains +", desc: "Kick it up a notch" },
  { hours: 20, name: "Warrior", desc: "For experienced fasters" },
];

function LionCard({ hours, name, desc }: { hours: number; name: string; desc: string }) {
  return (
    <button
      className="relative w-full text-left overflow-hidden p-5 transition active:scale-[0.99]"
      style={{ background: CARD_BG, border: `1px solid ${GOLD}30` }}
    >
      {/* Lion watermark on right */}
      <img
        src={lionLogo}
        alt=""
        aria-hidden
        className="absolute -right-8 top-1/2 -translate-y-1/2 w-44 h-44 object-contain pointer-events-none"
        style={{
          filter: "sepia(1) hue-rotate(-15deg) saturate(2.5) brightness(1.2)",
          opacity: 0.18,
        }}
      />
      <div className="relative space-y-3 max-w-[60%]">
        <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>
          {hours}hr fasting
        </p>
        <h3 className="text-2xl font-light tracking-tight" style={{ color: IVORY, fontFamily: "Georgia, serif" }}>
          {name}
        </h3>
        <p className="text-xs" style={{ color: MUTED }}>{desc}</p>
      </div>
    </button>
  );
}

function NumeralCard({ hours, name, desc }: { hours: number; name: string; desc: string }) {
  return (
    <button
      className="relative w-full text-left overflow-hidden p-5 transition active:scale-[0.99]"
      style={{ background: CARD_BG, border: `1px solid ${GOLD}30` }}
    >
      {/* Huge gold numeral on right */}
      <div
        className="absolute right-4 top-1/2 -translate-y-1/2 leading-none pointer-events-none select-none"
        style={{
          fontFamily: "Georgia, serif",
          fontSize: "7rem",
          fontWeight: 300,
          color: GOLD,
          opacity: 0.85,
        }}
      >
        {hours}
      </div>
      <div className="relative space-y-3 max-w-[60%]">
        <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>
          {hours}hr fasting
        </p>
        <h3 className="text-2xl font-light tracking-tight" style={{ color: IVORY, fontFamily: "Georgia, serif" }}>
          {name}
        </h3>
        <p className="text-xs" style={{ color: MUTED }}>{desc}</p>
      </div>
    </button>
  );
}

export default function ClientFastingPlansPreview() {
  const navigate = useNavigate();
  const [variant, setVariant] = useState<"lion" | "numeral">("lion");
  const Card = variant === "lion" ? LionCard : NumeralCard;
  const recommended = PLANS.find((p) => p.recommended)!;
  const fixed = PLANS.filter((p) => !p.recommended);

  return (
    <div className="min-h-screen" style={{ background: BLACK }}>
      {/* Variant toggle */}
      <div
        className="sticky top-0 z-10 flex gap-2 p-3"
        style={{ background: BLACK, borderBottom: `1px solid ${GOLD}20` }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2"
          style={{ color: IVORY }}
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1 flex gap-2 justify-end">
          <button
            onClick={() => setVariant("lion")}
            className="px-3 py-1.5 text-[11px] uppercase tracking-widest"
            style={{
              background: variant === "lion" ? GOLD : "transparent",
              color: variant === "lion" ? BLACK : GOLD,
              border: `1px solid ${GOLD}`,
            }}
          >
            1 · Lion
          </button>
          <button
            onClick={() => setVariant("numeral")}
            className="px-3 py-1.5 text-[11px] uppercase tracking-widest"
            style={{
              background: variant === "numeral" ? GOLD : "transparent",
              color: variant === "numeral" ? BLACK : GOLD,
              border: `1px solid ${GOLD}`,
            }}
          >
            2 · Numeral
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 pb-12 space-y-8">
        <h1
          className="text-4xl font-light tracking-tight"
          style={{ color: IVORY, fontFamily: "Georgia, serif" }}
        >
          Fasting plans
        </h1>

        {/* Recommended */}
        <section className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: MUTED }}>
            Recommended for you
          </p>
          <Card {...recommended} />
        </section>

        {/* Fixed duration */}
        <section className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: MUTED }}>
            Fixed duration plans
          </p>
          <div className="space-y-3">
            {fixed.map((p) => (
              <Card key={p.hours} {...p} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}