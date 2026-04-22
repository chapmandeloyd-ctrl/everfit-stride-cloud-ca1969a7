import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Sparkles, BarChart3, Target } from "lucide-react";

export interface MacroComparisonItem {
  id: string;
  abbreviation: string;
  fat_pct: number;
  protein_pct: number;
  carbs_pct: number;
  color: string | null;
}

interface MacroComparisonFlipCardProps {
  items: MacroComparisonItem[];
  /** ID of the currently active keto type — gets a "YOU" pill on front + callout on back. */
  activeId?: string | null;
  /** Theme color (hex) — drives accent for headers / pills. */
  themeColor?: string;
}

/** Short one-liner for each known keto type abbreviation. */
const QUICK_PICK: Record<string, string> = {
  LAZY: "Easy entry — hit fat, ignore the rest",
  SKD: "Classic baseline for steady fat loss",
  HPKD: "Lifters & athletes protecting muscle",
  TKD: "Carbs timed around training",
  CKD: "Advanced refeeds for performance",
  MCT: "Cognitive focus & mental clarity",
  MED: "Sustainable, food-variety friendly",
  CRK: "Strict therapeutic ketosis",
};

function quickPickFor(abbr: string): string {
  return QUICK_PICK[abbr.toUpperCase()] || "Specialty ketogenic approach";
}

export function MacroComparisonFlipCard({
  items,
  activeId,
  themeColor = "#ef4444",
}: MacroComparisonFlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const tiltRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const moved = useRef(false);
  const activePointerId = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const pendingTiltRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Auto-size to the taller face
  const frontMeasureRef = useRef<HTMLDivElement>(null);
  const backMeasureRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number>(0);

  useEffect(() => {
    const front = frontMeasureRef.current;
    const back = backMeasureRef.current;
    if (!front || !back) return;
    const update = () => {
      const next = Math.max(front.scrollHeight, back.scrollHeight);
      setMeasuredHeight((prev) => (Math.abs(prev - next) > 0.5 ? next : prev));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(front);
    ro.observe(back);
    return () => ro.disconnect();
  }, [items, activeId]);

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
    pendingTiltRef.current = { x: (py - 0.5) * -8, y: (px - 0.5) * 10 };
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

  const isInteractive = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(target.closest("button, a, input, select, textarea, [data-no-flip]"));

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.pointerType === "mouse" && e.button !== 0) || isInteractive(e.target)) return;
    activePointerId.current = e.pointerId;
    startX.current = e.clientX;
    startY.current = e.clientY;
    moved.current = false;
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId || startX.current === null || startY.current === null) return;
    if (Math.abs(e.clientX - startX.current) > 8 || Math.abs(e.clientY - startY.current) > 8) {
      moved.current = true;
    }
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    suppressClickRef.current = moved.current;
    if (e.pointerType === "touch") onTiltLeave();
    activePointerId.current = null;
  };
  const onClickCapture = (e: any) => {
    if (isInteractive(e.target)) return;
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setFlipped((f) => !f);
  };

  const innerStyle: CSSProperties = {
    transformStyle: "preserve-3d",
    WebkitTransformStyle: "preserve-3d",
    willChange: "transform",
    transition: flipped
      ? "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)"
      : "transform 0.14s ease-out",
    transform: flipped
      ? "translateZ(0) rotateY(180deg)"
      : `translateZ(0) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
    height: measuredHeight > 0 ? measuredHeight : undefined,
    minHeight: measuredHeight > 0 ? undefined : 360,
  };

  const surfaceStyle: CSSProperties = {
    background:
      "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--muted) / 0.6) 100%)",
    boxShadow:
      "0 24px 48px -16px hsl(0 0% 0% / 0.55), 0 12px 24px -10px hsl(0 0% 0% / 0.4), 0 4px 8px -2px hsl(0 0% 0% / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.1), inset 0 -1px 0 hsl(0 0% 0% / 0.3)",
  };

  const activeItem = items.find((i) => i.id === activeId);

  const Front = (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <SquircleIcon themeColor={themeColor}>
          <BarChart3 className="h-4 w-4 text-white" strokeWidth={2.5} />
        </SquircleIcon>
        <span
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: themeColor }}
        >
          Macro Comparison — All Types
        </span>
      </div>

      <div className="space-y-3">
        {items.map((t) => {
          const total = t.fat_pct + t.protein_pct + t.carbs_pct;
          const fatW = (t.fat_pct / total) * 100;
          const protW = (t.protein_pct / total) * 100;
          const carbW = (t.carbs_pct / total) * 100;
          const isActive = t.id === activeId;
          const c = t.color || "#94a3b8";
          return (
            <div
              key={t.id}
              className={`flex items-center gap-3 px-2 py-1.5 rounded-lg ${
                isActive ? "bg-muted/50 ring-1 ring-inset" : ""
              }`}
              style={isActive ? { ["--tw-ring-color" as any]: `${c}55` } : undefined}
            >
              <span className="text-xs font-bold w-12" style={{ color: c }}>
                {t.abbreviation}
              </span>
              {/* 3D embossed pill — outer shadow + inner highlights */}
              <div
                className="relative flex-1 h-3.5 rounded-full overflow-hidden flex"
                style={{
                  boxShadow:
                    "0 2px 4px -1px hsl(0 0% 0% / 0.35), 0 1px 2px hsl(0 0% 0% / 0.25), inset 0 1px 1px hsl(0 0% 100% / 0.18), inset 0 -1px 1px hsl(0 0% 0% / 0.35)",
                }}
              >
                {/* Fat segment — colored, glossy */}
                <div
                  className="h-full"
                  style={{
                    width: `${fatW}%`,
                    background: `linear-gradient(180deg, ${c} 0%, ${c} 45%, ${c}cc 100%)`,
                  }}
                />
                {/* Protein segment — mid grey, raised */}
                <div
                  className="h-full"
                  style={{
                    width: `${protW}%`,
                    background:
                      "linear-gradient(180deg, hsl(var(--muted-foreground) / 0.45) 0%, hsl(var(--muted-foreground) / 0.3) 100%)",
                  }}
                />
                {/* Carb segment — darker grey, deeper */}
                <div
                  className="h-full"
                  style={{
                    width: `${carbW}%`,
                    background:
                      "linear-gradient(180deg, hsl(var(--muted-foreground) / 0.7) 0%, hsl(var(--muted-foreground) / 0.55) 100%)",
                  }}
                />
                {/* Top gloss highlight — sits over the entire pill */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full"
                  style={{
                    background:
                      "linear-gradient(180deg, hsl(0 0% 100% / 0.28) 0%, hsl(0 0% 100% / 0) 100%)",
                  }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground w-24 text-right tabular-nums">
                <span style={{ color: c }}>{t.fat_pct}%F</span> {t.protein_pct}%P {t.carbs_pct}%C
              </span>
              {isActive && (
                <span
                  className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded text-black"
                  style={{
                    background: `linear-gradient(180deg, ${c} 0%, ${c}d9 100%)`,
                    boxShadow:
                      "0 2px 4px -1px hsl(0 0% 0% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.35), inset 0 -1px 0 hsl(0 0% 0% / 0.25)",
                  }}
                >
                  You
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tap hint */}
      <div className="mt-5 flex justify-center">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primary-foreground"
          style={{
            backgroundImage:
              "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 100%)",
            boxShadow: "0 6px 18px -4px hsl(var(--primary) / 0.55)",
          }}
        >
          Tap for Decoder →
        </span>
      </div>
    </div>
  );

  const Back = (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <SquircleIcon themeColor={themeColor}>
          <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
        </SquircleIcon>
        <span
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: themeColor }}
        >
          How To Read This
        </span>
      </div>

      {/* Decoder */}
      <div className="space-y-2">
        <DecoderRow
          label="Higher Fat %"
          detail="Deeper ketosis, stronger appetite control, longer satiety."
        />
        <DecoderRow
          label="Higher Protein %"
          detail="Muscle preservation — best for lifters, athletes, and cuts."
        />
        <DecoderRow
          label="Higher Carb %"
          detail="More flexibility around training and social meals."
        />
      </div>

      {/* Divider */}
      <div className="border-t border-border/60" />

      {/* Quick-pick guide */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-3.5 w-3.5" style={{ color: themeColor }} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            When Each Type Shines
          </span>
        </div>
        <ul className="space-y-1.5">
          {items.map((t) => {
            const isActive = t.id === activeId;
            const c = t.color || "#94a3b8";
            return (
              <li
                key={t.id}
                className={`flex items-start gap-2.5 text-[12px] leading-snug ${
                  isActive ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                <span
                  className="text-[10px] font-black tracking-wider w-12 shrink-0 mt-0.5"
                  style={{ color: c }}
                >
                  {t.abbreviation}
                </span>
                <span>{quickPickFor(t.abbreviation)}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Coach callout */}
      {activeItem && (
        <div
          className="rounded-lg p-3 border"
          style={{
            backgroundColor: `${activeItem.color || themeColor}10`,
            borderColor: `${activeItem.color || themeColor}40`,
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: activeItem.color || themeColor }}>
            Why You're On {activeItem.abbreviation}
          </p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Your coach assigned <strong className="text-foreground">{activeItem.abbreviation}</strong> because its{" "}
            <strong className="text-foreground">{activeItem.fat_pct}%F / {activeItem.protein_pct}%P / {activeItem.carbs_pct}%C</strong>{" "}
            split best matches your training load, body-comp goals, and food preferences.
          </p>
        </div>
      )}

      <div className="flex justify-center pt-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Tap to flip back
        </span>
      </div>
    </div>
  );

  return (
    <div
      ref={tiltRef}
      className="relative pt-2 pb-2 select-none"
      style={{ perspective: "1400px", touchAction: "pan-y" }}
      onPointerMove={onTiltMove}
      onPointerLeave={onTiltLeave}
      onPointerCancel={onTiltLeave}
    >
      {/* Hidden measurement layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 invisible"
        style={{ contain: "layout paint" }}
      >
        <div ref={frontMeasureRef} className="rounded-2xl border border-border">
          {Front}
        </div>
        <div ref={backMeasureRef} className="rounded-2xl border border-border">
          {Back}
        </div>
      </div>

      <div
        className="relative rounded-2xl"
        style={innerStyle}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onClickCapture={onClickCapture}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label="Macro comparison card. Tap to flip between chart and decoder."
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border border-border cursor-pointer"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            pointerEvents: flipped ? "none" : "auto",
            ...surfaceStyle,
          }}
          aria-hidden={flipped}
        >
          {Front}
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
          {Back}
        </div>
      </div>
    </div>
  );
}

function DecoderRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="h-1.5 w-1.5 rounded-full bg-foreground/60 mt-1.5 shrink-0" />
      <div className="flex-1">
        <span className="text-[12px] font-bold text-foreground">{label}</span>
        <span className="text-[12px] text-muted-foreground"> — {detail}</span>
      </div>
    </div>
  );
}