import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, BarChart3, Flame, Calendar, Trophy } from "lucide-react";
import fastingCardBgImg from "@/assets/fasting-timer-bg.jpg";

/**
 * Standalone mockup page to compare premium redesigns of the
 * "Fasting Protocol" hero card. NOT wired into the live dashboard.
 * Visit /preview/protocol-styles to view.
 */

const SAMPLE = {
  planName: "11h Fast",
  fastedHours: 0,
  targetHours: 11,
  dayNumber: 3,
  totalDays: 14,
  level: "Beginner",
  keto: {
    abbreviation: "HPKD",
    name: "High Protein Ketogenic Diet",
    color: "#ef4444",
    fat_pct: 55,
    protein_pct: 30,
    carbs_pct: 15,
  },
};

type Tiles = "three" | "ring" | "four";

function StatTilesThree({ accent }: { accent: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 text-center border border-white/15">
        <Clock className="h-4 w-4 mx-auto text-white/60 mb-1" />
        <p className="text-sm font-black text-white leading-tight tabular-nums">{SAMPLE.fastedHours}h</p>
        <p className="text-[9px] text-white/60 uppercase tracking-wider font-medium mt-0.5">Fasted</p>
      </div>
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 text-center border border-white/15">
        <p className="text-xs font-black leading-tight" style={{ color: accent, textShadow: `0 0 10px ${accent}80` }}>{SAMPLE.keto.abbreviation}</p>
        <p className="text-sm font-black text-white leading-tight mt-0.5 tabular-nums">{SAMPLE.keto.fat_pct}/{SAMPLE.keto.protein_pct}/{SAMPLE.keto.carbs_pct}</p>
        <p className="text-[9px] text-white/60 uppercase tracking-wider font-medium mt-0.5">F / P / C</p>
      </div>
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 text-center border border-white/15">
        <BarChart3 className="h-4 w-4 mx-auto text-white/60 mb-1" />
        <p className="text-sm font-black text-white leading-tight">{SAMPLE.level}</p>
        <p className="text-[9px] text-white/60 uppercase tracking-wider font-medium mt-0.5">Level</p>
      </div>
    </div>
  );
}

function ProgressRing({ accent, animate }: { accent: string; animate: boolean }) {
  const pct = Math.min(100, (SAMPLE.fastedHours / SAMPLE.targetHours) * 100);
  const r = 38;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="relative h-[100px] w-[100px] shrink-0">
      <svg viewBox="0 0 100 100" className={`h-full w-full -rotate-90 ${animate ? "transition-all duration-700" : ""}`}>
        <circle cx="50" cy="50" r={r} stroke="rgba(255,255,255,0.12)" strokeWidth="6" fill="none" />
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke={accent}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ filter: `drop-shadow(0 0 6px ${accent}cc)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xl font-black text-white tabular-nums leading-none">{SAMPLE.fastedHours}h</p>
        <p className="text-[9px] text-white/60 uppercase tracking-wider font-bold mt-1">/ {SAMPLE.targetHours}h</p>
      </div>
    </div>
  );
}

function StatTilesRing({ accent, animate }: { accent: string; animate: boolean }) {
  return (
    <div className="flex items-stretch gap-2">
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 flex items-center justify-center shrink-0">
        <ProgressRing accent={accent} animate={animate} />
      </div>
      <div className="grid grid-rows-2 gap-2 flex-1">
        <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/15 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-white/60 uppercase tracking-wider font-medium">Macros</p>
            <p className="text-sm font-black text-white tabular-nums">{SAMPLE.keto.fat_pct}/{SAMPLE.keto.protein_pct}/{SAMPLE.keto.carbs_pct}</p>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accent}25`, color: accent }}>{SAMPLE.keto.abbreviation}</span>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/15 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-white/60 uppercase tracking-wider font-medium">Level</p>
            <p className="text-sm font-black text-white">{SAMPLE.level}</p>
          </div>
          <BarChart3 className="h-4 w-4 text-white/60" />
        </div>
      </div>
    </div>
  );
}

function StatTilesFour({ accent }: { accent: string }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 text-center border border-white/15">
        <Clock className="h-4 w-4 mx-auto text-white/60 mb-1" />
        <p className="text-sm font-black text-white leading-tight tabular-nums">{SAMPLE.fastedHours}h</p>
        <p className="text-[9px] text-white/60 uppercase tracking-wider font-medium mt-0.5">Fasted</p>
      </div>
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 text-center border border-white/15">
        <p className="text-[10px] font-black leading-tight" style={{ color: accent, textShadow: `0 0 10px ${accent}80` }}>{SAMPLE.keto.abbreviation}</p>
        <p className="text-xs font-black text-white leading-tight mt-0.5 tabular-nums">{SAMPLE.keto.fat_pct}/{SAMPLE.keto.protein_pct}/{SAMPLE.keto.carbs_pct}</p>
        <p className="text-[9px] text-white/60 uppercase tracking-wider font-medium mt-0.5">F/P/C</p>
      </div>
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 text-center border border-white/15">
        <Calendar className="h-4 w-4 mx-auto text-white/60 mb-1" />
        <p className="text-sm font-black text-white leading-tight tabular-nums">{SAMPLE.dayNumber}/{SAMPLE.totalDays}</p>
        <p className="text-[9px] text-white/60 uppercase tracking-wider font-medium mt-0.5">Day</p>
      </div>
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 text-center border border-white/15">
        <BarChart3 className="h-4 w-4 mx-auto text-white/60 mb-1" />
        <p className="text-sm font-black text-white leading-tight">{SAMPLE.level}</p>
        <p className="text-[9px] text-white/60 uppercase tracking-wider font-medium mt-0.5">Level</p>
      </div>
    </div>
  );
}

function StatTiles({ tiles, accent, animate }: { tiles: Tiles; accent: string; animate: boolean }) {
  if (tiles === "ring") return <StatTilesRing accent={accent} animate={animate} />;
  if (tiles === "four") return <StatTilesFour accent={accent} />;
  return <StatTilesThree accent={accent} />;
}

function CardHeader({ accent }: { accent: string }) {
  return (
    <div className="flex items-start justify-between">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.2em]">Fasting Protocol</p>
          <Badge className="text-[10px] px-2 py-0.5 font-semibold border" style={{ backgroundColor: `${accent}1f`, color: accent, borderColor: `${accent}60` }}>
            Coach Assigned
          </Badge>
        </div>
        <h3 className="text-2xl font-black text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">{SAMPLE.planName}</h3>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md border"
          style={{ backgroundColor: `${accent}1a`, color: accent, borderColor: `${accent}40` }}>
          {SAMPLE.keto.abbreviation}
          <span className="text-white/50">·</span>
          <span className="text-white/80 font-medium">{SAMPLE.keto.name}</span>
        </div>
      </div>
      <Badge variant="outline" className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 border-white/30 text-white bg-white/10">
        Day {SAMPLE.dayNumber}/{SAMPLE.totalDays}
      </Badge>
    </div>
  );
}

/* ──────────────── BACKGROUNDS ──────────────── */

function PhotoBg({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${fastingCardBgImg})` }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/40" />
      {children}
    </div>
  );
}
function KetoGradientBg({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute inset-0" style={{ background: `radial-gradient(120% 80% at 100% 0%, ${accent}55, transparent 60%), linear-gradient(135deg, #0b0b10 0%, #14141d 60%, ${accent}22 100%)` }} />
      {children}
    </div>
  );
}
function HybridBg({ accent, animate, children }: { accent: string; animate: boolean; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${fastingCardBgImg})` }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/60 to-black/40" />
      <div className={`absolute -inset-10 ${animate ? "animate-[pulse_5s_ease-in-out_infinite]" : ""}`}
        style={{ background: `radial-gradient(60% 50% at 80% 20%, ${accent}55, transparent 70%)`, mixBlendMode: "screen" }} />
      {children}
    </div>
  );
}

/* ──────────────── STYLES ──────────────── */

function StyleA_GlassGold({ tiles, bg, animate }: { tiles: Tiles; bg: BgKey; animate: boolean }) {
  // Glassmorphic + gold edges, accent overridden to gold
  const accent = "#fbbf24";
  return (
    <BgWrap bg={bg} accent={SAMPLE.keto.color} animate={animate}>
      <Card className="overflow-hidden border-0 shadow-[0_10px_40px_-10px_rgba(251,191,36,0.35)] relative ring-1 ring-amber-300/30">
        <BgWrap.Inner bg={bg} accent={SAMPLE.keto.color} animate={animate}>
          <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
          <CardContent className="relative z-10 px-5 pt-7 pb-6 space-y-4 text-white">
            <CardHeader accent={accent} />
            <StatTiles tiles={tiles} accent={accent} animate={animate} />
            <Button className="w-full h-11 text-sm font-bold gap-2 bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-600 text-black hover:brightness-110 shadow-[0_4px_20px_-4px_rgba(251,191,36,0.6)]">
              <Clock className="h-4 w-4" /> View Your Assigned Program
            </Button>
          </CardContent>
        </BgWrap.Inner>
      </Card>
    </BgWrap>
  );
}

function StyleB_NeonKeto({ tiles, bg, animate }: { tiles: Tiles; bg: BgKey; animate: boolean }) {
  const accent = SAMPLE.keto.color;
  return (
    <BgWrap bg={bg} accent={accent} animate={animate}>
      <Card className="overflow-hidden border-0 relative" style={{ boxShadow: `0 10px 40px -10px ${accent}55, 0 0 0 1px ${accent}40 inset` }}>
        <BgWrap.Inner bg={bg} accent={accent} animate={animate}>
          <div className={`absolute -top-20 -right-16 w-64 h-64 rounded-full ${animate ? "animate-pulse" : ""}`} style={{ background: `radial-gradient(circle, ${accent}40, transparent 70%)` }} />
          <CardContent className="relative z-10 px-5 pt-7 pb-6 space-y-4 text-white">
            <CardHeader accent={accent} />
            <StatTiles tiles={tiles} accent={accent} animate={animate} />
            <Button className="w-full h-11 text-sm font-bold gap-2 text-white border" style={{ background: `linear-gradient(135deg, ${accent}cc, ${accent}88)`, borderColor: `${accent}80`, boxShadow: `0 4px 20px -4px ${accent}80` }}>
              <Flame className="h-4 w-4" /> View Your Assigned Program
            </Button>
          </CardContent>
        </BgWrap.Inner>
      </Card>
    </BgWrap>
  );
}

function StyleC_Aurora({ tiles, bg, animate }: { tiles: Tiles; bg: BgKey; animate: boolean }) {
  const accent = SAMPLE.keto.color;
  return (
    <BgWrap bg={bg} accent={accent} animate={animate}>
      <Card className="overflow-hidden border-0 shadow-2xl relative">
        <BgWrap.Inner bg={bg} accent={accent} animate={animate}>
          {/* Aurora layers always on top of bg */}
          <div className={`absolute -inset-20 opacity-70 ${animate ? "animate-[pulse_8s_ease-in-out_infinite]" : ""}`} style={{ background: `conic-gradient(from 90deg at 50% 50%, ${accent}33, #6366f155, #06b6d433, ${accent}33)`, filter: "blur(40px)" }} />
          <div className="absolute inset-0 bg-black/30" />
          <CardContent className="relative z-10 px-5 pt-7 pb-6 space-y-4 text-white">
            <CardHeader accent={accent} />
            <StatTiles tiles={tiles} accent={accent} animate={animate} />
            <Button className="w-full h-11 text-sm font-bold gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-md">
              <Clock className="h-4 w-4" /> View Your Assigned Program
            </Button>
          </CardContent>
        </BgWrap.Inner>
      </Card>
    </BgWrap>
  );
}

function StyleD_Minimal({ tiles, bg, animate }: { tiles: Tiles; bg: BgKey; animate: boolean }) {
  const accent = SAMPLE.keto.color;
  return (
    <BgWrap bg={bg} accent={accent} animate={animate}>
      <Card className="overflow-hidden border border-white/10 shadow-xl relative">
        <BgWrap.Inner bg={bg} accent={accent} animate={animate}>
          <CardContent className="relative z-10 px-5 pt-7 pb-6 space-y-5 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-medium text-white/50 uppercase tracking-[0.25em]">Fasting Protocol</p>
                <h3 className="text-3xl font-light text-white tracking-tight mt-1">{SAMPLE.planName}</h3>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className="font-bold" style={{ color: accent }}>{SAMPLE.keto.abbreviation}</span>
                  <span className="text-white/30">·</span>
                  <span className="text-white/70">{SAMPLE.keto.name}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Day</p>
                <p className="text-lg font-light text-white tabular-nums">{SAMPLE.dayNumber}<span className="text-white/40">/{SAMPLE.totalDays}</span></p>
              </div>
            </div>
            <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${accent}80, transparent)` }} />
            <StatTiles tiles={tiles} accent={accent} animate={animate} />
            <Button variant="ghost" className="w-full h-11 text-sm font-medium gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10">
              View Your Assigned Program
            </Button>
          </CardContent>
        </BgWrap.Inner>
      </Card>
    </BgWrap>
  );
}

/* ──────────────── BG WRAPPER ──────────────── */

type BgKey = "photo" | "keto" | "hybrid";
function BgWrap({ children }: { bg: BgKey; accent: string; animate: boolean; children: React.ReactNode }) {
  return <div>{children}</div>;
}
BgWrap.Inner = function Inner({ bg, accent, animate, children }: { bg: BgKey; accent: string; animate: boolean; children: React.ReactNode }) {
  if (bg === "photo") return <PhotoBg>{children}</PhotoBg>;
  if (bg === "keto") return <KetoGradientBg accent={accent}>{children}</KetoGradientBg>;
  return <HybridBg accent={accent} animate={animate}>{children}</HybridBg>;
};

/* ──────────────── PAGE ──────────────── */

const STYLES = [
  { key: "A", title: "A · Glassmorphic + Gold", subtitle: "Premium, elegant, matches your gold pill language", Comp: StyleA_GlassGold },
  { key: "B", title: "B · Neon Keto Glow", subtitle: "Accent glows in the keto type's color — dynamic, high-energy", Comp: StyleB_NeonKeto },
  { key: "C", title: "C · Aurora Mesh", subtitle: "Cinematic animated gradient mesh behind clean glass", Comp: StyleC_Aurora },
  { key: "D", title: "D · Quiet Luxury", subtitle: "Minimalist Apple-style — tight type, single accent line", Comp: StyleD_Minimal },
] as const;

const TILE_OPTIONS: { key: Tiles; label: string }[] = [
  { key: "three", label: "3 tiles (Fasted · Macros · Level)" },
  { key: "ring", label: "Progress ring + 2 tiles" },
  { key: "four", label: "4 tiles (+ Day x/y)" },
];

const BG_OPTIONS: { key: BgKey; label: string }[] = [
  { key: "photo", label: "Trainer's photo" },
  { key: "keto", label: "Keto-themed gradient" },
  { key: "hybrid", label: "Photo + animated color wash" },
];

export default function ProtocolStylesPreview() {
  const [tiles, setTiles] = useState<Tiles>("three");
  const [bg, setBg] = useState<BgKey>("photo");
  const [animate, setAnimate] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black text-white">
      <div className="mx-auto max-w-md sm:max-w-2xl px-4 py-6 space-y-5">
        {/* Toolbar */}
        <div className="space-y-3 sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md -mx-4 px-4 py-3 border-b border-white/10">
          <div>
            <h1 className="text-xl font-black tracking-tight">Fasting Protocol — Style Preview</h1>
            <p className="text-xs text-white/60">Compare premium directions. Pick a style + tile layout + background, then tell me which combo to ship.</p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Tile layout</p>
            <div className="flex flex-wrap gap-1.5">
              {TILE_OPTIONS.map((o) => (
                <button key={o.key} onClick={() => setTiles(o.key)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition ${tiles === o.key ? "bg-white text-black border-white" : "border-white/20 text-white/70 hover:border-white/40"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Background</p>
            <div className="flex flex-wrap gap-1.5">
              {BG_OPTIONS.map((o) => (
                <button key={o.key} onClick={() => setBg(o.key)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition ${bg === o.key ? "bg-white text-black border-white" : "border-white/20 text-white/70 hover:border-white/40"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-[11px] text-white/70">
            <input type="checkbox" checked={animate} onChange={(e) => setAnimate(e.target.checked)} className="accent-amber-400" />
            Motion (animated counters / pulsing accents / gradient shift)
          </label>
        </div>

        {/* Cards */}
        <div className="space-y-6 pt-2">
          {STYLES.map(({ key, title, subtitle, Comp }) => (
            <section key={key} className="space-y-2">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-black uppercase tracking-wider text-white/90">{title}</h2>
              </div>
              <p className="text-xs text-white/50 -mt-1">{subtitle}</p>
              <Comp tiles={tiles} bg={bg} animate={animate} />
              <div className="flex items-center gap-2 pt-1">
                <Trophy className="h-3 w-3 text-amber-400/60" />
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Tell me to ship "{title.split("·")[0].trim()}" with the chosen layout + bg</span>
              </div>
            </section>
          ))}
        </div>

        <div className="text-center text-[11px] text-white/40 pt-4 pb-10">
          Mockup page only — your live dashboard is unchanged.
        </div>
      </div>
    </div>
  );
}