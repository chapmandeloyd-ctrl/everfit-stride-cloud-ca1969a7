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
    <div className="relative pt-6 pb-4">
      {/* Deep stacked depth — back card */}
      <div
        className="absolute inset-x-10 top-0 h-8 rounded-2xl"
        style={{
          background: "linear-gradient(180deg, hsl(var(--primary) / 0.35), hsl(var(--primary) / 0.1))",
          filter: "blur(2px)",
          transform: "scaleY(0.6)",
        }}
        aria-hidden
      />
      {/* Mid card */}
      <div
        className="absolute inset-x-6 top-2 h-10 rounded-2xl border border-primary/20"
        style={{
          background: "linear-gradient(180deg, hsl(var(--card)), hsl(var(--card) / 0.6))",
          boxShadow: "0 8px 20px -8px hsl(var(--primary) / 0.3)",
        }}
        aria-hidden
      />
      {/* Front card edge highlight */}
      <div
        className="absolute inset-x-3 top-4 h-12 rounded-2xl border border-primary/15"
        style={{
          background: "linear-gradient(180deg, hsl(var(--card)), hsl(var(--card)))",
          boxShadow: "0 12px 24px -10px hsl(var(--primary) / 0.4)",
        }}
        aria-hidden
      />

      <div
        className="relative overflow-hidden rounded-2xl border border-primary/30"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 50%, hsl(var(--primary) / 0.12) 100%)",
          boxShadow:
            "0 30px 60px -15px hsl(var(--primary) / 0.5), 0 18px 36px -12px hsl(0 0% 0% / 0.5), 0 6px 12px -4px hsl(0 0% 0% / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.12), inset 0 -1px 0 hsl(0 0% 0% / 0.3)",
        }}
      >
        {/* Mesh gradient overlay */}
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse at top right, hsl(var(--primary) / 0.28), transparent 55%), radial-gradient(ellipse at bottom left, hsl(220 70% 25% / 0.25), transparent 55%), radial-gradient(circle at 50% 120%, hsl(var(--primary) / 0.2), transparent 50%)",
          }}
        />

        {/* Subtle grid texture for substance */}
        <div
          className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Glow orb top-right */}
        <div
          className="absolute -top-16 -right-16 h-40 w-40 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary) / 0.35), transparent 70%)",
            filter: "blur(8px)",
          }}
          aria-hidden
        />

        {/* Animated shimmer line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: "linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)",
            boxShadow: "0 0 12px hsl(var(--primary) / 0.8)",
          }}
        />

        <div className="relative p-6">
          <div className="flex items-center gap-3 mb-4">
            {/* Embossed 3D icon — beefier */}
            <div className="relative">
              <div
                className="absolute inset-0 rounded-2xl blur-xl opacity-70"
                style={{ background: "hsl(var(--primary) / 0.6)" }}
                aria-hidden
              />
              <div
                className="relative h-14 w-14 rounded-2xl flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(145deg, hsl(var(--primary)) 0%, hsl(0 75% 40%) 50%, hsl(0 60% 25%) 100%)",
                  boxShadow:
                    "inset 2px 2px 3px hsl(0 0% 100% / 0.5), inset -3px -3px 6px hsl(0 0% 0% / 0.5), 0 10px 24px hsl(var(--primary) / 0.6), 0 4px 8px hsl(0 0% 0% / 0.4)",
                }}
              >
                <Zap className="h-7 w-7 text-white drop-shadow-lg" strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary block drop-shadow">
                Your KSOM Plan
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">Adaptive Protocol</span>
            </div>
          </div>

          <h2 className="text-[26px] font-black leading-tight tracking-tight">
            {protocol.name}{dl}
          </h2>

          {/* Stat tiles with depth — deeper emboss */}
          <div className="grid grid-cols-3 gap-2.5 mt-5">
            {[
              { v: `${protocol.fast_target_hours}h`, l: "Fast" },
              { v: durationLabel(protocol), l: "Duration" },
              { v: getDifficultyLabel(protocol.difficulty_level), l: "Level" },
            ].map((s, i) => (
              <div
                key={i}
                className="relative rounded-xl py-3.5 text-center overflow-hidden"
                style={{
                  background:
                    "linear-gradient(145deg, hsl(var(--muted) / 0.9), hsl(var(--muted) / 0.4))",
                  boxShadow:
                    "inset 2px 2px 3px hsl(0 0% 100% / 0.08), inset -2px -2px 4px hsl(0 0% 0% / 0.35), 0 4px 8px hsl(0 0% 0% / 0.2), 0 1px 0 hsl(0 0% 100% / 0.06)",
                }}
              >
                <div
                  className="absolute top-0 left-2 right-2 h-px"
                  style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.15), transparent)" }}
                  aria-hidden
                />
                <p className="text-base font-black capitalize drop-shadow-sm">{s.v}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}