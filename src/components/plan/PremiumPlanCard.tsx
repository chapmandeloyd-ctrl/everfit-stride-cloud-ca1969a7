import { Lock, ShieldCheck, ChevronRight, type LucideIcon } from "lucide-react";

export interface PremiumPlanCardStat {
  value: string;
  label: string;
  /** Optional accent color class for the value (e.g. "text-emerald-500") */
  accentClass?: string;
}

export interface PremiumPlanCardProps {
  /** Icon shown in the embossed badge */
  icon: LucideIcon;
  /** Tailwind text-color class for the icon + eyebrow + accents (e.g. "text-emerald-500") */
  accentColorClass: string;
  /**
   * Tailwind gradient stops used for: (a) the embossed icon badge fill,
   * (b) the soft tinted gradient overlay on the card surface.
   * Format: "from-emerald-500 via-teal-500 to-cyan-600"
   */
  iconGradient: string;
  /**
   * Soft tint gradient layered over the card surface for color life.
   * Format: "from-emerald-500/15 via-transparent to-cyan-500/10"
   */
  surfaceTintGradient: string;
  /** Eyebrow label (e.g. "Your KSOM Plan", "LOSE WEIGHT", "Level 5") */
  eyebrow: string;
  /** Subtitle under the eyebrow (e.g. "Adaptive Protocol") */
  subEyebrow?: string;
  /** Main title (plan name) */
  title: string;
  /** Optional suffix appended to the title (e.g. " — 3 Days") */
  titleSuffix?: string;
  /** Up to 3 stat tiles shown at the bottom */
  stats: PremiumPlanCardStat[];
  /** Status pill on the right */
  status?: "current" | "locked" | null;
  /** Click handler for the whole card */
  onClick?: () => void;
  /** Show chevron on the right of the stat row (for navigable list cards) */
  showChevron?: boolean;
  /** Visually dim the card (e.g. when locked) */
  dimmed?: boolean;
}

/**
 * Premium 3D layered card used for fasting protocols and quick plans.
 * Card stack with depth + embossed icon + colored accent + tinted gradient surface.
 */
export function PremiumPlanCard({
  icon: Icon,
  accentColorClass,
  iconGradient,
  surfaceTintGradient,
  eyebrow,
  subEyebrow,
  title,
  titleSuffix,
  stats,
  status,
  onClick,
  showChevron,
  dimmed,
}: PremiumPlanCardProps) {
  const isInteractive = !!onClick;
  return (
    <div
      className={`relative pt-6 pb-4 ${dimmed ? "opacity-60 grayscale-[20%]" : ""} ${isInteractive ? "cursor-pointer group" : ""}`}
      onClick={onClick}
    >
      {/* Deep stacked depth — back card */}
      <div
        className="absolute inset-x-10 top-0 h-8 rounded-2xl"
        style={{
          background: "linear-gradient(180deg, hsl(var(--muted) / 0.6), hsl(var(--muted) / 0.2))",
          filter: "blur(2px)",
          transform: "scaleY(0.6)",
        }}
        aria-hidden
      />
      {/* Mid card */}
      <div
        className="absolute inset-x-6 top-2 h-10 rounded-2xl border border-border"
        style={{
          background: "linear-gradient(180deg, hsl(var(--card)), hsl(var(--card) / 0.6))",
          boxShadow: "0 8px 20px -8px hsl(0 0% 0% / 0.4)",
        }}
        aria-hidden
      />
      {/* Front card edge highlight */}
      <div
        className="absolute inset-x-3 top-4 h-12 rounded-2xl border border-border"
        style={{
          background: "linear-gradient(180deg, hsl(var(--card)), hsl(var(--card)))",
          boxShadow: "0 12px 24px -10px hsl(0 0% 0% / 0.5)",
        }}
        aria-hidden
      />

      <div
        className={`relative overflow-hidden rounded-2xl border border-border transition-transform duration-300 ${isInteractive ? "group-hover:-translate-y-0.5 group-active:scale-[0.99]" : ""}`}
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--muted) / 0.6) 100%)",
          boxShadow:
            "0 24px 48px -16px hsl(0 0% 0% / 0.55), 0 12px 24px -10px hsl(0 0% 0% / 0.4), 0 4px 8px -2px hsl(0 0% 0% / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.1), inset 0 -1px 0 hsl(0 0% 0% / 0.3)",
        }}
      >
        {/* Mesh gradient overlay — neutral depth */}
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse at top right, hsl(0 0% 100% / 0.06), transparent 55%), radial-gradient(ellipse at bottom left, hsl(0 0% 0% / 0.25), transparent 55%)",
          }}
        />

        {/* Color tint gradient — gives the card "life" */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${surfaceTintGradient} pointer-events-none`}
          aria-hidden
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

        {/* Top edge highlight */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.2), transparent)",
          }}
        />

        <div className="relative p-6">
          <div className="flex items-center gap-3 mb-4">
            {/* Embossed 3D icon — colored by tier/category gradient */}
            <div
              className={`relative h-14 w-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${iconGradient}`}
              style={{
                boxShadow:
                  "inset 2px 2px 3px hsl(0 0% 100% / 0.5), inset -3px -3px 6px hsl(0 0% 0% / 0.5), 0 6px 14px hsl(0 0% 0% / 0.45), 0 2px 4px hsl(0 0% 0% / 0.3)",
              }}
            >
              <Icon className="h-7 w-7 text-white drop-shadow-lg" strokeWidth={2.5} />
            </div>

            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-extrabold uppercase tracking-[0.18em] block drop-shadow ${accentColorClass}`}>
                {eyebrow}
              </span>
              {subEyebrow && (
                <span className="text-[10px] font-medium text-muted-foreground">{subEyebrow}</span>
              )}
            </div>

            {status === "current" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow">
                <ShieldCheck className="h-3 w-3" /> Current
              </span>
            )}
            {status === "locked" && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Locked</span>
              </span>
            )}
          </div>

          <h2 className="text-[26px] font-black leading-tight tracking-tight">
            {title}{titleSuffix ?? ""}
          </h2>

          {/* Stat tiles with depth */}
          <div className="flex items-stretch gap-2.5 mt-5">
            {stats.slice(0, 3).map((s, i) => (
              <div
                key={i}
                className="relative flex-1 rounded-xl py-3.5 text-center overflow-hidden"
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
                <p className={`text-base font-black capitalize drop-shadow-sm ${s.accentClass ?? ""}`}>{s.value}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}

            {showChevron && (
              <div className="flex items-center justify-center pl-1">
                <ChevronRight className={`h-5 w-5 transition-transform group-hover:translate-x-1 ${accentColorClass}`} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}