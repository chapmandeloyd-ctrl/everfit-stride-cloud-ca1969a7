import { useRef, useState } from "react";
import type { ChallengeBadgeColor, ChallengeType } from "@/types/explore";
import { cn } from "@/lib/utils";
import fastingBadge from "@/assets/badges-3d/fasting.png";
import sleepBadge from "@/assets/badges-3d/sleep.png";
import movementBadge from "@/assets/badges-3d/movement.png";
import journalBadge from "@/assets/badges-3d/journal.png";
import nutritionBadge from "@/assets/badges-3d/nutrition.png";

interface Props {
  label: string | null;
  color: ChallengeBadgeColor;
  type: ChallengeType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "w-14 text-[10px]",
  md: "w-20 text-xs",
  lg: "w-28 text-sm",
};

const ASSETS: Record<ChallengeType, string> = {
  fasting: fastingBadge,
  sleep: sleepBadge,
  movement: movementBadge,
  journal: journalBadge,
  nutrition: nutritionBadge,
};

const AURA: Record<ChallengeType, string> = {
  fasting: "rgba(220, 30, 30, 0.45)",
  sleep: "rgba(60, 80, 230, 0.45)",
  movement: "rgba(240, 110, 30, 0.45)",
  journal: "rgba(230, 180, 30, 0.45)",
  nutrition: "rgba(40, 170, 80, 0.45)",
};

/* ──────────────────────────────────────────────────────────────────────
   3D glossy badge — uses generated PNG asset per type with a
   pointer-driven tilt + press-spring interaction so the badge "moves"
   when touched. Pure presentation, no behavior changes.
   ────────────────────────────────────────────────────────────────────── */
export function ChallengeBadge({ label, type, size = "md", className }: Props) {
  const src = ASSETS[type] ?? ASSETS.fasting;
  const aura = AURA[type] ?? AURA.fasting;
  const ref = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState<{ rx: number; ry: number; pressed: boolean }>(
    { rx: 0, ry: 0, pressed: false }
  );

  const handleMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    // Max ~14deg tilt
    const ry = (px - 0.5) * 28;
    const rx = (0.5 - py) * 28;
    setTilt((t) => ({ ...t, rx, ry }));
  };

  const reset = () => setTilt({ rx: 0, ry: 0, pressed: false });

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 select-none",
        SIZE_CLASSES[size],
        className
      )}
    >
      <div
        ref={ref}
        onPointerMove={handleMove}
        onPointerDown={() => setTilt((t) => ({ ...t, pressed: true }))}
        onPointerUp={reset}
        onPointerLeave={reset}
        onPointerCancel={reset}
        className="relative w-full aspect-square touch-none cursor-pointer"
        style={{
          perspective: "600px",
          filter: `drop-shadow(0 10px 18px rgba(0,0,0,0.55)) drop-shadow(0 0 14px ${aura})`,
        }}
        aria-hidden
      >
        <div
          className="relative h-full w-full will-change-transform"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${tilt.pressed ? 0.94 : 1})`,
          transition:
            tilt.rx === 0 && tilt.ry === 0
              ? "transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)"
              : "transform 80ms ease-out",
          transformStyle: "preserve-3d",
        }}
      >
        <img
          src={src}
          alt=""
          width={1024}
          height={1024}
          loading="lazy"
          className="h-full w-full object-contain pointer-events-none"
          draggable={false}
        />
        {/* Moving specular gloss that follows tilt */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-screen"
          style={{
            background: `radial-gradient(circle at ${50 + tilt.ry * 1.5}% ${50 - tilt.rx * 1.5}%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 45%)`,
            transition: "background 80ms ease-out",
          }}
        />
        </div>
      </div>
      {label ? (
        <span
          className="font-extrabold uppercase tracking-[0.18em] text-white/90 leading-none"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
