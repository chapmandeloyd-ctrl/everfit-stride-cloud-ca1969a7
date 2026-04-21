import { Zap } from "lucide-react";
import { getDifficultyLabel } from "@/lib/fastingCategoryConfig";

interface HeroProps {
  protocol: any;
  isQuickPlan: boolean;
}

function dayLabel(protocol: any, isQuickPlan: boolean) {
  if (!isQuickPlan || protocol.fast_target_hours < 24) return null;
  const hrs = protocol.fast_target_hours;
  const exactDays = hrs / 24;
  const label = Number.isInteger(exactDays)
    ? `${exactDays}`
    : (Math.round(exactDays * 10) / 10).toString();
  const isOne = exactDays === 1;
  return ` — ${label} Day${isOne ? "" : "s"}`;
}

function durationLabel(protocol: any) {
  if (protocol.duration_days === 0) return "∞";
  const wks = Math.ceil(protocol.duration_days / 7);
  return `${wks} wk${wks !== 1 ? "s" : ""}`;
}

/* ─────────────────────────────────────────────
   VARIANT A — Glass Orb Badge
   3D crystal hexagon with KSOM red→deep-blue gradient + soft glow
   ───────────────────────────────────────────── */
export function HeroGlassOrb({ protocol, isQuickPlan }: HeroProps) {
  const dl = dayLabel(protocol, isQuickPlan);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 shadow-2xl">
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.45), transparent 55%), radial-gradient(circle at 80% 80%, hsl(220 80% 25% / 0.6), transparent 60%), linear-gradient(135deg, hsl(220 50% 8%), hsl(0 0% 4%))",
        }}
      />
      {/* Animated shimmer */}
      <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ background: "conic-gradient(from 0deg at 50% 50%, transparent, hsl(var(--primary) / 0.4), transparent 30%)" }} />

      <div className="relative p-6">
        <div className="flex items-center justify-between mb-5">
          {/* 3D glass hexagon badge */}
          <div className="relative">
            <div
              className="h-16 w-16 flex items-center justify-center"
              style={{
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                background:
                  "linear-gradient(145deg, hsl(var(--primary)) 0%, hsl(0 80% 35%) 50%, hsl(220 60% 20%) 100%)",
                boxShadow:
                  "inset 2px 2px 6px hsl(0 0% 100% / 0.3), inset -2px -2px 8px hsl(0 0% 0% / 0.5), 0 8px 24px hsl(var(--primary) / 0.5)",
              }}
            >
              <Zap className="h-7 w-7 text-white drop-shadow-lg" strokeWidth={2.5} />
            </div>
            <div className="absolute inset-0 rounded-full blur-2xl bg-primary/40 -z-10" />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary drop-shadow">
            Your KSOM Plan
          </span>
        </div>

        <h2 className="text-[26px] font-black leading-tight tracking-tight text-white drop-shadow-lg">
          {protocol.name}{dl}
        </h2>

        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/10">
          {[
            { v: `${protocol.fast_target_hours}h`, l: "Fast" },
            { v: durationLabel(protocol), l: "Duration" },
            { v: getDifficultyLabel(protocol.difficulty_level), l: "Level" },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-lg font-black text-white drop-shadow capitalize">{s.v}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/60 mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   VARIANT B — Liquid Gradient + 3D Numerals
   Massive extruded hours with chrome fill + KSOM glow ring
   ───────────────────────────────────────────── */
export function HeroLiquid3D({ protocol, isQuickPlan }: HeroProps) {
  const dl = dayLabel(protocol, isQuickPlan);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/40 shadow-2xl">
      {/* Animated liquid background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, hsl(0 0% 6%), hsl(220 40% 12%) 50%, hsl(0 80% 12%))",
        }}
      />
      <div
        className="absolute -top-10 -left-10 h-48 w-48 rounded-full opacity-50 animate-pulse"
        style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.6), transparent 70%)" }}
      />
      <div
        className="absolute -bottom-10 -right-10 h-56 w-56 rounded-full opacity-40 animate-pulse"
        style={{ background: "radial-gradient(circle, hsl(220 80% 50% / 0.5), transparent 70%)", animationDelay: "1s" }}
      />

      <div className="relative p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_12px_hsl(var(--primary))]" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">
            Your KSOM Plan
          </span>
        </div>

        {/* Massive 3D number with chrome gradient + glow ring */}
        <div className="relative flex items-center justify-center my-4">
          <div
            className="absolute h-32 w-32 rounded-full"
            style={{
              background: "conic-gradient(from 0deg, hsl(var(--primary)), hsl(220 80% 50%), hsl(var(--primary)))",
              filter: "blur(8px)",
              opacity: 0.5,
            }}
          />
          <div
            className="relative text-[88px] font-black leading-none tracking-tighter"
            style={{
              background:
                "linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(0 0% 80%) 40%, hsl(0 0% 50%) 60%, hsl(0 0% 90%) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 4px 12px hsl(var(--primary) / 0.6)) drop-shadow(0 2px 0 hsl(0 0% 0% / 0.5))",
            }}
          >
            {protocol.fast_target_hours}
            <span className="text-[40px] align-top">h</span>
          </div>
        </div>

        <h2 className="text-center text-xl font-black leading-tight tracking-tight text-white">
          {protocol.name}{dl}
        </h2>

        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/10">
          {[
            { v: `${protocol.fast_target_hours}h`, l: "Fast" },
            { v: durationLabel(protocol), l: "Duration" },
            { v: getDifficultyLabel(protocol.difficulty_level), l: "Level" },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-base font-black text-white capitalize">{s.v}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/60 mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   VARIANT C — Premium Card Stack with Depth
   Layered Apple-Fitness-style with parallax shadows + embossed icon
   ───────────────────────────────────────────── */
export function HeroPremiumStack({ protocol, isQuickPlan }: HeroProps) {
  const dl = dayLabel(protocol, isQuickPlan);
  return (
    <div className="relative pt-3 pb-1">
      {/* Stacked depth shadow cards */}
      <div
        className="absolute inset-x-6 top-0 h-3 rounded-2xl bg-primary/20 blur-sm"
        aria-hidden
      />
      <div
        className="absolute inset-x-3 top-1.5 h-4 rounded-2xl bg-primary/10"
        aria-hidden
      />

      <div
        className="relative overflow-hidden rounded-2xl border border-primary/25"
        style={{
          background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--primary) / 0.08) 100%)",
          boxShadow:
            "0 20px 40px -12px hsl(var(--primary) / 0.35), 0 8px 16px -8px hsl(0 0% 0% / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.08)",
        }}
      >
        {/* Mesh gradient overlay */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at top right, hsl(var(--primary) / 0.18), transparent 50%), radial-gradient(ellipse at bottom left, hsl(220 60% 30% / 0.15), transparent 50%)",
          }}
        />

        {/* Animated shimmer line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.6), transparent)",
          }}
        />

        <div className="relative p-6">
          <div className="flex items-center gap-3 mb-4">
            {/* Embossed 3D icon */}
            <div
              className="h-12 w-12 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(145deg, hsl(var(--primary)), hsl(0 70% 35%))",
                boxShadow:
                  "inset 1px 1px 2px hsl(0 0% 100% / 0.4), inset -2px -2px 4px hsl(0 0% 0% / 0.3), 0 6px 16px hsl(var(--primary) / 0.4)",
              }}
            >
              <Zap className="h-6 w-6 text-white drop-shadow" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary block">
                Your KSOM Plan
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">Adaptive Protocol</span>
            </div>
          </div>

          <h2 className="text-[26px] font-black leading-tight tracking-tight">
            {protocol.name}{dl}
          </h2>

          {/* Stat tiles with depth */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            {[
              { v: `${protocol.fast_target_hours}h`, l: "Fast" },
              { v: durationLabel(protocol), l: "Duration" },
              { v: getDifficultyLabel(protocol.difficulty_level), l: "Level" },
            ].map((s, i) => (
              <div
                key={i}
                className="rounded-xl py-3 text-center"
                style={{
                  background: "linear-gradient(145deg, hsl(var(--muted) / 0.6), hsl(var(--muted) / 0.3))",
                  boxShadow:
                    "inset 1px 1px 2px hsl(0 0% 100% / 0.05), inset -1px -1px 2px hsl(0 0% 0% / 0.15), 0 2px 4px hsl(0 0% 0% / 0.1)",
                }}
              >
                <p className="text-base font-black capitalize">{s.v}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}