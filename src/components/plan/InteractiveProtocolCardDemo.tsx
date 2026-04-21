import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Lock, ShieldCheck, ChevronRight, ChevronLeft, RotateCcw, type LucideIcon } from "lucide-react";
import type { ProtocolCardContent } from "@/lib/protocolCardContent";

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

export type ProtocolCardVariant = "flip" | "expand" | "tilt" | "swipe";

/* -------- shared visuals (matches PremiumPlanCard) -------- */

function CardStackBackdrop() {
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
}

function CardSurfaceOverlays({ surfaceTintGradient }: { surfaceTintGradient: string }) {
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
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
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
  return (
    <p className={`text-base font-black capitalize drop-shadow-sm ${accentClass ?? ""}`}>{display}</p>
  );
}

/* -------- card front (shared) -------- */

function CardFront({
  protocol,
  showChevron = true,
  pulse = true,
  shimmer = true,
  animateStats = true,
}: {
  protocol: DemoProtocol;
  showChevron?: boolean;
  pulse?: boolean;
  shimmer?: boolean;
  animateStats?: boolean;
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

      <div className="relative p-6">
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
          {protocol.status === "locked" && (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Locked</span>
            </span>
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
      </div>
    </>
  );
}

/* -------- back content (timeline + benefits + phases) -------- */

function BackContent({ protocol, onClose }: { protocol: DemoProtocol; onClose?: () => void }) {
  const { content, accentColorClass, surfaceTintGradient } = protocol;
  return (
    <div className="relative h-full overflow-hidden">
      <CardSurfaceOverlays surfaceTintGradient={surfaceTintGradient} />
      <div className="relative p-6 space-y-5 max-h-[520px] overflow-y-auto">
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-extrabold uppercase tracking-[0.18em] ${accentColorClass}`}>
            Inside the protocol
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" /> Flip
            </button>
          )}
        </div>

        {/* Phases timeline */}
        <section>
          <h3 className="text-xs font-extrabold uppercase tracking-wider mb-3">Fasting Timeline</h3>
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
          <h3 className="text-xs font-extrabold uppercase tracking-wider mb-2">Body Benefits</h3>
          <ul className="grid grid-cols-1 gap-1.5">
            {content.benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className={`mt-1.5 h-1.5 w-1.5 rounded-full bg-gradient-to-br ${protocol.iconGradient}`} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Phases summary (compact) */}
        <section>
          <h3 className="text-xs font-extrabold uppercase tracking-wider mb-2">Coach Notes</h3>
          <ul className="space-y-1.5">
            {content.mentalReality.slice(0, 3).map((m, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed">— {m}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

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

export function InteractiveProtocolCardDemo({
  variant,
  protocol,
  protocols,
}: {
  variant: ProtocolCardVariant;
  protocol: DemoProtocol;
  protocols?: DemoProtocol[];
}) {
  if (variant === "flip") return <FlipCard protocol={protocol} />;
  if (variant === "expand") return <ExpandCard protocol={protocol} />;
  if (variant === "tilt") return <TiltCard protocol={protocol} />;
  return <SwipeCarousel protocols={protocols ?? [protocol]} />;
}