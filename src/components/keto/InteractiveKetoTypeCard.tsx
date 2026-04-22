import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Zap, Check, Info, Flame, ArrowRight } from "lucide-react";

export interface KetoTypeForCard {
  abbreviation: string;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  difficulty?: "beginner" | "intermediate" | "advanced" | string | null;
  fat_pct: number;
  protein_pct: number;
  carbs_pct: number;
  carb_limit_grams?: number | null;
  how_it_works?: string | null;
  built_for?: string[] | null;
  color?: string | null;
}

export interface InteractiveKetoTypeCardProps {
  ketoType: KetoTypeForCard;
  /** Theme color (hex). Defaults to the ketoType.color or a red fallback. */
  themeColor?: string;
  /** Optional secondary action when the user taps the "Open" pill on the back face. */
  onOpen?: () => void;
  openLabel?: string;
  flipCancelHorizontalPx?: number;
  flipCancelVerticalPx?: number;
}

const difficultyLabel = (d?: string | null) =>
  d === "beginner" ? "Beginner" : d === "intermediate" ? "Intermediate" : d === "advanced" ? "Advanced" : "—";

/**
 * Interactive flip card for the "Your Active Keto Type" hero.
 * Front = current Complete Plan hero look (eyebrow, big abbreviation, name, subtitle, description).
 * Back  = "How it works", "Built for" highlights, and macro breakdown bars.
 * Tap to flip; the whole card is the affordance.
 */
export function InteractiveKetoTypeCard({
  ketoType,
  themeColor: themeColorProp,
  onOpen,
  openLabel = "Open keto details",
  flipCancelHorizontalPx = 8,
  flipCancelVerticalPx = 8,
}: InteractiveKetoTypeCardProps) {
  const themeColor = themeColorProp || ketoType.color || "#E4572E";

  const [flipped, setFlipped] = useState(false);
  const tiltRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const moved = useRef(false);
  const frameRef = useRef<number | null>(null);
  const pendingTiltRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const onTiltMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const el = tiltRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (py - 0.5) * -6;
    const ry = (px - 0.5) * 8;
    pendingTiltRef.current = { x: rx, y: ry };
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      setTilt(pendingTiltRef.current);
    });
  };
  const onTiltLeave = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    pendingTiltRef.current = { x: 0, y: 0 };
    setTilt({ x: 0, y: 0 });
  };

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof Element && Boolean(target.closest("button, a, input, select, textarea, label, [data-no-flip]"));

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.pointerType === "mouse" && e.button !== 0) || isInteractiveTarget(e.target)) return;
    activePointerId.current = e.pointerId;
    startX.current = e.clientX;
    startY.current = e.clientY;
    moved.current = false;
  };
  const onMoveCheck = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId || startX.current === null || startY.current === null) return;
    const dx = Math.abs(e.clientX - startX.current);
    const dy = Math.abs(e.clientY - startY.current);
    if (dx > flipCancelHorizontalPx || dy > flipCancelVerticalPx) moved.current = true;
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    suppressClickRef.current = moved.current;
    if (e.pointerType === "touch") onTiltLeave();
    activePointerId.current = null;
    startX.current = null;
    startY.current = null;
    moved.current = false;
  };
  const onCancel = (e?: ReactPointerEvent<HTMLDivElement>) => {
    if (e && activePointerId.current !== e.pointerId) return;
    suppressClickRef.current = true;
    moved.current = true;
    if (e?.pointerType === "touch") onTiltLeave();
    activePointerId.current = null;
    startX.current = null;
    startY.current = null;
  };
  const onClickCapture = (e: any) => {
    if (isInteractiveTarget(e.target)) return;
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setFlipped((f) => !f);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(e.target)) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setFlipped((f) => !f);
    } else if (e.key === "Escape" && flipped) {
      e.preventDefault();
      setFlipped(false);
    }
  };

  const innerStyle: CSSProperties = {
    transformStyle: "preserve-3d",
    WebkitTransformStyle: "preserve-3d",
    willChange: "transform",
    transition: flipped ? "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)" : "transform 0.14s ease-out",
    transform: flipped
      ? "translateZ(0) rotateY(180deg)"
      : `translateZ(0) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
    minHeight: 280,
  };

  const surfaceStyle: CSSProperties = {
    backgroundColor: `${themeColor}08`,
    borderColor: `${themeColor}25`,
    boxShadow:
      "0 18px 36px -16px hsl(0 0% 0% / 0.18), 0 8px 18px -10px hsl(0 0% 0% / 0.14), inset 0 1px 0 hsl(0 0% 100% / 0.5)",
  };

  const maxPct = Math.max(ketoType.fat_pct, ketoType.protein_pct, ketoType.carbs_pct, 1);

  const ariaLabel = flipped
    ? `${ketoType.abbreviation} keto type details. Press Enter, Space, or Escape to return.`
    : `${ketoType.abbreviation} keto type. Press Enter or Space to view details.`;

  return (
    <div
      ref={tiltRef}
      className="relative select-none"
      style={{ perspective: "1400px", touchAction: "pan-y" }}
      onPointerMove={onTiltMove}
      onPointerLeave={onTiltLeave}
      onPointerCancel={onTiltLeave}
      onPointerUp={(e) => { if (e.pointerType === "touch") onTiltLeave(); }}
    >
      <div
        className="relative rounded-2xl"
        style={innerStyle}
        onPointerDown={onDown}
        onPointerMove={onMoveCheck}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        onClickCapture={onClickCapture}
        onKeyDown={onKeyDown}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={ariaLabel}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border cursor-pointer"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            pointerEvents: flipped ? "none" : "auto",
            ...surfaceStyle,
          }}
          aria-hidden={flipped}
        >
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${themeColor}15` }}
              >
                <Zap className="h-3.5 w-3.5" style={{ color: themeColor }} />
              </div>
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: themeColor }}
              >
                Your Active Keto Type
              </span>
            </div>
            <div className="flex items-baseline gap-3 mb-1">
              <h2 className="text-5xl font-black tracking-tight" style={{ color: themeColor }}>
                {ketoType.abbreviation}
              </h2>
              <span className="text-lg text-muted-foreground">{ketoType.name}</span>
            </div>
            {ketoType.subtitle && (
              <p className="font-bold text-base mt-1">{ketoType.subtitle}</p>
            )}
            {ketoType.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                {ketoType.description}
              </p>
            )}

            {/* Tap-for-details pill */}
            <div className="mt-4 flex items-center justify-center">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primary-foreground shadow"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}D9 100%)`,
                  boxShadow: `0 6px 18px -4px ${themeColor}80`,
                }}
              >
                Tap for details <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>

        {/* BACK */}
        <div
          className="relative overflow-hidden rounded-2xl border"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            pointerEvents: flipped ? "auto" : "none",
            transform: "translateZ(0) rotateY(180deg)",
            ...surfaceStyle,
          }}
          aria-hidden={!flipped}
        >
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${themeColor}15` }}
              >
                <Flame className="h-3.5 w-3.5" style={{ color: themeColor }} />
              </div>
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: themeColor }}
              >
                {ketoType.abbreviation} · {difficultyLabel(ketoType.difficulty)}
              </span>
            </div>

            {ketoType.how_it_works && (
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  How it works
                </h3>
                <p className="text-sm text-foreground/90 leading-relaxed line-clamp-4">
                  {ketoType.how_it_works}
                </p>
              </div>
            )}

            {ketoType.built_for && ketoType.built_for.length > 0 && (
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Built for
                </h3>
                <ul className="space-y-1.5">
                  {ketoType.built_for.slice(0, 3).map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: themeColor }} />
                      <span className="text-sm text-foreground/90">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Macros
              </h3>
              {[
                { label: "Fat", pct: ketoType.fat_pct, barColor: themeColor },
                { label: "Protein", pct: ketoType.protein_pct, barColor: "#94a3b8" },
                { label: "Carbs", pct: ketoType.carbs_pct, barColor: "#475569" },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-3 mb-2 last:mb-0">
                  <span className="text-xs w-12 text-muted-foreground">{m.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(m.pct / maxPct) * 100}%`, backgroundColor: m.barColor }}
                    />
                  </div>
                  <span className="text-xs font-bold w-9 text-right" style={{ color: themeColor }}>
                    {m.pct}%
                  </span>
                </div>
              ))}
              {ketoType.carb_limit_grams && (
                <div className="mt-2 flex items-start gap-1.5">
                  <Info className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                  <p className="text-[11px] text-muted-foreground">
                    Carb limit: <strong>≤{ketoType.carb_limit_grams}g net</strong>
                  </p>
                </div>
              )}
            </div>

            {onOpen && (
              <div className="pt-1 flex justify-center">
                <button
                  onClick={(e) => { e.stopPropagation(); onOpen(); }}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-primary-foreground shadow-lg"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}D9 100%)`,
                    boxShadow: `0 6px 18px -4px ${themeColor}80`,
                  }}
                >
                  {openLabel} →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}