import { cn } from "@/lib/utils";

export interface RingSegment {
  key: string;
  /** Tailwind color class for stroke, e.g. "stroke-orange-500" */
  colorClass: string;
  /** Whether this ring was completed today */
  completed: boolean;
}

interface MultiSegmentRingProps {
  segments: RingSegment[];
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/**
 * Zero-style multi-segment progress ring.
 * Each completed segment fills an equal slice of the ring with its color.
 * If no segments completed → fully grey ring.
 */
export function MultiSegmentRing({
  segments,
  size = 120,
  strokeWidth = 18,
  className,
}: MultiSegmentRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.length;
  const sliceLen = circumference / total;
  const completedCount = segments.filter((s) => s.completed).length;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("-rotate-90", className)}
    >
      {/* Background ring — visible grey track (Zero-style) */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-white/40"
      />
      {completedCount > 0 &&
        segments.map((seg, i) => {
          if (!seg.completed) return null;
          // Pack completed slices contiguously starting at the top
          const completedIndex = segments
            .slice(0, i)
            .filter((s) => s.completed).length;
          const offset = -completedIndex * sliceLen;
          return (
            <circle
              key={seg.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              strokeDasharray={`${sliceLen} ${circumference}`}
              strokeDashoffset={offset}
              className={cn("transition-all", seg.colorClass)}
            />
          );
        })}
    </svg>
  );
}
