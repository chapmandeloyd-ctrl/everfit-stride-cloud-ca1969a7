import { Lock } from "lucide-react";

const GOLD = "hsl(42 70% 55%)";
const IVORY = "hsl(40 20% 92%)";
const MUTED = "hsl(40 10% 65%)";
const CARD_BG = "hsl(0 0% 7%)";

/**
 * Visual demo of the new "Big Number" Windows card design.
 * Standalone preview at /windows-card-demo — does NOT touch the live Windows tab.
 */
function BigNumberWindowCard({
  eyebrow,
  bigNumber,
  name,
  fastHours,
  eatHours,
  status,
}: {
  eyebrow: string;
  bigNumber: string;
  name: string;
  fastHours: number;
  eatHours: number;
  status?: "yours" | "locked";
}) {
  return (
    <div
      className="relative w-full overflow-hidden p-5"
      style={{
        background: `linear-gradient(135deg, ${CARD_BG} 0%, hsl(0 0% 5%) 100%)`,
        border: `1px solid ${GOLD}30`,
        minHeight: 170,
      }}
    >
      {/* Giant background number bleeding off the right */}
      <div
        className="absolute pointer-events-none select-none"
        style={{
          right: -24,
          top: -30,
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 240,
          lineHeight: 1,
          color: GOLD,
          opacity: 0.22,
          fontWeight: 400,
          letterSpacing: "-0.04em",
        }}
      >
        {bigNumber}
      </div>

      {/* Status badge */}
      {status === "yours" && (
        <div
          className="absolute top-4 right-4 px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
          style={{ background: GOLD, color: "hsl(0 0% 4%)" }}
        >
          ★ Yours
        </div>
      )}
      {status === "locked" && (
        <div
          className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
          style={{ background: "hsl(0 0% 0% / 0.6)", color: MUTED, border: `1px solid ${MUTED}40` }}
        >
          <Lock className="w-3 h-3" />
          Locked
        </div>
      )}

      {/* Eyebrow */}
      <p
        className="text-[11px] font-bold uppercase mb-3"
        style={{ color: GOLD, letterSpacing: "0.18em" }}
      >
        {eyebrow}
      </p>

      {/* Title */}
      <h3
        className="relative max-w-[65%]"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 26,
          lineHeight: 1.15,
          color: IVORY,
          fontWeight: 400,
        }}
      >
        {name}
      </h3>

      {/* Bottom stats row */}
      <div
        className="absolute bottom-5 left-5 right-5 flex items-center gap-4 pt-3"
        style={{ borderTop: `1px solid ${GOLD}20` }}
      >
        <span className="text-[12px]" style={{ color: GOLD, fontWeight: 600 }}>
          {fastHours}h Fasting
        </span>
        <span style={{ color: MUTED }}>·</span>
        <span className="text-[12px]" style={{ color: MUTED }}>
          {eatHours}h Eating
        </span>
      </div>
    </div>
  );
}

export default function WindowsCardDemo() {
  return (
    <div className="min-h-screen pb-20" style={{ background: "hsl(0 0% 4%)" }}>
      <div className="max-w-md mx-auto px-5 pt-10">
        <p className="text-[11px] font-bold uppercase mb-2" style={{ color: GOLD, letterSpacing: "0.2em" }}>
          Demo Preview
        </p>
        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 40,
            lineHeight: 1.05,
            color: IVORY,
          }}
        >
          Windows cards
        </h1>
        <p className="mt-2 mb-8 text-sm" style={{ color: MUTED }}>
          Big number redesign — preview only. Live tab is unchanged.
        </p>

        <p className="text-[11px] font-bold uppercase mb-3" style={{ color: MUTED, letterSpacing: "0.2em" }}>
          Recommended For You
        </p>
        <div className="mb-8">
          <BigNumberWindowCard
            eyebrow="16HR Fasting"
            bigNumber="16"
            name="Metabolic Foundation Protocol"
            fastHours={16}
            eatHours={8}
            status="yours"
          />
        </div>

        <p className="text-[11px] font-bold uppercase mb-3" style={{ color: MUTED, letterSpacing: "0.2em" }}>
          Beginner Windows
        </p>
        <div className="space-y-4">
          <BigNumberWindowCard
            eyebrow="11HR Fasting"
            bigNumber="11"
            name="Beginner Intermittent Fast"
            fastHours={11}
            eatHours={13}
          />
          <BigNumberWindowCard
            eyebrow="12HR Fasting"
            bigNumber="12"
            name="Balanced Metabolic Rhythm"
            fastHours={12}
            eatHours={12}
          />
          <BigNumberWindowCard
            eyebrow="13HR Fasting"
            bigNumber="13"
            name="Structured Beginner Fast"
            fastHours={13}
            eatHours={11}
            status="locked"
          />
        </div>
      </div>
    </div>
  );
}