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
  sm: "h-12 w-12 text-[10px]",
  md: "h-16 w-16 text-xs",
  lg: "h-24 w-24 text-sm",
};

/**
 * Editorial Black & Gold challenge badge.
 * Hexagonal gold-outlined plate on near-black, with a thin inner ring.
 * `color` is preserved in the schema but visually unified into one gold treatment
 * so Explore matches the Start Here / Choose Protocol aesthetic.
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
        "relative flex items-center justify-center font-semibold tracking-[0.18em] uppercase",
        SIZE_CLASSES[size],
        className,
      )}
      style={{
        background: "hsl(0 0% 6%)",
        color: "hsl(42 70% 55%)",
        border: "1px solid hsl(42 70% 55% / 0.55)",
        clipPath: "polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)",
        fontFamily: "Georgia, serif",
      }}
      aria-hidden
    >
      {label ? (
        <span className="leading-none">{label}</span>
      ) : (
        <Icon className="h-1/2 w-1/2" strokeWidth={1.25} />
      )}
    </div>
  );
}
