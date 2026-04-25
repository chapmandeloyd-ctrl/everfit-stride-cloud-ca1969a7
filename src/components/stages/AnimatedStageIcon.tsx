import { cn } from "@/lib/utils";
import type { EnrichedStage } from "@/lib/fastingStagesEnriched";

interface Props {
  stage: EnrichedStage;
  size?: "sm" | "md" | "lg" | "xl";
  active?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "h-10 w-10 text-2xl",
  md: "h-14 w-14 text-3xl",
  lg: "h-20 w-20 text-4xl",
  xl: "h-28 w-28 text-6xl",
};

const motionMap: Record<EnrichedStage["motion"], string> = {
  pulse: "animate-[pulse_2.4s_ease-in-out_infinite]",
  float: "animate-[float_3.2s_ease-in-out_infinite]",
  spin: "animate-[spin_8s_linear_infinite]",
  bounce: "animate-[bounce_1.8s_ease-in-out_infinite]",
  glow: "animate-[glow_2.4s_ease-in-out_infinite]",
};

export function AnimatedStageIcon({ stage, size = "md", active = false, className }: Props) {
  return (
    <div
      className={cn(
        "relative shrink-0 rounded-full flex items-center justify-center overflow-hidden",
        sizeMap[size],
        className
      )}
      style={{
        background: `radial-gradient(circle at 30% 30%, ${stage.fromColor}, ${stage.toColor})`,
        boxShadow: active
          ? `0 0 24px ${stage.accent}66, 0 0 0 3px ${stage.accent}33`
          : `0 4px 12px ${stage.accent}33`,
      }}
    >
      {/* Soft halo */}
      <span
        className="absolute inset-0 rounded-full opacity-40"
        style={{ background: `radial-gradient(circle at 70% 80%, ${stage.toColor}, transparent 60%)` }}
      />
      {/* Animated emoji */}
      <span className={cn("relative drop-shadow-sm", motionMap[stage.motion])}>{stage.emoji}</span>
      {/* Active ring */}
      {active && (
        <span
          className="absolute -inset-1 rounded-full border-2 animate-[ping_2.4s_ease-in-out_infinite] pointer-events-none"
          style={{ borderColor: stage.accent }}
        />
      )}
    </div>
  );
}