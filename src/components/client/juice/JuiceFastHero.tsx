import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatRemaining, juiceProgress, modeMeta, type JuiceFastSession } from "@/lib/juiceFast";

interface Props {
  session: JuiceFastSession;
  centerImageSrc: string;
  compact?: boolean;
}

/**
 * Day-based version of the lion ring. Same visual language as the live
 * FastingTimer, but the arc represents the whole multi-day juice fast
 * instead of a single fasting window. Purely presentational.
 */
export function JuiceFastHero({ session, centerImageSrc, compact = true }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { pct, dayNumber, remainingMs, elapsedHours } = juiceProgress(session, now);
  const meta = modeMeta(session.mode);

  const size = compact ? 236 : 300;
  const bandWidth = compact ? 32 : 40;
  const radius = (size - bandWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "font-bold tabular-nums tracking-tight text-white drop-shadow-lg",
            compact ? "text-[2.25rem] leading-none" : "text-4xl leading-none",
          )}
        >
          {formatRemaining(remainingMs)}
        </span>
        <span className={cn("mt-1 font-bold uppercase tracking-wider text-emerald-400", compact ? "text-[9px]" : "text-[10px]")}>
          {remainingMs > 0 ? "Juice fast remaining" : "Juice fast complete"}
        </span>
      </div>

      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <img
          src={centerImageSrc}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 select-none object-contain opacity-90"
        />
        <svg width={size} height={size} className="relative z-10 -rotate-90">
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="black" strokeWidth={bandWidth} opacity={0.85} />
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="white" strokeWidth={1.5} opacity={0.35} />
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={bandWidth * 0.42}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>

        {/* Day markers around the ring */}
        {Array.from({ length: session.planned_days }, (_, i) => {
          const angle = ((i / session.planned_days) * 360 - 90) * (Math.PI / 180);
          const x = cx + radius * Math.cos(angle);
          const y = cy + radius * Math.sin(angle);
          const passed = i < dayNumber;
          return (
            <div
              key={i}
              className={cn(
                "absolute z-20 flex h-4 w-4 -ml-2 -mt-2 items-center justify-center rounded-full text-[8px] font-bold",
                passed ? "bg-emerald-400 text-black" : "bg-muted/60 text-white/50",
              )}
              style={{ left: x, top: y }}
              title={`Day ${i + 1}`}
            >
              {i + 1}
            </div>
          );
        })}
      </div>

      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 backdrop-blur-sm">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">
          Day {dayNumber} of {session.planned_days}
        </span>
        <span className="text-white/25">·</span>
        <span className={cn("text-[10px] font-bold uppercase tracking-wider", meta.accent)}>{meta.label}</span>
      </div>

      <p className="mt-1 text-center text-xs font-medium text-white/50">
        {Math.floor(elapsedHours)}h in · {Math.round(pct * 100)}% complete
      </p>
    </div>
  );
}