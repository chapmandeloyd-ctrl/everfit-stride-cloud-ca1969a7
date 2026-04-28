import lionLogo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

interface Props {
  opacity?: number;
  size?: string; // tailwind size, e.g. "w-[120%] h-[120%]"
  className?: string;
}

/**
 * Faint gold lion watermark used across the Editorial Black & Gold theme.
 * Place inside a relatively-positioned, overflow-hidden parent.
 */
export function LionWatermark({ opacity = 0.08, size = "w-[120%] h-[120%]", className }: Props) {
  return (
    <img
      src={lionLogo}
      alt=""
      aria-hidden
      className={cn("absolute inset-0 m-auto object-contain pointer-events-none", size, className)}
      style={{
        filter: "sepia(1) hue-rotate(-15deg) saturate(2.5) brightness(1.2)",
        opacity,
      }}
    />
  );
}
