import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { LionWatermark } from "@/components/explore/LionWatermark";

const BG = "hsl(0 0% 4%)";
const SURFACE = "hsl(0 0% 7%)";
const SURFACE_RAISED = "hsl(0 0% 10%)";
const GOLD = "hsl(42 70% 55%)";
const GOLD_DEEP = "hsl(38 65% 42%)";
const IVORY = "hsl(40 20% 92%)";
const MUTED = "hsl(40 10% 60%)";
const HAIRLINE = "hsl(42 70% 55% / 0.22)";
const HEX_CLIP = "polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)";

/* ---------------- Badge variants ---------------- */

// Style A — Gold gradient hexagons (filled, black serif label)
function BadgeGoldFilled({ label, type }: { label: string; type: string }) {
  const tag = type.toUpperCase();
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative h-16 w-16 flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DEEP} 100%)`,
          clipPath: HEX_CLIP,
        }}
      >
        <span
          className="text-sm font-bold leading-none"
          style={{ color: "hsl(0 0% 6%)", fontFamily: "Georgia, serif" }}
        >
          {label}
        </span>
      </div>
      <span className="text-[9px] tracking-[0.2em]" style={{ color: GOLD }}>{tag}</span>
    </div>
  );
}

// Style B — Category-tinted hexagons (Fasting=gold, Sleep=purple-gold, Movement=red-gold)
function BadgeCategoryTint({ label, type }: { label: string; type: string }) {
  const tones: Record<string, [string, string, string]> = {
    fasting: [GOLD, GOLD_DEEP, GOLD],
    sleep: ["hsl(270 30% 55%)", "hsl(270 35% 35%)", "hsl(270 40% 70%)"],
    movement: ["hsl(0 65% 55%)", "hsl(0 70% 38%)", "hsl(15 75% 65%)"],
  };
  const [c1, c2, accent] = tones[type] ?? tones.fasting;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative h-16 w-16 flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
          clipPath: HEX_CLIP,
        }}
      >
        <span
          className="text-sm font-bold leading-none"
          style={{ color: "hsl(0 0% 6%)", fontFamily: "Georgia, serif" }}
        >
          {label}
        </span>
      </div>
      <span className="text-[9px] tracking-[0.2em]" style={{ color: accent }}>{type.toUpperCase()}</span>
    </div>
  );
}

// Style C — Gold outline hexagons (hollow, black fill, gold serif label)
function BadgeGoldOutline({ label, type }: { label: string; type: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative h-20 w-20"
        style={{
          filter:
            "drop-shadow(0 10px 14px rgba(0,0,0,0.75)) drop-shadow(0 2px 4px rgba(0,0,0,0.6)) drop-shadow(0 0 12px hsl(42 70% 55% / 0.25))",
        }}
      >
        {/* Bottom shadow rim — creates the "lifted" base */}
        <div
          className="absolute inset-0 translate-y-[3px]"
          style={{
            background: "hsl(0 0% 0%)",
            clipPath: HEX_CLIP,
            opacity: 0.9,
          }}
        />
        {/* Outer gold rim with stronger metallic gradient (multi-stop for chrome feel) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(155deg, hsl(48 95% 88%) 0%, hsl(45 85% 70%) 18%, hsl(42 75% 52%) 38%, hsl(36 60% 30%) 58%, hsl(40 70% 45%) 78%, hsl(48 90% 78%) 100%)",
            clipPath: HEX_CLIP,
          }}
        />
        {/* Inner dark bevel ring (creates depth between rim and face) */}
        <div
          className="absolute inset-[3px]"
          style={{
            background:
              "linear-gradient(155deg, hsl(0 0% 18%) 0%, hsl(0 0% 4%) 50%, hsl(0 0% 12%) 100%)",
            clipPath: HEX_CLIP,
          }}
        />
        {/* Glossy black inner face — recessed */}
        <div
          className="absolute inset-[5px] flex items-center justify-center overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at 35% 25%, hsl(0 0% 28%) 0%, hsl(0 0% 10%) 40%, hsl(0 0% 2%) 100%)",
            clipPath: HEX_CLIP,
            boxShadow:
              "inset 0 2px 3px rgba(0,0,0,0.9), inset 0 -1px 2px rgba(255,255,255,0.05)",
          }}
        >
          {/* Top specular highlight */}
          <div
            className="absolute inset-x-0 top-0 h-[55%] pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
            }}
          />
          {/* Bottom dark gradient for depth */}
          <div
            className="absolute inset-x-0 bottom-0 h-[55%] pointer-events-none"
            style={{
              background:
                "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)",
            }}
          />
          {/* Subtle gold inner glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 50% 60%, hsl(42 70% 55% / 0.18) 0%, transparent 60%)",
            }}
          />
          <span
            className="relative text-base font-bold leading-none"
            style={{
              color: "hsl(45 85% 70%)",
              fontFamily: "Georgia, serif",
              textShadow:
                "0 1px 0 rgba(0,0,0,0.95), 0 -1px 0 rgba(255,255,255,0.08), 0 0 10px hsl(42 70% 55% / 0.5)",
            }}
          >
            {label}
          </span>
        </div>
      </div>
      <span className="text-[9px] tracking-[0.2em]" style={{ color: GOLD }}>{type.toUpperCase()}</span>
    </div>
  );
}

/* ---------------- List variants ---------------- */

const SAMPLE = [
  { label: "16H", type: "fasting", title: "4 x 16h Fasts", meta: "7 days · 1.1m active" },
  { label: "20H", type: "fasting", title: "4 x 20h Fasts", meta: "30 days · 129.8k active" },
  { label: "200H", type: "fasting", title: "200 Fasting Hours", meta: "14 days · 640.1k active" },
  { label: "7H", type: "sleep", title: "7 Hours a Night", meta: "35 days · 72.8k active" },
  { label: "70M", type: "movement", title: "70 Active Minutes", meta: "7 days · 86.1k active" },
];

function ListPure({ Badge }: { Badge: React.FC<{ label: string; type: string }> }) {
  return (
    <div style={{ background: BG }}>
      {SAMPLE.map((row, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-4"
          style={{
            borderBottom: i < SAMPLE.length - 1 ? `1px solid ${HAIRLINE}` : undefined,
          }}
        >
          <Badge label={row.label} type={row.type} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] tracking-[0.22em] mb-1" style={{ color: GOLD }}>
              {row.type.toUpperCase()}
            </p>
            <p className="text-base font-semibold truncate" style={{ color: IVORY, fontFamily: "Georgia, serif" }}>
              {row.title}
            </p>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>{row.meta}</p>
          </div>
          <ChevronRight className="h-4 w-4" style={{ color: GOLD }} />
        </div>
      ))}
    </div>
  );
}

function ListRaised({ Badge }: { Badge: React.FC<{ label: string; type: string }> }) {
  return (
    <div
      style={{
        background: SURFACE_RAISED,
        border: `1px solid ${HAIRLINE}`,
      }}
    >
      {SAMPLE.map((row, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-4"
          style={{
            borderBottom: i < SAMPLE.length - 1 ? `1px solid ${HAIRLINE}` : undefined,
          }}
        >
          <Badge label={row.label} type={row.type} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] tracking-[0.22em] mb-1" style={{ color: GOLD }}>
              {row.type.toUpperCase()}
            </p>
            <p className="text-base font-semibold truncate" style={{ color: IVORY, fontFamily: "Georgia, serif" }}>
              {row.title}
            </p>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>{row.meta}</p>
          </div>
          <ChevronRight className="h-4 w-4" style={{ color: GOLD }} />
        </div>
      ))}
    </div>
  );
}

/* ---------------- Page ---------------- */

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="relative px-4 py-8" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <LionWatermark opacity={0.04} />
      </div>
      <div className="relative">
        <p className="text-[10px] tracking-[0.3em] mb-1" style={{ color: GOLD }}>PREVIEW</p>
        <h2 className="text-xl font-semibold mb-1" style={{ color: IVORY, fontFamily: "Georgia, serif" }}>
          {title}
        </h2>
        {subtitle && <p className="text-xs mb-5" style={{ color: MUTED }}>{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}

export default function ExploreStylePreview() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3"
        style={{ background: BG, borderBottom: `1px solid ${HAIRLINE}` }}
      >
        <button onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="h-5 w-5" style={{ color: IVORY }} />
        </button>
        <div>
          <p className="text-[10px] tracking-[0.3em]" style={{ color: GOLD }}>STYLE LAB</p>
          <h1 className="text-lg font-semibold" style={{ color: IVORY, fontFamily: "Georgia, serif" }}>
            Challenge Badge & List
          </h1>
        </div>
      </header>

      {/* Badge comparison row */}
      <Section title="Badge Style A — Gold Filled" subtitle="Gold gradient hexagons, black serif label.">
        <div className="flex justify-around py-2">
          <BadgeGoldFilled label="16H" type="fasting" />
          <BadgeGoldFilled label="200H" type="fasting" />
          <BadgeGoldFilled label="7H" type="sleep" />
          <BadgeGoldFilled label="70M" type="movement" />
        </div>
      </Section>

      <Section title="Badge Style B — Category Tinted" subtitle="Fasting=gold, Sleep=purple-gold, Movement=red-gold.">
        <div className="flex justify-around py-2">
          <BadgeCategoryTint label="16H" type="fasting" />
          <BadgeCategoryTint label="200H" type="fasting" />
          <BadgeCategoryTint label="7H" type="sleep" />
          <BadgeCategoryTint label="70M" type="movement" />
        </div>
      </Section>

      <Section title="Badge Style C — Gold Outline" subtitle="Hollow hex, black fill, gold serif label. Most editorial.">
        <div className="flex justify-around py-2">
          <BadgeGoldOutline label="16H" type="fasting" />
          <BadgeGoldOutline label="200H" type="fasting" />
          <BadgeGoldOutline label="7H" type="sleep" />
          <BadgeGoldOutline label="70M" type="movement" />
        </div>
      </Section>

      {/* List backgrounds */}
      <Section title="List BG 1 — Pure Black + Gold Hairlines" subtitle="Using Style A badges.">
        <ListPure Badge={BadgeGoldFilled} />
      </Section>

      <Section title="List BG 2 — Raised Dark Card + Gold Hairlines" subtitle="Using Style A badges.">
        <ListRaised Badge={BadgeGoldFilled} />
      </Section>

      <Section title="List BG 1 + Style C (Outline)" subtitle="Pure black with hollow gold hex badges.">
        <ListPure Badge={BadgeGoldOutline} />
      </Section>

      <div className="h-24" />
    </div>
  );
}