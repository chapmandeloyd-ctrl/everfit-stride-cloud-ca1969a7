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

/**
 * Editorial Black & Gold challenge badge — 3D glossy edition.
 * Layered hexagon: lifted shadow base, chrome gold rim, dark bevel ring,
 * recessed glossy black face with specular highlight + gold inner glow.
 * `color` is preserved in the schema but visually unified into one gold treatment.
 */
export function ChallengeBadge({ label, type, size = "md", className }: Props) {
  const Icon =
    type === "sleep"
      ? Moon
      : type === "movement"
        ? Heart
        : type === "journal"
          ? BookOpen
          : type === "nutrition"
            ? Apple
            : Flame;

  return (
    <div
      className={cn(
        "relative",
        SIZE_CLASSES[size],
        className,
      )}
      style={{
        filter:
          "drop-shadow(0 10px 14px rgba(0,0,0,0.75)) drop-shadow(0 2px 4px rgba(0,0,0,0.6)) drop-shadow(0 0 12px hsl(42 70% 55% / 0.25))",
      }}
      aria-hidden
    >
      {/* Lifted shadow base */}
      <div
        className="absolute inset-0 translate-y-[3px]"
        style={{ background: "hsl(0 0% 0%)", clipPath: HEX_CLIP, opacity: 0.9 }}
      />
      {/* Chrome gold rim */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(155deg, hsl(48 95% 88%) 0%, hsl(45 85% 70%) 18%, hsl(42 75% 52%) 38%, hsl(36 60% 30%) 58%, hsl(40 70% 45%) 78%, hsl(48 90% 78%) 100%)",
          clipPath: HEX_CLIP,
        }}
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
        {/* Soft gold inner glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 60%, hsl(42 70% 55% / 0.18) 0%, transparent 60%)",
          }}
        />
        {label ? (
          <span
            className="relative font-bold leading-none tracking-[0.04em]"
            style={{
              color: "hsl(45 85% 70%)",
              fontFamily: "Georgia, serif",
              textShadow:
                "0 1px 0 rgba(0,0,0,0.95), 0 -1px 0 rgba(255,255,255,0.08), 0 0 10px hsl(42 70% 55% / 0.5)",
            }}
          >
            {label}
          </span>
        ) : (
          <Icon
            className="relative h-1/2 w-1/2"
            strokeWidth={1.5}
            style={{
              color: "hsl(45 85% 70%)",
              filter:
                "drop-shadow(0 1px 0 rgba(0,0,0,0.9)) drop-shadow(0 0 6px hsl(42 70% 55% / 0.5))",
            }}
          />
        )}
      </div>
    </div>
  );
}
