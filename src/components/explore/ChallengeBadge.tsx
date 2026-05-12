import type { ChallengeBadgeColor, ChallengeType } from "@/types/explore";
import { Moon, Heart, BookOpen, Apple, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string | null;
  color: ChallengeBadgeColor;
  type: ChallengeType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "h-14 w-14 text-[11px]",
  md: "h-20 w-20 text-base",
  lg: "h-28 w-28 text-lg",
};

const HEX_CLIP =
  "polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)";

/* ──────────────────────────────────────────────────────────────────────
   3D glossy hexagon badge — per-type metallic rim + colored inner glow.
   Black recessed face stays consistent across types so the rim color
   reads as a metal alloy rather than a flat fill.
   ────────────────────────────────────────────────────────────────────── */

interface Palette {
  /** Chrome rim gradient (light → mid → dark → mid → light) */
  rim: string;
  /** Soft inner glow color hsl(...) */
  glow: string;
  /** Label/icon color hsl(...) */
  ink: string;
  /** Drop-shadow color hsl(...) */
  aura: string;
}

const PALETTES: Record<ChallengeType, Palette> = {
  fasting: {
    rim: "linear-gradient(155deg, hsl(0 95% 88%) 0%, hsl(0 85% 70%) 18%, hsl(0 75% 52%) 38%, hsl(0 60% 25%) 58%, hsl(0 70% 45%) 78%, hsl(0 90% 78%) 100%)",
    glow: "hsl(0 80% 55% / 0.25)",
    ink: "hsl(0 85% 72%)",
    aura: "hsl(0 80% 50% / 0.30)",
  },
  sleep: {
    rim: "linear-gradient(155deg, hsl(230 90% 90%) 0%, hsl(230 80% 72%) 18%, hsl(232 70% 52%) 38%, hsl(232 50% 22%) 58%, hsl(230 65% 45%) 78%, hsl(230 85% 80%) 100%)",
    glow: "hsl(230 80% 60% / 0.28)",
    ink: "hsl(230 85% 75%)",
    aura: "hsl(230 80% 50% / 0.30)",
  },
  movement: {
    rim: "linear-gradient(155deg, hsl(20 95% 88%) 0%, hsl(18 85% 68%) 18%, hsl(16 80% 50%) 38%, hsl(14 60% 24%) 58%, hsl(18 75% 45%) 78%, hsl(20 90% 78%) 100%)",
    glow: "hsl(18 85% 55% / 0.25)",
    ink: "hsl(20 90% 70%)",
    aura: "hsl(18 80% 50% / 0.30)",
  },
  journal: {
    rim: "linear-gradient(155deg, hsl(48 95% 88%) 0%, hsl(45 85% 70%) 18%, hsl(42 75% 52%) 38%, hsl(36 60% 30%) 58%, hsl(40 70% 45%) 78%, hsl(48 90% 78%) 100%)",
    glow: "hsl(42 70% 55% / 0.22)",
    ink: "hsl(45 85% 70%)",
    aura: "hsl(42 70% 55% / 0.28)",
  },
  nutrition: {
    rim: "linear-gradient(155deg, hsl(150 80% 88%) 0%, hsl(150 65% 65%) 18%, hsl(150 60% 42%) 38%, hsl(150 45% 18%) 58%, hsl(150 55% 38%) 78%, hsl(150 75% 75%) 100%)",
    glow: "hsl(150 60% 50% / 0.25)",
    ink: "hsl(150 70% 65%)",
    aura: "hsl(150 60% 45% / 0.30)",
  },
};

const ICONS: Record<ChallengeType, typeof Flame> = {
  fasting: Flame,
  sleep: Moon,
  movement: Heart,
  journal: BookOpen,
  nutrition: Apple,
};

export function ChallengeBadge({ label, type, size = "md", className }: Props) {
  const Icon = ICONS[type] ?? Flame;
  const p = PALETTES[type] ?? PALETTES.fasting;

  return (
    <div
      className={cn("relative", SIZE_CLASSES[size], className)}
      style={{
        filter: `drop-shadow(0 10px 14px rgba(0,0,0,0.75)) drop-shadow(0 2px 4px rgba(0,0,0,0.6)) drop-shadow(0 0 12px ${p.aura})`,
      }}
      aria-hidden
    >
      {/* Lifted shadow base */}
      <div
        className="absolute inset-0 translate-y-[3px]"
        style={{ background: "hsl(0 0% 0%)", clipPath: HEX_CLIP, opacity: 0.9 }}
      />
      {/* Chrome rim (per-type) */}
      <div
        className="absolute inset-0"
        style={{ background: p.rim, clipPath: HEX_CLIP }}
      />
      {/* Inner dark bevel ring */}
      <div
        className="absolute inset-[3px]"
        style={{
          background:
            "linear-gradient(155deg, hsl(0 0% 18%) 0%, hsl(0 0% 4%) 50%, hsl(0 0% 12%) 100%)",
          clipPath: HEX_CLIP,
        }}
      />
      {/* Recessed glossy face */}
      <div
        className="absolute inset-[5px] flex items-center justify-center overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 35% 25%, hsl(0 0% 28%) 0%, hsl(0 0% 10%) 40%, hsl(0 0% 2%) 100%)",
          clipPath: HEX_CLIP,
          boxShadow:
            "inset 0 2px 3px rgba(0,0,0,0.9), inset 0 -1px 2px rgba(255,255,255,0.05)",
        }}
      >
        {/* Top specular highlight */}
        <div
          className="absolute inset-x-0 top-0 h-[55%] pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
          }}
        />
        {/* Bottom depth shadow */}
        <div
          className="absolute inset-x-0 bottom-0 h-[55%] pointer-events-none"
          style={{
            background:
              "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)",
          }}
        />
        {/* Soft per-type inner glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 60%, ${p.glow} 0%, transparent 60%)`,
          }}
        />
        {label ? (
          <span
            className="relative font-bold leading-none tracking-[0.04em]"
            style={{
              color: p.ink,
              fontFamily: "Georgia, serif",
              textShadow: `0 1px 0 rgba(0,0,0,0.95), 0 -1px 0 rgba(255,255,255,0.08), 0 0 10px ${p.aura}`,
            }}
          >
            {label}
          </span>
        ) : (
          <Icon
            className="relative h-1/2 w-1/2"
            strokeWidth={1.5}
            style={{
              color: p.ink,
              filter: `drop-shadow(0 1px 0 rgba(0,0,0,0.9)) drop-shadow(0 0 6px ${p.aura})`,
            }}
          />
        )}
      </div>
    </div>
  );
}
