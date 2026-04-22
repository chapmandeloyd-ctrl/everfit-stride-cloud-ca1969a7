import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import {
  CardStackBackdrop,
  CardFront,
  BackContent,
  type DemoProtocol,
} from "@/components/plan/InteractiveProtocolCardDemo";

export interface InteractiveProtocolCardProps {
  protocol: DemoProtocol;
  /** Visually dim the card (e.g. when locked). The whole card is still tap-to-flip. */
  dimmed?: boolean;
  /** Optional secondary action when the user taps the "Open" pill on the back face. */
  onOpen?: () => void;
  /** Label for the optional Open button on the back face. */
  openLabel?: string;
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
}: InteractiveProtocolCardProps) {
  const [flipped, setFlipped] = useState(false);
  const tiltRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const startX = useRef<number | null>(null);
  const moved = useRef(false);

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
    setTilt({ x: rx, y: ry });
  };
  const onTiltLeave = () => setTilt({ x: 0, y: 0 });

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    startX.current = e.clientX;
    moved.current = false;
  };
  const onMoveCheck = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (startX.current !== null && Math.abs(e.clientX - startX.current) > 8) moved.current = true;
  };
  const onUp = () => {
    if (!moved.current) setFlipped((f) => !f);
    startX.current = null;
  };

  const innerStyle: CSSProperties = {
    transformStyle: "preserve-3d",
    transition: flipped ? "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)" : "transform 0.18s ease-out",
    transform: flipped ? "rotateY(180deg)" : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
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

      <div className="relative rounded-2xl group" style={innerStyle}>
        {/* FRONT */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl border border-border cursor-pointer"
          style={{ backfaceVisibility: "hidden", ...surfaceStyle }}
          onPointerDown={onDown}
          onPointerMove={onMoveCheck}
          onPointerUp={onUp}
        >
          <CardFront protocol={protocol} showChevron={false} animateStats={!flipped} />
        </div>

        {/* BACK */}
        <div
          className="relative overflow-hidden rounded-2xl border border-border"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
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
