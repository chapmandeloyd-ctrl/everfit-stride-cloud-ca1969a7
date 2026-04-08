import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, Zap, Lock, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Mock data for preview
const mockLevel = 3;
const mockNextLevel = 4;
const mockMaxLevel = 15;
const mockProgress = 62;

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <h2 className={`text-lg font-black tracking-tight uppercase ${color} mb-3`}>
      {title}
    </h2>
  );
}

/* ───────────────────────────────────────────────────
   STYLE 1 — Glassmorphism + Glow
   ─────────────────────────────────────────────────── */
function GlassStyle() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Style 1 — Glassmorphism + Glow" color="text-cyan-400" />

      {/* Current Level */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-2xl blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
        <div className="relative rounded-2xl border border-amber-400/20 bg-card/60 backdrop-blur-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 backdrop-blur flex items-center justify-center ring-1 ring-amber-400/30">
              <Zap className="h-4.5 w-4.5 text-amber-400" />
            </div>
            <span className="text-xs font-bold tracking-widest uppercase text-amber-400">Current Level</span>
          </div>
          <h2 className="text-5xl font-black tracking-tight text-foreground leading-none drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            Lv.{mockLevel}
          </h2>
          <p className="text-sm font-bold uppercase tracking-wide text-foreground/90">Level {mockLevel} — Rhythm</p>
          <p className="text-xs text-muted-foreground">Building consistent fasting rhythm.</p>
        </div>
      </div>

      {/* Next Level */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-green-400 rounded-2xl blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
        <div className="relative rounded-2xl border border-emerald-400/20 bg-card/60 backdrop-blur-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/20 backdrop-blur flex items-center justify-center ring-1 ring-emerald-400/30">
                <Zap className="h-4.5 w-4.5 text-emerald-400" />
              </div>
              <span className="text-xs font-bold tracking-widest uppercase text-emerald-400">Next Level</span>
            </div>
            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-400/30 backdrop-blur">LV. {mockNextLevel}</Badge>
          </div>
          <h2 className="text-5xl font-black tracking-tight text-foreground leading-none drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">16h</h2>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-bold uppercase tracking-wide text-foreground/80">Progress</span>
              <span className="font-bold text-emerald-400">{mockProgress}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted/30 backdrop-blur overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${mockProgress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Destination */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-2xl blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
        <div className="relative rounded-2xl border border-purple-400/20 bg-card/60 backdrop-blur-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-purple-500/20 backdrop-blur flex items-center justify-center ring-1 ring-purple-400/30">
                <Star className="h-4.5 w-4.5 text-purple-400" />
              </div>
              <span className="text-xs font-bold tracking-widest uppercase text-purple-400">Destination</span>
            </div>
            <Badge className="text-[10px] bg-purple-500/15 text-purple-400 border-purple-400/30 backdrop-blur">LV. {mockMaxLevel}</Badge>
          </div>
          <h2 className="text-5xl font-black tracking-tight text-purple-400 leading-none drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]">120h</h2>
          <p className="text-sm font-bold uppercase tracking-wide text-foreground/90">KSOM Elite</p>
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-purple-400/60" />
            <span className="text-[10px] text-purple-400/60 font-semibold uppercase tracking-wide">Locked</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────
   STYLE 2 — 3D Elevated + Gradient
   ─────────────────────────────────────────────────── */
function ElevatedStyle() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Style 2 — 3D Elevated + Gradient" color="text-orange-400" />

      {/* Current Level */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 p-5 space-y-3 shadow-[0_8px_30px_-5px_rgba(245,158,11,0.5)] transform hover:translate-y-[-2px] hover:shadow-[0_12px_40px_-5px_rgba(245,158,11,0.6)] transition-all duration-300">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Zap className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-xs font-bold tracking-widest uppercase text-white/80">Current Level</span>
        </div>
        <h2 className="text-5xl font-black tracking-tight text-white leading-none">Lv.{mockLevel}</h2>
        <p className="text-sm font-bold uppercase tracking-wide text-white/90">Level {mockLevel} — Rhythm</p>
        <p className="text-xs text-white/70">Building consistent fasting rhythm.</p>
      </div>

      {/* Next Level */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-5 space-y-3 shadow-[0_8px_30px_-5px_rgba(16,185,129,0.5)] transform hover:translate-y-[-2px] hover:shadow-[0_12px_40px_-5px_rgba(16,185,129,0.6)] transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-xs font-bold tracking-widest uppercase text-white/80">Next Level</span>
          </div>
          <Badge className="text-[10px] bg-white/20 text-white border-white/30">LV. {mockNextLevel}</Badge>
        </div>
        <h2 className="text-5xl font-black tracking-tight text-white leading-none">16h</h2>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-bold uppercase tracking-wide text-white/80">Progress</span>
            <span className="font-bold text-white">{mockProgress}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" style={{ width: `${mockProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Destination */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-600 p-5 space-y-3 shadow-[0_8px_30px_-5px_rgba(168,85,247,0.5)] transform hover:translate-y-[-2px] hover:shadow-[0_12px_40px_-5px_rgba(168,85,247,0.6)] transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Star className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-xs font-bold tracking-widest uppercase text-white/80">Destination</span>
          </div>
          <Badge className="text-[10px] bg-white/20 text-white border-white/30">LV. {mockMaxLevel}</Badge>
        </div>
        <h2 className="text-5xl font-black tracking-tight text-white leading-none">120h</h2>
        <p className="text-sm font-bold uppercase tracking-wide text-white/90">KSOM Elite</p>
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-white/50" />
          <span className="text-[10px] text-white/50 font-semibold uppercase tracking-wide">Locked</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────
   STYLE 3 — Metallic / Premium
   ─────────────────────────────────────────────────── */
function MetallicStyle() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Style 3 — Metallic / Premium" color="text-yellow-300" />

      {/* Current Level */}
      <div className="rounded-2xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-5 space-y-3 border border-amber-500/30 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-[0_2px_8px_rgba(245,158,11,0.4)]">
            <Zap className="h-4.5 w-4.5 text-black" />
          </div>
          <span className="text-xs font-bold tracking-widest uppercase bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent">Current Level</span>
        </div>
        <h2 className="text-5xl font-black tracking-tight leading-none bg-gradient-to-b from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent">
          Lv.{mockLevel}
        </h2>
        <p className="text-sm font-bold uppercase tracking-wide text-zinc-300">Level {mockLevel} — Rhythm</p>
        <p className="text-xs text-zinc-500">Building consistent fasting rhythm.</p>
      </div>

      {/* Next Level */}
      <div className="rounded-2xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-5 space-y-3 border border-emerald-500/30 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-[0_2px_8px_rgba(16,185,129,0.4)]">
              <Zap className="h-4.5 w-4.5 text-black" />
            </div>
            <span className="text-xs font-bold tracking-widest uppercase bg-gradient-to-r from-emerald-300 to-green-500 bg-clip-text text-transparent">Next Level</span>
          </div>
          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">LV. {mockNextLevel}</Badge>
        </div>
        <h2 className="text-5xl font-black tracking-tight leading-none bg-gradient-to-b from-emerald-200 via-green-400 to-emerald-600 bg-clip-text text-transparent">16h</h2>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-bold uppercase tracking-wide text-zinc-400">Progress</span>
            <span className="font-bold text-emerald-400">{mockProgress}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700/50">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400" style={{ width: `${mockProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Destination */}
      <div className="rounded-2xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-5 space-y-3 border border-purple-500/30 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-400 to-fuchsia-600 flex items-center justify-center shadow-[0_2px_8px_rgba(168,85,247,0.4)]">
              <Star className="h-4.5 w-4.5 text-black" />
            </div>
            <span className="text-xs font-bold tracking-widest uppercase bg-gradient-to-r from-purple-300 to-fuchsia-500 bg-clip-text text-transparent">Destination</span>
          </div>
          <Badge className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/30">LV. {mockMaxLevel}</Badge>
        </div>
        <h2 className="text-5xl font-black tracking-tight leading-none bg-gradient-to-b from-purple-200 via-violet-400 to-purple-600 bg-clip-text text-transparent">120h</h2>
        <p className="text-sm font-bold uppercase tracking-wide text-zinc-300">KSOM Elite</p>
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-purple-400/40" />
          <span className="text-[10px] text-purple-400/40 font-semibold uppercase tracking-wide">Locked</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────
   STYLE 4 — Bold Flat + Motion
   ─────────────────────────────────────────────────── */
function BoldFlatStyle() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Style 4 — Bold Flat + Motion" color="text-rose-400" />

      {/* Current Level */}
      <div className="rounded-2xl bg-amber-500 p-5 space-y-3 hover:scale-[1.02] transition-transform duration-300">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-black/20 flex items-center justify-center">
            <Zap className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-xs font-bold tracking-widest uppercase text-black/60">Current Level</span>
        </div>
        <h2 className="text-6xl font-black tracking-tighter text-black leading-none animate-pulse">Lv.{mockLevel}</h2>
        <p className="text-sm font-bold uppercase tracking-wide text-black/80">Level {mockLevel} — Rhythm</p>
        <p className="text-xs text-black/50">Building consistent fasting rhythm.</p>
      </div>

      {/* Next Level */}
      <div className="rounded-2xl bg-emerald-500 p-5 space-y-3 hover:scale-[1.02] transition-transform duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-black/20 flex items-center justify-center">
              <Zap className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-xs font-bold tracking-widest uppercase text-black/60">Next Level</span>
          </div>
          <Badge className="text-[10px] bg-black/20 text-white border-black/20">LV. {mockNextLevel}</Badge>
        </div>
        <h2 className="text-6xl font-black tracking-tighter text-black leading-none">16h</h2>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-bold uppercase tracking-wide text-black/60">Progress</span>
            <span className="font-bold text-black">{mockProgress}%</span>
          </div>
          <div className="h-3 rounded-full bg-black/20 overflow-hidden">
            <div className="h-full rounded-full bg-black/40 animate-[pulse_3s_ease-in-out_infinite]" style={{ width: `${mockProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Destination */}
      <div className="rounded-2xl bg-purple-600 p-5 space-y-3 hover:scale-[1.02] transition-transform duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-black/20 flex items-center justify-center">
              <Star className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-xs font-bold tracking-widest uppercase text-white/70">Destination</span>
          </div>
          <Badge className="text-[10px] bg-black/20 text-white border-black/20">LV. {mockMaxLevel}</Badge>
        </div>
        <h2 className="text-6xl font-black tracking-tighter text-white leading-none">120h</h2>
        <p className="text-sm font-bold uppercase tracking-wide text-white/90">KSOM Elite</p>
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-white/40" />
          <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wide">Locked</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────
   MAIN PREVIEW PAGE
   ─────────────────────────────────────────────────── */
export default function CardStylesPreview() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-sm font-bold uppercase tracking-wider">Card Style Preview</h1>
      </div>

      <div className="px-4 py-6 space-y-10">
        <p className="text-xs text-muted-foreground text-center">Compare all 4 styles below — scroll to see each one</p>

        <GlassStyle />
        <div className="h-px bg-border" />
        <ElevatedStyle />
        <div className="h-px bg-border" />
        <MetallicStyle />
        <div className="h-px bg-border" />
        <BoldFlatStyle />
      </div>
    </div>
  );
}
