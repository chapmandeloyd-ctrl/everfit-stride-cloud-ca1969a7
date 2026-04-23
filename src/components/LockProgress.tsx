import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface LockProgressProps {
  /** Current value (e.g. client's current level). */
  current: number;
  /** Required value to unlock (e.g. plan's min level). */
  required: number;
  /** Optional unit label shown next to the numbers. Defaults to "Level". */
  label?: string;
  /** Optional className passthrough. */
  className?: string;
  /** Visual size — "sm" (default) for inside cards, "xs" for tight chips. */
  size?: "xs" | "sm";
}

/**
 * Compact progress indicator for locked cards.
 *
 * Shows how close the client is to meeting an unlock criterion (e.g. their
 * current level vs. the required level), rendered as a thin progress bar
 * with a small label above it. Designed to live inside locked-card overlays
 * and the LockedPlanPopover content.
 */
export function LockProgress({
  current,
  required,
  label = "Level",
  className,
  size = "sm",
}: LockProgressProps) {
  const safeRequired = Math.max(1, required);
  const safeCurrent = Math.max(0, Math.min(current, safeRequired));
  const pct = Math.round((safeCurrent / safeRequired) * 100);
  const remaining = Math.max(0, safeRequired - safeCurrent);

  const textSize = size === "xs" ? "text-[9px]" : "text-[10px]";
  const barHeight = size === "xs" ? "h-1" : "h-1.5";

  return (
    <div
      className={cn("w-full", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeRequired}
      aria-valuenow={safeCurrent}
      aria-label={`${label} ${safeCurrent} of ${safeRequired}`}
    >
      <div className={cn("flex items-center justify-between mb-1", textSize)}>
        <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-muted-foreground">
          <TrendingUp className={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} />
          {label} {safeCurrent}/{safeRequired}
        </span>
        <span className="font-bold text-foreground/80">
          {remaining === 0 ? "Ready" : `${remaining} to go`}
        </span>
      </div>
      <div className={cn("w-full rounded-full bg-muted overflow-hidden", barHeight)}>
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}