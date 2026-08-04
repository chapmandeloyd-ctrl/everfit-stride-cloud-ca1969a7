import { formatDistanceToNowStrict, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";

interface IdleFastingHeroProps {
  centerImageSrc: string;
  /** ISO timestamp of the last fast that ended, if any */
  lastFastEndedAt?: string | null;
  /** Hours of that last logged fast, if known */
  lastFastHours?: number | null;
  /** Small caption under the ring, e.g. "No plan yet" */
  statusLabel?: string;
  /** Hours the ring represents (default 16) — used only to place stage dots */
  targetHours?: number;
  compact?: boolean;
}

/** Same stage set / colors as the live FastingTimer ring, shown dimmed while idle. */
const STAGES = [
  { hour: 0, label: "Anabolic", icon: "🔴" },
  { hour: 2, label: "Catabolic", icon: "🟠" },
  { hour: 4, label: "Post-Absorptive", icon: "🟡" },
  { hour: 8, label: "Gluconeogenesis", icon: "🟢" },
  { hour: 12, label: "Metabolic Shift", icon: "🔵" },
  { hour: 14, label: "Partial Ketosis", icon: "🟣" },
  { hour: 16, label: "Fat Burning", icon: "🔥" },
  { hour: 18, label: "Growth Hormone", icon: "💪" },
  { hour: 24, label: "Autophagy", icon: "♻️" },
  { hour: 36, label: "Renewal", icon: "✨" },
  { hour: 48, label: "Immune Reset", icon: "🛡️" },
  { hour: 72, label: "Stem Cells", icon: "🧬" },
];

/**
 * Idle version of the lion timer ring — visually identical to the live
 * FastingTimer ring (same size, black band, white hairline, lion at 130%,
 * dimmed stage dots) but with no progress arc and no leading indicator.
 * Purely presentational — it never starts or ends a fast.
 */
export function IdleFastingHero({
  centerImageSrc,
  lastFastEndedAt,
  lastFastHours,
  statusLabel,
  targetHours = 16,
  compact = true,
}: IdleFastingHeroProps) {
  const size = compact ? 236 : 300;
  const bandWidth = compact ? 32 : 40;
  const radius = (size - bandWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const relevantStages = STAGES.filter((s) => s.hour <= targetHours);

  // Real elapsed time since the last logged fast. New clients get onboarding copy
  // instead of a stale/fabricated duration.
  let sinceLabel = "No fasts logged yet";
  if (lastFastEndedAt) {
    const ended = new Date(lastFastEndedAt);
    const mins = differenceInMinutes(new Date(), ended);
    const dur = mins < 1 ? "just now" : `${formatDistanceToNowStrict(ended)} ago`;
    sinceLabel =
      lastFastHours != null
        ? `Last fast ${Math.round(lastFastHours)}h · ${dur}`
        : `Last fast ${dur}`;
  }

  function stagePos(hour: number) {
    const angle = (Math.min(hour / targetHours, 1) * 360 - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {/* Idle readout — mirrors the elapsed block above the live ring */}
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "font-bold tabular-nums tracking-tight text-white/40 drop-shadow-lg",
            compact ? "text-[2.25rem] leading-none" : "text-4xl leading-none"
          )}
        >
          00:00:00
        </span>
        <span
          className={cn(
            "mt-1 font-bold uppercase tracking-wider text-white/50",
            compact ? "text-[9px]" : "text-[10px]"
          )}
        >
          Not fasting
        </span>
      </div>

      {/* Ring */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <img
          src={centerImageSrc}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 select-none object-contain opacity-90"
        />
        <svg width={size} height={size} className="relative z-10">
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="black" strokeWidth={bandWidth} opacity={0.85} />
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="white" strokeWidth={1.5} opacity={0.7} />
        </svg>

        {relevantStages.map((stage) => {
          const pos = stagePos(stage.hour);
          return (
            <div
              key={stage.hour}
              className={cn(
                "absolute z-10 flex items-center justify-center rounded-full bg-muted/60 opacity-40",
                compact ? "h-3.5 w-3.5 -ml-[7px] -mt-[7px]" : "h-4 w-4 -ml-2 -mt-2"
              )}
              style={{ left: pos.x, top: pos.y }}
              title={`${stage.label} (${stage.hour}h)`}
            >
              <span className={cn(compact ? "text-[8px]" : "text-[9px]", "grayscale")}>{stage.icon}</span>
            </div>
          );
        })}
      </div>

      {/* Since last fast — centered pill under the ring, same slot as the stage pill */}
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 backdrop-blur-sm">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">
          {sinceLabel}
        </span>
      </div>

      {statusLabel && (
        <p className="mt-2 text-center text-xs font-medium text-white/50">{statusLabel}</p>
      )}
    </div>
  );
}
