import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import {
  CardStackBackdrop,
  CardFront,
  BackContent,
  type DemoProtocol,
  type FrontExtraVariant,
} from "@/components/plan/InteractiveProtocolCardDemo";

export interface InteractiveProtocolCardProps {
  protocol: DemoProtocol;
  /** Visually dim the card (e.g. when locked). The whole card is still tap-to-flip. */
  dimmed?: boolean;
  /** Optional secondary action when the user taps the "Open" pill on the back face. */
  onOpen?: () => void;
  /** Label for the optional Open button on the back face. */
  openLabel?: string;
  /**
   * Which space-filler to render below the stat tiles on the front face.
   * Defaults to "coachQuote" — the design with the red "Tap for details"
   * pill in the middle, a Coach Follow-Up block, and a phase timeline.
   */
  frontExtra?: FrontExtraVariant;
  /**
   * Pixels of horizontal travel allowed before a press is treated as a swipe
   * (and therefore NOT a flip). Lower = more sensitive / easier to cancel a flip.
   * Default: 8.
   */
  flipCancelHorizontalPx?: number;
  /**
   * Pixels of vertical travel allowed before a press is treated as a scroll
   * (and therefore NOT a flip). Lower = scroll wins more easily, fewer accidental flips.
   * Default: 8.
   */
  flipCancelVerticalPx?: number;
}

/**
 * Production protocol card: flip-on-tap + 3D pointer tilt + premium surface.
 * Pulls front + back from the demo so demo and prod stay in lockstep.
 *
 * No swipe carousel — designed to be rendered as part of a vertical list
 * (e.g. on /client/programs) so each protocol gets its own card with its
 * own independent flip + tilt state.
 */
export function InteractiveProtocolCard({
  protocol,
  dimmed,
  onOpen,
  openLabel = "Open plan",
  frontExtra = "coachQuote",
  flipCancelHorizontalPx = 8,
  flipCancelVerticalPx = 8,
}: InteractiveProtocolCardProps) {
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
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const onTiltMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Skip tilt entirely on touch — it fights vertical scroll and causes jank.
    if (e.pointerType === "touch") return;
    const el = tiltRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (py - 0.5) * -8;
    const ry = (px - 0.5) * 10;

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

  const resetPress = () => {
    activePointerId.current = null;
    startX.current = null;
    startY.current = null;
    moved.current = false;
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
    const deltaX = Math.abs(e.clientX - startX.current);
    const deltaY = Math.abs(e.clientY - startY.current);
    if (deltaX > flipCancelHorizontalPx || deltaY > flipCancelVerticalPx) moved.current = true;
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    suppressClickRef.current = moved.current;
    if (e.pointerType === "touch") onTiltLeave();
    resetPress();
  };

  const onCancel = (e?: ReactPointerEvent<HTMLDivElement>) => {
    if (e && activePointerId.current !== e.pointerId) return;
    suppressClickRef.current = true;
    moved.current = true;
    if (e?.pointerType === "touch") onTiltLeave();
    resetPress();
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

  const protocolName = (protocol as any)?.name ?? (protocol as any)?.title ?? "protocol";
  const ariaLabel = flipped
    ? `${protocolName} details. Press Enter, Space, or Escape to return to summary.`
    : `${protocolName} summary card. Press Enter or Space to view details.`;

  const innerStyle: CSSProperties = {
    transformStyle: "preserve-3d",
    WebkitTransformStyle: "preserve-3d",
    willChange: "transform",
    transition: flipped ? "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)" : "transform 0.14s ease-out",
    transform: flipped ? "translateZ(0) rotateY(180deg)" : `translateZ(0) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
    minHeight: 320,
  };

  const surfaceStyle: CSSProperties = {
    background:
      "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--muted) / 0.6) 100%)",
    boxShadow:
      "0 24px 48px -16px hsl(0 0% 0% / 0.55), 0 12px 24px -10px hsl(0 0% 0% / 0.4), 0 4px 8px -2px hsl(0 0% 0% / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.1), inset 0 -1px 0 hsl(0 0% 0% / 0.3)",
  };

  return (
    <div
      ref={tiltRef}
      className={`relative pt-6 pb-4 select-none ${dimmed ? "opacity-60 grayscale-[20%]" : ""}`}
      style={{ perspective: "1400px", touchAction: "pan-y" }}
      onPointerMove={onTiltMove}
      onPointerLeave={onTiltLeave}
      onPointerCancel={onTiltLeave}
      onPointerUp={(e) => { if (e.pointerType === "touch") onTiltLeave(); }}
    >
      <CardStackBackdrop />

      <div
        className="relative rounded-2xl group"
        style={innerStyle}
        onPointerDown={onDown}
        onPointerMove={onMoveCheck}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        onClickCapture={onClickCapture}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border border-border cursor-pointer"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", pointerEvents: flipped ? "none" : "auto", ...surfaceStyle }}
        >
          <CardFront protocol={protocol} showChevron={false} animateStats={!flipped} frontExtra={frontExtra} />
        </div>

        {/* BACK */}
        <div
          className="relative overflow-hidden rounded-2xl border border-border"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            pointerEvents: flipped ? "auto" : "none",
            transform: "translateZ(0) rotateY(180deg)",
            ...surfaceStyle,
          }}
        >
          <BackContent protocol={protocol} onClose={() => setFlipped(false)} />
          {onOpen && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <button
                onClick={(e) => { e.stopPropagation(); onOpen(); }}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-primary-foreground shadow-lg"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 50%, hsl(var(--primary) / 0.95) 100%)",
                  boxShadow:
                    "0 6px 18px -4px hsl(var(--primary) / 0.55), 0 2px 6px -2px hsl(var(--primary) / 0.4)",
                }}
              >
                {openLabel} →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
