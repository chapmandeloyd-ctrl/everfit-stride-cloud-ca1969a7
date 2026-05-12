import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from "react";
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
  dimmed?: boolean;
  onOpen?: () => void;
  openLabel?: string;
  frontExtra?: FrontExtraVariant;
  flipCancelHorizontalPx?: number;
  flipCancelVerticalPx?: number;
  forcedHeight?: number;
  onMeasureHeight?: (heightPx: number) => void;
  backExtraAction?: React.ReactNode;
  flipped?: boolean;
  onFlippedChange?: (next: boolean) => void;
}

function isLowMemoryDevice() {
  if (typeof navigator === "undefined") return false;

  const nav = navigator as Navigator & { deviceMemory?: number };
  const hasLowMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  const hasLowCpu = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4;

  return hasLowMemory || hasLowCpu;
}

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
  flipped: controlledFlipped,
  onFlippedChange,
}: InteractiveProtocolCardProps) {
  const isMobileViewport = typeof window !== "undefined" ? window.innerWidth < 1024 : false;
  const isMobile = useIsMobile() || isMobileViewport;
  const reduceMotionWork = useMemo(() => isLowMemoryDevice(), []);
  const disableHeavyInteractions = isMobile || reduceMotionWork;

  const [internalFlipped, setInternalFlipped] = useState(false);
  const flipped = controlledFlipped ?? internalFlipped;

  const tiltRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const startScrollY = useRef<number>(0);
  const moved = useRef(false);
  const frameRef = useRef<number | null>(null);
  const measureFrameRef = useRef<number | null>(null);
  const pendingTiltRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const lastPointerTypeRef = useRef<string | null>(null);
  const touchHintShownRef = useRef(false);
  const frontMeasureRef = useRef<HTMLDivElement>(null);
  const backMeasureRef = useRef<HTMLDivElement>(null);

  const [measuredHeight, setMeasuredHeight] = useState<number>(0);
  const [hasFlipped, setHasFlipped] = useState(false);
  const [visibleFlipToast, setVisibleFlipToast] = useState("");
  const [touchHint, setTouchHint] = useState("");

  const effectiveHeight = forcedHeight ?? measuredHeight;
  const protocolName = (protocol as any)?.name ?? (protocol as any)?.title ?? "protocol";

  const setFlipped = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const resolved = typeof next === "function" ? (next as (prev: boolean) => boolean)(flipped) : next;
      if (controlledFlipped === undefined) setInternalFlipped(resolved);
      onFlippedChange?.(resolved);
    },
    [controlledFlipped, flipped, onFlippedChange],
  );

  const applyTiltTransform = useCallback(
    (nextTilt: { x: number; y: number }) => {
      const el = innerRef.current;
      if (!el || flipped) return;

      el.style.transform = `translateZ(0) rotateX(${nextTilt.x}deg) rotateY(${nextTilt.y}deg)`;
    },
    [flipped],
  );

  const scheduleMeasure = useCallback(() => {
    if (measureFrameRef.current !== null) return;

    measureFrameRef.current = requestAnimationFrame(() => {
      measureFrameRef.current = null;

      const front = frontMeasureRef.current;
      const back = backMeasureRef.current;
      if (!front || !back) return;

      const next = Math.max(front.scrollHeight, back.scrollHeight);
      setMeasuredHeight((prev) => (Math.abs(prev - next) > 0.5 ? next : prev));
    });
  }, []);

  useEffect(() => {
    if (forcedHeight) return;

    const front = frontMeasureRef.current;
    const back = backMeasureRef.current;
    if (!front || !back) return;

    scheduleMeasure();

    let ro: ResizeObserver | null = null;
    if (!disableHeavyInteractions && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(scheduleMeasure);
      ro.observe(front);
      ro.observe(back);
    }

    window.addEventListener("resize", scheduleMeasure);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      if (measureFrameRef.current !== null) {
        cancelAnimationFrame(measureFrameRef.current);
        measureFrameRef.current = null;
      }
    };
  }, [forcedHeight, disableHeavyInteractions, scheduleMeasure, protocol, frontExtra, backExtraAction, onOpen, openLabel]);

  useEffect(() => {
    if (measuredHeight > 0) onMeasureHeight?.(measuredHeight);
  }, [measuredHeight, onMeasureHeight]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (measureFrameRef.current !== null) cancelAnimationFrame(measureFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (flipped) setHasFlipped(true);
  }, [flipped]);

  useEffect(() => {
    if (!hasFlipped) return;
    setVisibleFlipToast(flipped ? "Showing details" : "Showing summary");
    const timeoutId = window.setTimeout(() => setVisibleFlipToast(""), 1600);
    return () => window.clearTimeout(timeoutId);
  }, [flipped, hasFlipped]);

  const onTiltMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disableHeavyInteractions || flipped || e.pointerType === "touch") return;
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
      applyTiltTransform(pendingTiltRef.current);
    });
  };

  const onTiltLeave = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    pendingTiltRef.current = { x: 0, y: 0 };
    applyTiltTransform(pendingTiltRef.current);
  }, [applyTiltTransform]);

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof Element && Boolean(target.closest("button, a, input, select, textarea, label, [data-no-flip]"));

  const resetPress = () => {
    activePointerId.current = null;
    startX.current = null;
    startY.current = null;
    moved.current = false;
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.pointerType === "mouse" && e.button !== 0) || isInteractiveTarget(e.target)) return;

    activePointerId.current = e.pointerId;
    lastPointerTypeRef.current = e.pointerType;
    startX.current = e.clientX;
    startY.current = e.clientY;
    startScrollY.current = typeof window !== "undefined" ? window.scrollY : 0;
    moved.current = false;

    if (e.pointerType === "touch" && !touchHintShownRef.current) {
      touchHintShownRef.current = true;
      setTouchHint(`${protocolName} card. Tap card to flip between summary and details. Swipe vertically to scroll.`);
      window.setTimeout(() => setTouchHint(""), 4000);
    }
  };

  const onMoveCheck = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId || startX.current === null || startY.current === null) return;

    const deltaX = Math.abs(e.clientX - startX.current);
    const deltaY = Math.abs(e.clientY - startY.current);
    const scrollDelta = Math.abs((typeof window !== "undefined" ? window.scrollY : 0) - startScrollY.current);
    if (deltaX > flipCancelHorizontalPx || deltaY > flipCancelVerticalPx || scrollDelta > 2) moved.current = true;
  };

  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    const scrollDelta = Math.abs((typeof window !== "undefined" ? window.scrollY : 0) - startScrollY.current);
    const shouldSuppress = moved.current || scrollDelta > 2;

    if (e.pointerType === "touch") {
      suppressClickRef.current = true;
      if (!shouldSuppress && !isInteractiveTarget(e.target)) {
        setFlipped((current) => !current);
      }
    } else {
      suppressClickRef.current = shouldSuppress;
    }

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

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(e.target)) return;
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (lastPointerTypeRef.current === "touch") return;
    setFlipped((current) => !current);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(e.target)) return;

    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setFlipped((current) => !current);
    } else if (e.key === "Escape" && flipped) {
      e.preventDefault();
      setFlipped(false);
    }
  };

  const handleClose = useCallback(() => setFlipped(false), [setFlipped]);
  const handleOpen = useCallback(
    (e?: SyntheticEvent) => {
      e?.stopPropagation();
      onOpen?.();
    },
    [onOpen],
  );

  const liveMessage = !hasFlipped ? "" : flipped ? `${protocolName} details shown.` : `${protocolName} summary shown.`;
  const ariaLabel = flipped
    ? `${protocolName} details card. Press Enter, Space, or tap to return to summary.`
    : `${protocolName} summary card. Press Enter, Space, or tap to view details.`;

  const innerStyle: CSSProperties = {
    transformStyle: "preserve-3d",
    WebkitTransformStyle: "preserve-3d",
    willChange: disableHeavyInteractions ? "auto" : "transform",
    transition: flipped ? "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)" : "transform 0.14s ease-out",
    transform: flipped ? "translateZ(0) rotateY(180deg)" : "translateZ(0) rotateX(0deg) rotateY(0deg)",
    height: effectiveHeight > 0 ? effectiveHeight : undefined,
    minHeight: effectiveHeight > 0 ? undefined : 320,
  };

  const faceStyle: CSSProperties = {
    background:
      "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--muted) / 0.6) 100%)",
    boxShadow:
      "0 24px 48px -16px hsl(0 0% 0% / 0.55), 0 12px 24px -10px hsl(0 0% 0% / 0.4), 0 4px 8px -2px hsl(0 0% 0% / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.1), inset 0 -1px 0 hsl(0 0% 0% / 0.3)",
  };

  const backActions = !backExtraAction && !onOpen ? undefined : (
    <>
      {backExtraAction}
      {onOpen && (
        <button
          type="button"
          data-no-flip
          onClick={handleOpen}
          className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/15"
        >
          {openLabel}
        </button>
      )}
    </>
  );

  return (
    <div
      ref={tiltRef}
      className={`relative pt-6 pb-4 select-none ${dimmed ? "opacity-60 grayscale-[20%]" : ""}`}
      style={{ perspective: "1400px", touchAction: "pan-y" }}
      onPointerMove={disableHeavyInteractions ? undefined : onTiltMove}
      onPointerLeave={disableHeavyInteractions ? undefined : onTiltLeave}
      onPointerCancel={disableHeavyInteractions ? undefined : onTiltLeave}
      onPointerUp={disableHeavyInteractions ? undefined : (e) => { if (e.pointerType === "touch") onTiltLeave(); }}
    >
      <CardStackBackdrop />

      {forcedHeight === undefined && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 invisible"
          style={{ contain: "layout paint" }}
        >
          <div ref={frontMeasureRef} className="rounded-2xl border border-border">
            <CardFront
              protocol={protocol}
              showChevron={false}
              pulse={false}
              shimmer={false}
              animateStats={false}
              frontExtra={frontExtra}
              dimmed={dimmed}
            />
          </div>
          <div ref={backMeasureRef} className="rounded-2xl border border-border">
            <BackContent protocol={protocol} onClose={handleClose} extraAction={backActions} />
          </div>
        </div>
      )}

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMessage}
      </div>

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-2 left-1/2 z-30 -translate-x-1/2 transition-all duration-200 ${
          visibleFlipToast ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
        }`}
      >
        {visibleFlipToast && (
          <div
            className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg"
            style={{
              backgroundImage: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 100%)",
              boxShadow: "0 6px 18px -4px hsl(var(--primary) / 0.55)",
            }}
          >
            {visibleFlipToast}
          </div>
        )}
      </div>

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {touchHint}
      </div>

      <div
        ref={innerRef}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-pressed={flipped}
        className="relative rounded-2xl group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={innerStyle}
        onPointerDown={onDown}
        onPointerMove={onMoveCheck}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        onClickCapture={onClickCapture}
        onKeyDown={onKeyDown}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border border-border"
          style={{ ...faceStyle, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          <CardFront
            protocol={protocol}
            showChevron={false}
            pulse={!disableHeavyInteractions}
            shimmer={!disableHeavyInteractions}
            animateStats={!disableHeavyInteractions}
            frontExtra={frontExtra}
            dimmed={dimmed}
          />
        </div>

        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border border-border"
          style={{
            ...faceStyle,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <BackContent protocol={protocol} onClose={handleClose} extraAction={backActions} />
        </div>
      </div>
    </div>
  );
}
