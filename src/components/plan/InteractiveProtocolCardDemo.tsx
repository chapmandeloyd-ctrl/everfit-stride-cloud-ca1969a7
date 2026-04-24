import { memo, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Lock, ShieldCheck, ChevronRight, ChevronLeft, RotateCcw, AlertTriangle, Brain, CalendarClock, ListChecks, Sparkles, Flame, Zap, BrainCircuit, Quote, Activity, type LucideIcon } from "lucide-react";
import type { ProtocolCardContent } from "@/lib/protocolCardContent";
import { LockedPlanPopover } from "@/components/LockedPlanPopover";

export interface DemoStat {
  value: string;
  label: string;
  accentClass?: string;
}

export interface DemoProtocol {
  id: string;
  icon: LucideIcon;
  accentColorClass: string;
  iconGradient: string;
  surfaceTintGradient: string;
  eyebrow: string;
  subEyebrow?: string;
  title: string;
  titleSuffix?: string;
  stats: DemoStat[];
  status?: "current" | "locked" | null;
  content: ProtocolCardContent;
}

export type ProtocolCardVariant = "flip" | "expand" | "tilt" | "swipe" | "combo";

/** Optional visual filler shown below the stat tiles on the front face. */
export type FrontExtraVariant =
  | "none"
  | "timeline"          // #1 mini phase timeline
  | "feelChips"         // #2 what you'll feel chips
  | "timelineAndChips"  // #1 + #2 combined (recommended)
  | "progressRing"      // #3 live progress ring
  | "coachQuote"        // #4 coach quote
  | "difficulty";       // #5 intensity + readiness meter

/* -------- shared visuals (matches PremiumPlanCard) -------- */

export const CardStackBackdrop = memo(function CardStackBackdrop() {
  return (
    <>
      <div
        className="absolute inset-x-10 top-0 h-8 rounded-2xl"
        style={{
          background: "linear-gradient(180deg, hsl(var(--muted) / 0.6), hsl(var(--muted) / 0.2))",
          filter: "blur(2px)",
          transform: "scaleY(0.6)",
        }}
        aria-hidden
      />
      <div
        className="absolute inset-x-6 top-2 h-10 rounded-2xl border border-border"
        style={{
          background: "linear-gradient(180deg, hsl(var(--card)), hsl(var(--card) / 0.6))",
          boxShadow: "0 8px 20px -8px hsl(0 0% 0% / 0.4)",
        }}
        aria-hidden
      />
      <div
        className="absolute inset-x-3 top-4 h-12 rounded-2xl border border-border"
        style={{
          background: "linear-gradient(180deg, hsl(var(--card)), hsl(var(--card)))",
          boxShadow: "0 12px 24px -10px hsl(0 0% 0% / 0.5)",
        }}
        aria-hidden
      />
    </>
  );
});

export function CardSurfaceOverlays({ surfaceTintGradient }: { surfaceTintGradient: string }) {
  return (
    <>
      <div
        className="absolute inset-0 opacity-70 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top right, hsl(0 0% 100% / 0.06), transparent 55%), radial-gradient(ellipse at bottom left, hsl(0 0% 0% / 0.25), transparent 55%)",
        }}
      />
      <div className={`absolute inset-0 bg-gradient-to-br ${surfaceTintGradient} pointer-events-none`} aria-hidden />
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.2), transparent)" }}
      />
    </>
  );
}

/* -------- count-up hook -------- */

function useCountUp(target: number, durationMs = 900, start = true) {
  // Initialize at the target so the value is correct on first paint and
  // never flashes "0" (which previously made stat tiles read "0%" until the
  // RAF tick landed — visible in screenshots and on slow renders).
  const [value, setValue] = useState(target);
  useEffect(() => {
    if (!start) {
      setValue(target);
      return;
    }
    let raf = 0;
    setValue(0);
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, start]);
  return value;
}

/** Renders a stat value, animating numeric portion from 0 -> target. */
function AnimatedStatValue({ value, accentClass, start }: { value: string; accentClass?: string; start: boolean }) {
  const match = value.match(/^([\d.]+)(.*)$/);
  const numeric = match ? parseFloat(match[1]) : NaN;
  const suffix = match ? match[2] : "";
  const isNumber = !Number.isNaN(numeric);
  const animated = useCountUp(isNumber ? numeric : 0, 900, start);
  const display = isNumber ? `${Math.round(animated)}${suffix}` : value;
  // Auto-shrink long non-numeric labels (e.g. "Auto+MPS") so they don't
  // overflow the narrow stat tile.
  const sizeClass = !isNumber && display.length > 5 ? "text-xs" : "text-base";
  return (
    <p
      className={`${sizeClass} font-black capitalize drop-shadow-sm leading-tight px-1 truncate ${accentClass ?? ""}`}
    >
      {display}
    </p>
  );
}

/* -------- card front (shared) -------- */

/* -------- front extras (space-fillers below stats) -------- */

function FrontExtra({
  variant,
  protocol,
  animate,
}: {
  variant: FrontExtraVariant;
  protocol: DemoProtocol;
  animate: boolean;
}) {
  if (variant === "timeline") return <PhaseTimelineExtra protocol={protocol} />;
  if (variant === "feelChips") return <FeelChipsExtra protocol={protocol} />;
  if (variant === "timelineAndChips")
    return (
      <div className="space-y-4">
        <PhaseTimelineExtra protocol={protocol} />
        <FeelChipsExtra protocol={protocol} />
      </div>
    );
  if (variant === "progressRing") return <ProgressRingExtra protocol={protocol} animate={animate} />;
  if (variant === "coachQuote") return <CoachQuoteExtra protocol={protocol} />;
  if (variant === "difficulty") return <DifficultyExtra protocol={protocol} />;
  return null;
}

/** #1 — Mini phase timeline (pulled from content.phases). */
function PhaseTimelineExtra({ protocol }: { protocol: DemoProtocol }) {
  const phases = protocol.content.phases.slice(0, 4);
  if (phases.length === 0) return null;
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">The Journey</p>
      <div className="relative">
        <div className={`absolute left-2 right-2 top-[7px] h-px bg-gradient-to-r ${protocol.iconGradient} opacity-50`} />
        <div className="relative flex items-start justify-between">
          {phases.map((p, i) => (
            <div key={i} className="flex flex-col items-center" style={{ flex: "1 1 0", minWidth: 0 }}>
              <span
                className={`h-3.5 w-3.5 rounded-full bg-gradient-to-br ${protocol.iconGradient}`}
                style={{ boxShadow: "0 0 0 3px hsl(var(--card)), 0 2px 6px hsl(0 0% 0% / 0.3)" }}
              />
              <span className={`mt-1.5 text-[9px] font-extrabold tracking-wider ${protocol.accentColorClass}`}>
                {p.range.split("–")[0]}
              </span>
              <span className="text-[9px] font-semibold text-center leading-tight mt-0.5 line-clamp-2 px-0.5">
                {p.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** #2 — "What you'll feel" chips. */
function FeelChipsExtra({ protocol }: { protocol: DemoProtocol }) {
  const palette = [
    { Icon: Flame, label: "Fat burn" },
    { Icon: Zap, label: "Energy" },
    { Icon: BrainCircuit, label: "Clarity" },
  ];
  // Use the curated default labels so chips stay tight and centered.
  // (Benefit strings from content can be too long and break the row.)
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2 text-center">What You'll Feel</p>
      <div className="flex items-center justify-center gap-1.5">
        {palette.map(({ Icon, label }, i) => (
          <div
            key={i}
            className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 border border-border/60"
            style={{
              background: "linear-gradient(145deg, hsl(var(--muted) / 0.7), hsl(var(--muted) / 0.3))",
              boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.06), 0 2px 6px hsl(0 0% 0% / 0.15)",
            }}
          >
            <Icon className={`h-3 w-3 shrink-0 ${protocol.accentColorClass}`} />
            <span className="text-[10px] font-bold truncate">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** #3 — Live progress ring (demo: 38%). */
function ProgressRingExtra({ protocol, animate }: { protocol: DemoProtocol; animate: boolean }) {
  const pct = useCountUp(38, 1100, animate);
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0">
        <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke={`url(#ring-grad-${protocol.id})`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
          <defs>
            <linearGradient id={`ring-grad-${protocol.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--primary) / 0.5)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-black leading-none">{Math.round(pct)}%</span>
          <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Done</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">In Progress</p>
        <p className="text-sm font-extrabold leading-tight mt-0.5">18h of 48h logged</p>
        <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
          Next milestone:{" "}
          <span className={`font-bold ${protocol.accentColorClass}`}>Ketone ramp-up at 24h</span>
        </p>
      </div>
    </div>
  );
}

/** #4 — Coach quote pulled from coachWarning or mentalReality. */
function CoachQuoteExtra({ protocol }: { protocol: DemoProtocol }) {
  const primary =
    protocol.content.mentalReality?.[0] ??
    protocol.content.coachWarning?.[0] ??
    "Discipline turns into momentum.";
  const secondary =
    protocol.content.mentalReality?.[1] ??
    protocol.content.coachWarning?.[1] ??
    protocol.content.benefits?.[0] ??
    "Stay consistent — the middle is where it changes you.";
  return (
    <div className="space-y-3">
      <div
        className="rounded-xl border border-border/60 p-3"
        style={{ background: "linear-gradient(145deg, hsl(var(--muted) / 0.55), hsl(var(--muted) / 0.2))" }}
      >
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Coach Follow-Up</p>
        <p className="text-xs leading-relaxed">{secondary}</p>
      </div>
      <PhaseTimelineExtra protocol={protocol} />
    </div>
  );
}

/** #5 — Difficulty meter + readiness badge. */
function DifficultyExtra({ protocol }: { protocol: DemoProtocol }) {
  // Map difficulty by Level stat / eyebrow.
  const levelLabel = protocol.stats.find((s) => s.label.toLowerCase() === "level")?.value ?? "Intermediate";
  const levelMap: Record<string, number> = {
    Beginner: 1,
    Intermediate: 2,
    Advanced: 4,
    Expert: 5,
  };
  const dots = levelMap[levelLabel] ?? 3;
  const meters = [
    { label: "Hunger", value: Math.min(5, dots + 1) },
    { label: "Mental load", value: dots },
    { label: "Recovery cost", value: Math.max(1, dots - 1) },
  ];
  return (
    <div className="space-y-3">
      <div
        className="rounded-xl border border-border/60 p-3"
        style={{ background: "linear-gradient(145deg, hsl(var(--muted) / 0.7), hsl(var(--muted) / 0.25))" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Intensity</p>
            <p className="text-base font-black mt-0.5">{levelLabel}</p>
          </div>
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border border-border/60"
            style={{ background: "linear-gradient(145deg, hsl(var(--muted) / 0.7), hsl(var(--muted) / 0.3))" }}
          >
            <Activity className={`h-3 w-3 ${protocol.accentColorClass}`} />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Recommended ✓</span>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {meters.map((m) => (
            <div key={m.label} className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-24">{m.label}</span>
              <div className="flex-1 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      i <= m.value ? `bg-gradient-to-r ${protocol.iconGradient}` : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <FeelChipsExtra protocol={protocol} />
    </div>
  );
}

function FullHeightPreviewExtra({ protocol, animate }: { protocol: DemoProtocol; animate: boolean }) {
  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="rounded-2xl border border-border/60 p-4" style={{
        background: "linear-gradient(145deg, hsl(var(--muted) / 0.72), hsl(var(--muted) / 0.28))",
        boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.06), 0 8px 20px hsl(0 0% 0% / 0.12)"
      }}>
        <div className="space-y-4">
          <PhaseTimelineExtra protocol={protocol} />
          <FeelChipsExtra protocol={protocol} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/60 p-3" style={{
          background: "linear-gradient(145deg, hsl(var(--muted) / 0.66), hsl(var(--muted) / 0.24))"
        }}>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Coach note</p>
          <p className="mt-2 text-xs font-medium leading-relaxed line-clamp-3">
            {protocol.content.coachWarning?.[0] ?? protocol.content.mentalReality?.[0] ?? "Stay steady through the hard middle phase."}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 p-3" style={{
          background: "linear-gradient(145deg, hsl(var(--muted) / 0.66), hsl(var(--muted) / 0.24))"
        }}>
          <ProgressRingExtra protocol={protocol} animate={animate} />
        </div>
      </div>
    </div>
  );
}

export const CardFront = memo(function CardFront({
  protocol,
  showChevron = true,
  pulse = true,
  shimmer = true,
  animateStats = true,
  frontExtra = "none",
  dimmed = false,
}: {
  protocol: DemoProtocol;
  showChevron?: boolean;
  pulse?: boolean;
  shimmer?: boolean;
  animateStats?: boolean;
  frontExtra?: FrontExtraVariant;
  dimmed?: boolean;
}) {
  const Icon = protocol.icon;
  return (
    <>
      <CardSurfaceOverlays surfaceTintGradient={protocol.surfaceTintGradient} />

      {/* shimmer sweep on hover */}
      {shimmer && (
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          aria-hidden
        >
          <div
            className="absolute -inset-y-2 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:animate-[shimmer-sweep_1.2s_ease-out]"
            style={{ filter: "blur(6px)" }}
          />
        </div>
      )}

      <div className="relative flex h-full flex-col p-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`relative h-14 w-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${protocol.iconGradient}`}
            style={{
              boxShadow:
                "inset 2px 2px 3px hsl(0 0% 100% / 0.5), inset -3px -3px 6px hsl(0 0% 0% / 0.5), 0 6px 14px hsl(0 0% 0% / 0.45), 0 2px 4px hsl(0 0% 0% / 0.3)",
            }}
          >
            {pulse && (
              <span
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${protocol.iconGradient} opacity-60 animate-[icon-pulse_2.4s_ease-in-out_infinite]`}
                aria-hidden
              />
            )}
            <Icon className="relative h-7 w-7 text-white drop-shadow-lg" strokeWidth={2.5} />
          </div>

          <div className="min-w-0 flex-1">
            <span className={`text-[10px] font-extrabold uppercase tracking-[0.18em] block drop-shadow ${protocol.accentColorClass}`}>
              {protocol.eyebrow}
            </span>
            {protocol.subEyebrow && <span className="text-[10px] font-medium text-muted-foreground">{protocol.subEyebrow}</span>}
          </div>

          {protocol.status === "current" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow">
              <ShieldCheck className="h-3 w-3" /> Current
            </span>
          )}
          {(protocol.status === "locked" || dimmed) && (
            <LockedPlanPopover
              message="This plan is locked. Message your trainer to request access."
              planName={protocol.title}
            >
              <button
                type="button"
                data-no-flip
                className="inline-flex items-center gap-1.5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                aria-label="Locked — tap for unlock options"
              >
                <Lock className="h-4 w-4" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Locked</span>
              </button>
            </LockedPlanPopover>
          )}
        </div>

        <h2 className="text-[26px] font-black leading-tight tracking-tight">
          {protocol.title}
          {protocol.titleSuffix ?? ""}
        </h2>

        <div className="flex items-stretch gap-2.5 mt-5">
          {protocol.stats.slice(0, 3).map((s, i) => (
            <div
              key={i}
              className="relative flex-1 rounded-xl py-3.5 text-center overflow-hidden"
              style={{
                background: "linear-gradient(145deg, hsl(var(--muted) / 0.9), hsl(var(--muted) / 0.4))",
                boxShadow:
                  "inset 2px 2px 3px hsl(0 0% 100% / 0.08), inset -2px -2px 4px hsl(0 0% 0% / 0.35), 0 4px 8px hsl(0 0% 0% / 0.2), 0 1px 0 hsl(0 0% 100% / 0.06)",
              }}
            >
              <div
                className="absolute top-0 left-2 right-2 h-px"
                style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.15), transparent)" }}
                aria-hidden
              />
              <AnimatedStatValue value={s.value} accentClass={s.accentClass} start={animateStats} />
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}

          {showChevron && (
            <div className="flex items-center justify-center pl-1">
              <ChevronRight className={`h-5 w-5 transition-transform group-hover:translate-x-1 ${protocol.accentColorClass}`} />
            </div>
          )}
        </div>

        <div className="mt-5 flex-1">
          {frontExtra === "none" ? (
            <FullHeightPreviewExtra protocol={protocol} animate={animateStats} />
          ) : (
            <div className="flex h-full flex-col justify-between gap-4">
              <FrontExtra variant={frontExtra} protocol={protocol} animate={animateStats} />
              <div className="space-y-3">
                <div className="rounded-xl border border-border/60 px-3 py-2" style={{
                  background: "linear-gradient(145deg, hsl(var(--muted) / 0.6), hsl(var(--muted) / 0.22))"
                }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Coach read</p>
                  <p className="mt-1.5 text-xs font-medium leading-relaxed line-clamp-3">
                    {protocol.content.coachWarning?.[0] ?? protocol.content.mentalReality?.[0] ?? "Stay consistent and let the middle phase pass."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
});

/* -------- back content (timeline + benefits + phases) -------- */

export interface BackContentProps {
  protocol: DemoProtocol;
  onClose?: () => void;
  /**
   * Optional element rendered inside the back-face header row, between the
   * "Inside the protocol" eyebrow and the "Flip" pill. Used by consumers
   * (e.g. keto card) to add a contextual action like "Export as PDF" without
   * polluting the shared component with feature-specific logic.
   */
  extraAction?: React.ReactNode;
}

export const BackContent = memo(function BackContent({ protocol, onClose, extraAction }: BackContentProps) {
  const { content, accentColorClass, surfaceTintGradient } = protocol;
  return (
    <div className="relative h-full overflow-hidden">
      <CardSurfaceOverlays surfaceTintGradient={surfaceTintGradient} />
      <div className="relative p-6 space-y-6 max-h-[640px] overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10px] font-extrabold uppercase tracking-[0.18em] ${accentColorClass}`}>
            Inside the protocol
          </span>
          <div className="flex items-center gap-2">
            {extraAction}
            {onClose && (
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" /> Flip
              </button>
            )}
          </div>
        </div>

        {/* How This Protocol Works */}
        {content.overview?.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className={`h-3.5 w-3.5 ${accentColorClass}`} />
              <h3 className="text-xs font-extrabold uppercase tracking-wider">How This Protocol Works</h3>
            </div>
            <div className="space-y-2">
              {content.overview.map((p, i) => (
                <p key={i} className="text-xs text-muted-foreground leading-relaxed">{p}</p>
              ))}
            </div>
          </section>
        )}

        {/* Phases timeline (What Your Body Is Doing) */}
        <section>
          <h3 className="text-xs font-extrabold uppercase tracking-wider mb-3">What Your Body Is Doing</h3>
          <div className="relative pl-4">
            <div className={`absolute left-1 top-1 bottom-1 w-px bg-gradient-to-b ${protocol.iconGradient} opacity-60`} />
            <ul className="space-y-3">
              {content.phases.map((p, i) => (
                <li key={i} className="relative">
                  <span
                    className={`absolute -left-[14px] top-1 h-2.5 w-2.5 rounded-full bg-gradient-to-br ${protocol.iconGradient}`}
                    style={{ boxShadow: "0 0 0 3px hsl(var(--card))" }}
                  />
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider ${accentColorClass}`}>{p.range}</span>
                    <span className="text-xs font-bold">{p.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{p.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Benefits */}
        <section>
          <h3 className="text-xs font-extrabold uppercase tracking-wider mb-2">What This Does For You</h3>
          <ul className="grid grid-cols-1 gap-1.5">
            {content.benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className={`mt-1.5 h-1.5 w-1.5 rounded-full bg-gradient-to-br ${protocol.iconGradient}`} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Execution Rules */}
        {content.rules?.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <ListChecks className={`h-3.5 w-3.5 ${accentColorClass}`} />
              <h3 className="text-xs font-extrabold uppercase tracking-wider">Execution Rules</h3>
            </div>
            <ul className="space-y-1.5">
              {content.rules.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className={`mt-1.5 h-1.5 w-1.5 rounded-full bg-gradient-to-br ${protocol.iconGradient}`} />
                  <span className="leading-relaxed">{r}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Mental Reality */}
        {content.mentalReality?.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Brain className={`h-3.5 w-3.5 ${accentColorClass}`} />
              <h3 className="text-xs font-extrabold uppercase tracking-wider">Mental Reality</h3>
            </div>
            <ul className="space-y-1.5">
              {content.mentalReality.map((m, i) => (
                <li key={i} className="text-xs text-muted-foreground leading-relaxed">— {m}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Daily Schedule */}
        {content.schedule?.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <CalendarClock className={`h-3.5 w-3.5 ${accentColorClass}`} />
              <h3 className="text-xs font-extrabold uppercase tracking-wider">Daily Schedule</h3>
            </div>
            <ul className="divide-y divide-border/50 rounded-xl border border-border/60 overflow-hidden">
              {content.schedule.map((s, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                  <span className="font-semibold">{s.label}</span>
                  <span className="text-muted-foreground">{s.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Coach Warning */}
        {content.coachWarning?.length > 0 && (
          <section
            className="rounded-xl border border-amber-500/40 p-3 space-y-1.5"
            style={{ background: "linear-gradient(135deg, hsl(38 92% 50% / 0.08), hsl(38 92% 50% / 0.02))" }}
          >
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Coach Warning</h3>
            </div>
            {content.coachWarning.map((w, i) => (
              <p key={i} className="text-xs leading-relaxed text-amber-900 dark:text-amber-100/90">{w}</p>
            ))}
          </section>
        )}
      </div>
    </div>
  );
});

/* -------- 1) FLIP variant -------- */

function FlipCard({ protocol }: { protocol: DemoProtocol }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="relative pt-6 pb-4" style={{ perspective: "1400px" }}>
      <CardStackBackdrop />
      <div
        className="relative rounded-2xl group"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          minHeight: 280,
        }}
        onClick={() => setFlipped((f) => !f)}
      >
        {/* front */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border border-border cursor-pointer"
          style={{
            backfaceVisibility: "hidden",
            background:
              "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--muted) / 0.6) 100%)",
            boxShadow:
              "0 24px 48px -16px hsl(0 0% 0% / 0.55), 0 12px 24px -10px hsl(0 0% 0% / 0.4), 0 4px 8px -2px hsl(0 0% 0% / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.1), inset 0 -1px 0 hsl(0 0% 0% / 0.3)",
          }}
        >
          <CardFront protocol={protocol} animateStats={!flipped} />
        </div>
        {/* back */}
        <div
          className="relative overflow-hidden rounded-2xl border border-border cursor-pointer"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background:
              "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--muted) / 0.6) 100%)",
            boxShadow:
              "0 24px 48px -16px hsl(0 0% 0% / 0.55), 0 12px 24px -10px hsl(0 0% 0% / 0.4), 0 4px 8px -2px hsl(0 0% 0% / 0.25)",
          }}
        >
          <BackContent protocol={protocol} onClose={() => setFlipped(false)} />
        </div>
      </div>
    </div>
  );
}

/* -------- 2) EXPAND variant -------- */

function ExpandCard({ protocol }: { protocol: DemoProtocol }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative pt-6 pb-4">
      <CardStackBackdrop />
      <div
        className="relative overflow-hidden rounded-2xl border border-border cursor-pointer group transition-transform duration-300 hover:-translate-y-0.5"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--muted) / 0.6) 100%)",
          boxShadow:
            "0 24px 48px -16px hsl(0 0% 0% / 0.55), 0 12px 24px -10px hsl(0 0% 0% / 0.4), 0 4px 8px -2px hsl(0 0% 0% / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.1), inset 0 -1px 0 hsl(0 0% 0% / 0.3)",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <CardFront protocol={protocol} showChevron={!open} />
        <div
          className="grid transition-[grid-template-rows] duration-500 ease-out"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="border-t border-border/60">
              <BackContent protocol={protocol} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------- 3) TILT variant -------- */

function TiltCard({ protocol }: { protocol: DemoProtocol }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number; pressed: boolean }>({ x: 0, y: 0, pressed: false });

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (py - 0.5) * -10;
    const ry = (px - 0.5) * 12;
    setTilt((t) => ({ ...t, x: rx, y: ry }));
  };
  const onLeave = () => setTilt({ x: 0, y: 0, pressed: false });

  const style: CSSProperties = {
    transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${tilt.pressed ? 0.97 : 1})`,
    transition: "transform 0.18s ease-out",
    background:
      "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--muted) / 0.6) 100%)",
    boxShadow:
      "0 24px 48px -16px hsl(0 0% 0% / 0.55), 0 12px 24px -10px hsl(0 0% 0% / 0.4), 0 4px 8px -2px hsl(0 0% 0% / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.1), inset 0 -1px 0 hsl(0 0% 0% / 0.3)",
  };

  return (
    <div className="relative pt-6 pb-4" style={{ perspective: "1200px" }}>
      <CardStackBackdrop />
      <div
        ref={ref}
        className="relative overflow-hidden rounded-2xl border border-border cursor-pointer group"
        style={style}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onPointerDown={() => setTilt((t) => ({ ...t, pressed: true }))}
        onPointerUp={() => setTilt((t) => ({ ...t, pressed: false }))}
      >
        <CardFront protocol={protocol} />
        {/* gloss highlight that follows tilt */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{
            background: `radial-gradient(circle at ${50 + tilt.y * 4}% ${50 - tilt.x * 4}%, hsl(0 0% 100% / 0.18), transparent 55%)`,
            mixBlendMode: "overlay",
            transition: "background 0.18s ease-out",
          }}
          aria-hidden
        />
      </div>
    </div>
  );
}

/* -------- 4) SWIPE variant -------- */

function SwipeCarousel({ protocols }: { protocols: DemoProtocol[] }) {
  const [idx, setIdx] = useState(0);
  const startX = useRef<number | null>(null);

  const go = (dir: number) => {
    setIdx((i) => Math.max(0, Math.min(protocols.length - 1, i + dir)));
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => (startX.current = e.clientX);
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    startX.current = null;
  };

  const current = protocols[idx];

  return (
    <div className="relative pt-6 pb-4 select-none">
      <CardStackBackdrop />
      <div
        className="relative overflow-hidden rounded-2xl border border-border cursor-grab active:cursor-grabbing group"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--muted) / 0.6) 100%)",
          boxShadow:
            "0 24px 48px -16px hsl(0 0% 0% / 0.55), 0 12px 24px -10px hsl(0 0% 0% / 0.4), 0 4px 8px -2px hsl(0 0% 0% / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.1), inset 0 -1px 0 hsl(0 0% 0% / 0.3)",
        }}
        onPointerDown={onDown}
        onPointerUp={onUp}
      >
        <div key={current.id} className="animate-fade-in">
          <CardFront protocol={current} showChevron={false} />
        </div>

        {/* arrows */}
        <button
          onClick={(e) => { e.stopPropagation(); go(-1); }}
          disabled={idx === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur border border-border shadow flex items-center justify-center disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); go(1); }}
          disabled={idx === protocols.length - 1}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur border border-border shadow flex items-center justify-center disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* dots */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {protocols.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-foreground" : "w-1.5 bg-foreground/30"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------- public entry -------- */

/* -------- 5) COMBO variant: swipe between protocols + tap to flip each -------- */

function ComboCard({ protocols, frontExtra = "none" }: { protocols: DemoProtocol[]; frontExtra?: FrontExtraVariant }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const startX = useRef<number | null>(null);
  const moved = useRef(false);
  const tiltRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const onTiltMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    // Slightly stronger tilt on touch so it's clearly visible with a finger
    const intensity = e.pointerType === "touch" ? 1.4 : 1;
    const rx = (py - 0.5) * -8 * intensity;
    const ry = (px - 0.5) * 10 * intensity;
    setTilt({ x: rx, y: ry });
  };
  const onTiltLeave = () => setTilt({ x: 0, y: 0 });

  const go = (dir: number) => {
    setFlipped(false);
    setIdx((i) => Math.max(0, Math.min(protocols.length - 1, i + dir)));
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    startX.current = e.clientX;
    moved.current = false;
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (startX.current !== null && Math.abs(e.clientX - startX.current) > 8) moved.current = true;
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 50) {
      go(dx < 0 ? 1 : -1);
      return;
    }
    if (!moved.current) setFlipped((f) => !f);
  };

  const current = protocols[idx];

  return (
    <div
      ref={tiltRef}
      className="relative pt-6 pb-4 select-none"
      style={{ perspective: "1400px", touchAction: "pan-y" }}
      onPointerMove={onTiltMove}
      onPointerLeave={onTiltLeave}
      onPointerCancel={onTiltLeave}
      onPointerUp={(e) => { if (e.pointerType === "touch") onTiltLeave(); }}
    >
      <CardStackBackdrop />
      <div
        className="relative rounded-2xl group"
        style={{
          transformStyle: "preserve-3d",
          transition: flipped ? "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)" : "transform 0.18s ease-out",
          transform: flipped
            ? "rotateY(180deg)"
            : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          minHeight: 320,
        }}
      >
        {/* FRONT — swipeable carousel */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border border-border cursor-grab active:cursor-grabbing"
          style={{
            backfaceVisibility: "hidden",
            background:
              "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--muted) / 0.6) 100%)",
            boxShadow:
              "0 24px 48px -16px hsl(0 0% 0% / 0.55), 0 12px 24px -10px hsl(0 0% 0% / 0.4), 0 4px 8px -2px hsl(0 0% 0% / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.1), inset 0 -1px 0 hsl(0 0% 0% / 0.3)",
          }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
        >
          <div key={current.id} className="animate-fade-in pb-6">
            <CardFront protocol={current} showChevron={false} animateStats={!flipped} frontExtra={frontExtra} />
          </div>

          {/* arrows */}
          <button
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            disabled={idx === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur border border-border shadow flex items-center justify-center disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); go(1); }}
            disabled={idx === protocols.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur border border-border shadow flex items-center justify-center disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* dots */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {protocols.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-foreground" : "w-1.5 bg-foreground/30"}`}
              />
            ))}
          </div>
        </div>

        {/* BACK — full details for current protocol */}
        <div
          className="relative overflow-hidden rounded-2xl border border-border cursor-pointer"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background:
              "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--muted) / 0.6) 100%)",
            boxShadow:
              "0 24px 48px -16px hsl(0 0% 0% / 0.55), 0 12px 24px -10px hsl(0 0% 0% / 0.4), 0 4px 8px -2px hsl(0 0% 0% / 0.25)",
          }}
        >
          <BackContent protocol={current} onClose={() => setFlipped(false)} />
        </div>
      </div>
    </div>
  );
}

export function InteractiveProtocolCardDemo({
  variant,
  protocol,
  protocols,
  frontExtra = "none",
}: {
  variant: ProtocolCardVariant;
  protocol: DemoProtocol;
  protocols?: DemoProtocol[];
  frontExtra?: FrontExtraVariant;
}) {
  if (variant === "flip") return <FlipCard protocol={protocol} />;
  if (variant === "expand") return <ExpandCard protocol={protocol} />;
  if (variant === "tilt") return <TiltCard protocol={protocol} />;
  if (variant === "combo") return <ComboCard protocols={protocols ?? [protocol]} frontExtra={frontExtra} />;
  return <SwipeCarousel protocols={protocols ?? [protocol]} />;
}