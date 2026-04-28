import type { ChallengeBadgeColor, ChallengeType } from "@/types/explore";
import { Moon, Heart, BookOpen, Apple } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string | null;
  color: ChallengeBadgeColor;
  type: ChallengeType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const COLOR_CLASSES: Record<ChallengeBadgeColor, string> = {
  green: "bg-emerald-600 text-white",
  purple: "bg-purple-500 text-white",
  pink: "bg-pink-500 text-white",
  red: "bg-primary text-primary-foreground",
};

const SIZE_CLASSES = {
  sm: "h-12 w-12 text-xs",
  md: "h-16 w-16 text-sm",
  lg: "h-24 w-24 text-base",
};

export function ChallengeBadge({ label, color, type, size = "md", className }: Props) {
  // Hexagonal-ish rounded badge
  const Icon =
    type === "sleep"
      ? Moon
      : type === "movement"
        ? Heart
        : type === "journal"
          ? BookOpen
          : type === "nutrition"
            ? Apple
            : null;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-2xl font-bold shadow-sm",
        COLOR_CLASSES[color],
        SIZE_CLASSES[size],
        className
      )}
      style={{
        clipPath:
          "polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)",
      }}
      aria-hidden
    >
      {label ? (
        <span className="leading-none tracking-tight">{label}</span>
      ) : Icon ? (
        <Icon className="h-1/2 w-1/2" />
      ) : null}
    </div>
  );
}
