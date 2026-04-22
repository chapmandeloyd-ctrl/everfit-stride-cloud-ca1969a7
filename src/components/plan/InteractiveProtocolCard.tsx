import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import {
  CardStackBackdrop,
  CardFront,
  BackContent,
  type DemoProtocol,
  type FrontExtraVariant,
} from "@/components/plan/InteractiveProtocolCardDemo";
import { useIsMobile } from "@/hooks/use-mobile";

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
  /**
   * Optional fixed height (px) for the flip container. When provided, overrides
   * the auto-measured height. Use this to make a list of cards uniform height
   * (parent measures each card via `onMeasureHeight` and feeds back the max).
   */
  forcedHeight?: number;
  /**
   * Called whenever the card's natural (auto-measured) height changes.
   * Parent can collect these from sibling cards and re-render with `forcedHeight`
   * set to the max so all cards in a list end up the same height.
   */
  onMeasureHeight?: (heightPx: number) => void;
  /**
   * Optional element rendered inside the back-face header row, to the left of
   * the "Flip" pill. Used by feature cards (e.g. keto) to add a contextual
   * action like "Export as PDF" without coupling the shared component to
   * any one feature.
   */
  backExtraAction?: React.ReactNode;
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
  forcedHeight,
  onMeasureHeight,
  backExtraAction,
}: InteractiveProtocolCardProps) {
  const isMobile = useIsMobile();
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

  // --- Auto-sizing: measure both faces and use the taller as the container height ---
  const frontMeasureRef = useRef<HTMLDivElement>(null);
  const backMeasureRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number>(0);

  useEffect(() => {
    const front = frontMeasureRef.current;
    const back = backMeasureRef.current;
    if (!front || !back) return;

    const update = () => {
      const fh = front.scrollHeight;
      const bh = back.scrollHeight;
      const next = Math.max(fh, bh);
      setMeasuredHeight((prev) => (Math.abs(prev - next) > 0.5 ? next : prev));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(front);
    ro.observe(back);
    return () => ro.disconnect();
  }, [protocol, frontExtra]);

  useEffect(() => {
    if (measuredHeight > 0) onMeasureHeight?.(measuredHeight);
  }, [measuredHeight, onMeasureHeight]);

  const effectiveHeight = forcedHeight ?? measuredHeight;

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
    if (e.pointerType === "touch" && !touchHintShownRef.current) {
      touchHintShownRef.current = true;
      setTouchHint(
        `${protocolName} card. Tap to flip between summary and details. Swipe vertically to scroll the page.`
      );
      window.setTimeout(() => setTouchHint(""), 4000);
    }
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
  const [hasFlipped, setHasFlipped] = useState(false);
  useEffect(() => {
    if (flipped) setHasFlipped(true);
  }, [flipped]);
  const liveMessage = !hasFlipped
    ? ""
    : flipped
      ? `${protocolName} details shown.`
      : `${protocolName} summary shown.`;

  // Visible flip toast (mirrors the screen-reader announcement so sighted users
  // also see the state change). Auto-hides after a short delay.
  const [visibleFlipToast, setVisibleFlipToast] = useState("");
  useEffect(() => {
    if (!hasFlipped) return;
    setVisibleFlipToast(flipped ? "Showing details" : "Showing summary");
    const t = window.setTimeout(() => setVisibleFlipToast(""), 1600);
    return () => window.clearTimeout(t);
  }, [flipped, hasFlipped]);

  // One-time touch hint: announced the first time a touch interaction starts on this card.
  const [touchHint, setTouchHint] = useState("");
  const touchHintShownRef = useRef(false);

  const innerStyle: CSSProperties = {
    transformStyle: "preserve-3d",
    WebkitTransformStyle: "preserve-3d",
    willChange: "transform",
    transition: flipped ? "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)" : "transform 0.14s ease-out",
    transform: flipped ? "translateZ(0) rotateY(180deg)" : `translateZ(0) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
    height: effectiveHeight > 0 ? effectiveHeight : undefined,
    minHeight: effectiveHeight > 0 ? undefined : 320,
  };

  const surfaceStyle: CSSProperties = {
    background:
      "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--muted) / 0.6) 100%)",
    boxShadow:
      "0 24px 48px -16px hsl(0 0% 0% / 0.55), 0 12px 24px -10px hsl(0 0% 0% / 0.4), 0 4px 8px -2px hsl(0 0% 0% / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.1), inset 0 -1px 0 hsl(0 0% 0% / 0.3)",
  };

  if (isMobile) {
    return (
      <div className={`relative pt-6 pb-4 select-none ${dimmed ? "opacity-60 grayscale-[20%]" : ""}`}>
        <CardStackBackdrop />

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {liveMessage}
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-border" style={surfaceStyle}>
          {!flipped ? (
            <div
              role="button"
              tabIndex={0}
              aria-pressed={false}
              aria-label={ariaLabel}
              onClick={() => setFlipped(true)}
              onKeyDown={onKeyDown}
            >
              <CardFront
                protocol={protocol}
                showChevron={false}
                pulse={false}
                shimmer={false}
                animateStats={false}
                frontExtra={frontExtra}
              />
            </div>
          ) : (
            <>
              <BackContent protocol={protocol} onClose={() => setFlipped(false)} extraAction={backExtraAction} />
              {onOpen && (
                <div className="px-4 pb-4 -mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen();
                    }}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-primary-foreground shadow-lg"
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
            </>
          )}
        </div>
      </div>
    );
  }

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

      {/* Hidden measurement layer — renders both faces off-screen at full width
          so we can size the flip container to the taller of the two. Pointer
          events disabled and aria-hidden so it's invisible to users + a11y. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 invisible"
        style={{ contain: "layout paint" }}
      >
        <div ref={frontMeasureRef} className="rounded-2xl border border-border">
          <CardFront protocol={protocol} showChevron={false} animateStats={false} frontExtra={frontExtra} />
        </div>
        <div ref={backMeasureRef} className="rounded-2xl border border-border">
          <BackContent protocol={protocol} onClose={() => {}} extraAction={backExtraAction} />
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveMessage}
      </div>

      {/* Visible flip toast — small pill at the top-center of the card */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-30 transition-all duration-200 ${
          visibleFlipToast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
        }`}
      >
        {visibleFlipToast && (
          <div
            className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg"
            style={{
              backgroundImage:
                "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 100%)",
              boxShadow: "0 6px 18px -4px hsl(var(--primary) / 0.55)",
            }}
          >
            {visibleFlipToast}
          </div>
        )}
      </div>

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {touchHint}
      </div>

      <div
        className="relative rounded-2xl group"
        style={innerStyle}
        onPointerDown={onDown}
        onPointerMove={onMoveCheck}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        onClickCapture={onClickCapture}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border border-border cursor-pointer"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", pointerEvents: flipped ? "none" : "auto", ...surfaceStyle }}
          aria-hidden={flipped}
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
          aria-hidden={!flipped}
        >
          <BackContent protocol={protocol} onClose={() => setFlipped(false)} extraAction={backExtraAction} />
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
