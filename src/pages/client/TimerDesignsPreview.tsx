import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import fastingCardBgImg from "@/assets/fasting-timer-bg.jpg";

/**
 * Preview gallery — 4 redesign concepts for the lion fasting timer
 * in the new white/gold theme. Static demo data only.
 */

const DEMO = {
  planName: "11h Fast",
  ketoAbbr: "HPKD",
  ketoName: "High Protein Ketogenic Diet",
  stage: "ANABOLIC",
  time: "10:41:57",
  pct: 3,
  started: "Sat, 4:04 PM",
  goalLabel: "11H GOAL",
  goal: "Sun, 3:04 AM",
  description: "Blood sugar rises",
};

const GOLD = "hsl(43 65% 52%)";
const GOLD_DEEP = "hsl(38 70% 42%)";
const GOLD_LIGHT = "hsl(46 80% 70%)";

/* ---------- Shared ring builder ---------- */
function Ring({
  size = 260,
  stroke = 6,
  progress = 0.03,
  trackColor = "hsl(43 30% 90%)",
  arcColor = GOLD,
  showDot = true,
  dotColor = GOLD,
  glow = false,
}: {
  size?: number;
  stroke?: number;
  progress?: number;
  trackColor?: string;
  arcColor?: string;
  showDot?: boolean;
  dotColor?: string;
  glow?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * progress;
  const cx = size / 2;
  const cy = size / 2;
  const angle = progress * 2 * Math.PI - Math.PI / 2;
  const dotX = cx + r * Math.cos(angle);
  const dotY = cy + r * Math.sin(angle);
  return (
    <svg width={size} height={size} className="-rotate-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={arcColor}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={glow ? { filter: `drop-shadow(0 0 8px ${arcColor})` } : undefined}
      />
      {showDot && (
        <circle cx={dotX} cy={dotY} r={stroke * 0.9} fill={dotColor} style={glow ? { filter: `drop-shadow(0 0 6px ${dotColor})` } : undefined} />
      )}
    </svg>
  );
}

/* ============================================================= */
/*  IDEA 1 — Champagne Halo                                       */
/* ============================================================= */
function ChampagneHalo() {
  return (
    <Card className="overflow-hidden border-0 shadow-[0_8px_40px_-12px_hsl(43_50%_50%/0.25)] bg-white">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Fasting Program</p>
            <h3 className="text-xl font-black mt-1 text-neutral-900">{DEMO.planName}</h3>
            <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: "hsl(43 60% 95%)", color: GOLD_DEEP }}>
              {DEMO.ketoAbbr}
              <span className="text-neutral-400">·</span>
              <span className="font-medium text-neutral-600">{DEMO.ketoName}</span>
            </div>
          </div>
          <Badge className="text-[10px] font-bold border" style={{ backgroundColor: "transparent", color: GOLD_DEEP, borderColor: `${GOLD}66` }}>
            Coach Assigned
          </Badge>
        </div>

        <div className="relative flex items-center justify-center" style={{ background: "radial-gradient(circle, hsl(43 60% 97%) 0%, white 70%)" }}>
          {/* halo glow */}
          <div className="absolute w-[240px] h-[240px] rounded-full" style={{ background: `radial-gradient(circle, ${GOLD}22 0%, transparent 60%)` }} />
          <Ring progress={0.03} stroke={4} trackColor="hsl(43 30% 92%)" arcColor={GOLD} dotColor={GOLD} glow />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold tracking-[0.3em]" style={{ color: GOLD_DEEP }}>{DEMO.stage}</span>
            <span className="text-4xl font-light tabular-nums tracking-tight mt-1 text-neutral-900">{DEMO.time}</span>
            <span className="text-[10px] uppercase tracking-wider mt-1 text-neutral-500">Elapsed ({DEMO.pct}%)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl px-3 py-2.5 text-center bg-white border" style={{ borderColor: `${GOLD}40` }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-neutral-500">Started</p>
            <p className="text-xs font-bold text-neutral-900">{DEMO.started}</p>
          </div>
          <div className="rounded-xl px-3 py-2.5 text-center bg-white border" style={{ borderColor: `${GOLD}40` }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-neutral-500">{DEMO.goalLabel}</p>
            <p className="text-xs font-bold text-neutral-900">{DEMO.goal}</p>
          </div>
        </div>

        <p className="text-xs text-neutral-600 text-center font-medium">{DEMO.description}</p>

        <Button className="w-full h-12 text-sm font-bold text-neutral-900 hover:opacity-90" style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})` }}>
          End Fast
        </Button>
      </CardContent>
    </Card>
  );
}

/* ============================================================= */
/*  IDEA 2 — Gold Leaf Lion                                       */
/* ============================================================= */
function GoldLeafLion() {
  return (
    <Card className="overflow-hidden border-0 shadow-[0_8px_40px_-12px_hsl(43_50%_50%/0.35)] relative" style={{ background: "linear-gradient(180deg, hsl(43 50% 98%) 0%, white 60%)" }}>
      {/* gold-tinted lion */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${fastingCardBgImg})`,
          opacity: 0.18,
          filter: "sepia(1) hue-rotate(0deg) saturate(1.8) brightness(1.1)",
        }}
      />
      <div className="absolute inset-0" style={{ background: `radial-gradient(circle at center, transparent 30%, white 80%)` }} />
      <CardContent className="p-6 space-y-5 relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD_DEEP }}>Fasting Program</p>
            <h3 className="text-xl font-black mt-1 text-neutral-900">{DEMO.planName}</h3>
            <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${GOLD}25`, color: GOLD_DEEP }}>
              {DEMO.ketoAbbr}
              <span className="text-neutral-400">·</span>
              <span className="font-medium text-neutral-600">{DEMO.ketoName}</span>
            </div>
          </div>
          <Badge className="text-[10px] font-bold border-0" style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD_DEEP})`, color: "white" }}>
            ★ Coach
          </Badge>
        </div>

        <div className="relative flex items-center justify-center py-2">
          <Ring
            progress={0.03}
            stroke={8}
            trackColor="hsl(43 25% 88%)"
            arcColor={GOLD}
            dotColor={GOLD_LIGHT}
            glow
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold tracking-[0.3em]" style={{ color: GOLD_DEEP }}>{DEMO.stage}</span>
            <span className="text-4xl font-black tabular-nums tracking-tight mt-1 text-neutral-900" style={{ textShadow: `0 1px 0 hsl(43 30% 90%)` }}>
              {DEMO.time}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider mt-1 text-neutral-500">Elapsed ({DEMO.pct}%)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: `linear-gradient(180deg, white, hsl(43 40% 96%))`, border: `1px solid ${GOLD}40` }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: GOLD_DEEP }}>Started</p>
            <p className="text-xs font-bold text-neutral-900">{DEMO.started}</p>
          </div>
          <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: `linear-gradient(180deg, white, hsl(43 40% 96%))`, border: `1px solid ${GOLD}40` }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: GOLD_DEEP }}>{DEMO.goalLabel}</p>
            <p className="text-xs font-bold text-neutral-900">{DEMO.goal}</p>
          </div>
        </div>

        <p className="text-xs font-bold text-center" style={{ color: GOLD_DEEP }}>{DEMO.description}</p>

        <Button className="w-full h-12 text-sm font-black text-white border-0 shadow-md" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})` }}>
          End Fast
        </Button>
      </CardContent>
    </Card>
  );
}

/* ============================================================= */
/*  IDEA 3 — Editorial White                                      */
/* ============================================================= */
function EditorialWhite() {
  return (
    <Card className="overflow-hidden border-0 shadow-sm bg-white">
      <CardContent className="p-6 space-y-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400">Fasting Program · Day 1</p>
          <h3 className="text-2xl font-light mt-2 text-neutral-900" style={{ fontFamily: "Georgia, serif" }}>
            {DEMO.planName}
          </h3>
          <div className="h-px w-12 mt-3" style={{ backgroundColor: GOLD }} />
        </div>

        <div className="relative flex items-center justify-center">
          <Ring progress={0.03} stroke={1.5} trackColor="hsl(0 0% 92%)" arcColor={GOLD} dotColor={GOLD} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-extralight tabular-nums tracking-tight text-neutral-900" style={{ fontFamily: "Georgia, serif" }}>
              {DEMO.time}
            </span>
            <span className="inline-block mt-3 px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full" style={{ backgroundColor: `${GOLD}18`, color: GOLD_DEEP }}>
              {DEMO.stage} · PHASE 1
            </span>
            <span className="text-[10px] tracking-[0.3em] mt-2 text-neutral-400">{DEMO.pct}% ELAPSED</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">Started</p>
            <p className="text-sm font-medium text-neutral-900">{DEMO.started}</p>
          </div>
          <div className="h-px w-full" style={{ backgroundColor: `${GOLD}40` }} />
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">{DEMO.goalLabel}</p>
            <p className="text-sm font-medium text-neutral-900">{DEMO.goal}</p>
          </div>
          <div className="h-px w-full" style={{ backgroundColor: `${GOLD}40` }} />
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">Diet</p>
            <p className="text-sm font-medium text-neutral-900">{DEMO.ketoAbbr}</p>
          </div>
        </div>

        <p className="text-xs text-neutral-500 italic text-center" style={{ fontFamily: "Georgia, serif" }}>
          "{DEMO.description}"
        </p>

        <Button variant="outline" className="w-full h-11 text-sm font-medium border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white rounded-none">
          End Fast
        </Button>
      </CardContent>
    </Card>
  );
}

/* ============================================================= */
/*  IDEA 4 — Engraved Coin                                        */
/* ============================================================= */
function EngravedCoin() {
  return (
    <Card
      className="overflow-hidden border-0 shadow-[0_10px_40px_-10px_hsl(38_60%_40%/0.4)] relative"
      style={{
        background: `radial-gradient(circle at 30% 20%, ${GOLD_LIGHT} 0%, ${GOLD} 35%, ${GOLD_DEEP} 100%)`,
      }}
    >
      {/* brushed metal sheen */}
      <div className="absolute inset-0 opacity-20" style={{ background: "repeating-linear-gradient(135deg, transparent 0 2px, white 2px 3px)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at center, transparent 40%, hsl(38 60% 35%/0.4) 100%)" }} />

      <CardContent className="p-6 space-y-5 relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "hsl(38 50% 25%)", textShadow: "0 1px 0 hsl(43 80% 75%)" }}>
              Fasting Program
            </p>
            <h3 className="text-xl font-black mt-1" style={{ color: "hsl(38 60% 20%)", textShadow: "0 1px 0 hsl(43 80% 80%)" }}>
              {DEMO.planName}
            </h3>
          </div>
          <Badge className="text-[10px] font-bold border-0" style={{ background: "hsl(38 60% 20%)", color: GOLD_LIGHT }}>
            Coach Assigned
          </Badge>
        </div>

        <div className="relative flex items-center justify-center py-2">
          {/* engraved lion */}
          <div
            className="absolute w-[200px] h-[200px] bg-cover bg-center rounded-full"
            style={{
              backgroundImage: `url(${fastingCardBgImg})`,
              opacity: 0.35,
              filter: "grayscale(1) contrast(1.5) brightness(0.6) sepia(1) hue-rotate(-10deg) saturate(2)",
              boxShadow: "inset 0 4px 12px hsl(38 60% 25%/0.6), inset 0 -2px 6px hsl(43 80% 85%/0.4)",
            }}
          />
          <Ring
            size={260}
            stroke={5}
            progress={0.03}
            trackColor="hsl(38 50% 35%)"
            arcColor="hsl(43 90% 85%)"
            dotColor="hsl(43 95% 90%)"
            glow
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold tracking-[0.3em]" style={{ color: "hsl(38 60% 20%)", textShadow: "0 1px 0 hsl(43 80% 80%)" }}>
              {DEMO.stage}
            </span>
            <span
              className="text-4xl font-black tabular-nums tracking-tight mt-1"
              style={{ color: "hsl(38 60% 18%)", textShadow: "0 1px 0 hsl(43 90% 85%), 0 -1px 0 hsl(38 60% 30%)" }}
            >
              {DEMO.time}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: "hsl(38 50% 25%)" }}>
              Elapsed ({DEMO.pct}%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-xl px-3 py-2.5 text-center"
            style={{
              background: "hsl(38 60% 20%/0.85)",
              boxShadow: "inset 0 1px 2px hsl(38 60% 10%), 0 1px 0 hsl(43 90% 85%)",
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: GOLD_LIGHT }}>Started</p>
            <p className="text-xs font-bold text-white">{DEMO.started}</p>
          </div>
          <div
            className="rounded-xl px-3 py-2.5 text-center"
            style={{
              background: "hsl(38 60% 20%/0.85)",
              boxShadow: "inset 0 1px 2px hsl(38 60% 10%), 0 1px 0 hsl(43 90% 85%)",
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: GOLD_LIGHT }}>{DEMO.goalLabel}</p>
            <p className="text-xs font-bold text-white">{DEMO.goal}</p>
          </div>
        </div>

        <p className="text-xs font-bold text-center" style={{ color: "hsl(38 60% 18%)" }}>{DEMO.description}</p>

        <Button className="w-full h-12 text-sm font-black border-0" style={{ background: "hsl(38 60% 18%)", color: GOLD_LIGHT, boxShadow: "inset 0 1px 0 hsl(43 70% 40%), 0 2px 0 hsl(38 60% 12%)" }}>
          End Fast
        </Button>
      </CardContent>
    </Card>
  );
}

/* ============================================================= */
/*  Page                                                          */
/* ============================================================= */
export default function TimerDesignsPreview() {
  const navigate = useNavigate();
  const designs = [
    { id: 1, name: "Champagne Halo", desc: "Minimal & premium · soft glow, hairline ring", node: <ChampagneHalo /> },
    { id: 2, name: "Gold Leaf Lion", desc: "Brand-forward · gold-tinted lion hero", node: <GoldLeafLion /> },
    { id: 3, name: "Editorial White", desc: "Magazine layout · serif type, no lion", node: <EditorialWhite /> },
    { id: 4, name: "Engraved Coin", desc: "Tactile metallic · brushed gold medallion", node: <EngravedCoin /> },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-base font-black text-neutral-900">Lion Timer · 4 Designs</h1>
            <p className="text-[11px] text-neutral-500">Pick one (or mix) — these are mockups, not live</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {designs.map((d) => (
          <section key={d.id} className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black text-white"
                style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD_DEEP})` }}
              >
                {d.id}
              </span>
              <h2 className="text-lg font-black text-neutral-900">{d.name}</h2>
              <span className="text-xs text-neutral-500">— {d.desc}</span>
            </div>
            {d.node}
          </section>
        ))}

        <p className="text-center text-xs text-neutral-500 pt-4">
          Tell me which number you want and I'll wire it into your live dashboard.
        </p>
      </div>
    </div>
  );
}