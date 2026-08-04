import { formatDistanceToNowStrict } from "date-fns";

interface IdleFastingHeroProps {
  centerImageSrc: string;
  /** ISO timestamp of the last fast that ended, if any */
  lastFastEndedAt?: string | null;
  /** Small caption under the ring, e.g. "No plan yet" */
  statusLabel?: string;
  accent?: string;
}

/**
 * Idle version of the lion timer ring. Purely presentational — it never starts
 * or ends a fast. Used so the timer is always the hero of the dashboard, even
 * before a plan exists.
 */
export function IdleFastingHero({
  centerImageSrc,
  lastFastEndedAt,
  statusLabel,
  accent = "hsl(var(--primary))",
}: IdleFastingHeroProps) {
  const size = 240;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = size / 2;

  const since = lastFastEndedAt
    ? formatDistanceToNowStrict(new Date(lastFastEndedAt))
    : null;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={stroke}
          />
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={accent}
            strokeOpacity={0.45}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * r * 0.04} ${2 * Math.PI * r}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <img
            src={centerImageSrc}
            alt=""
            className="h-24 w-24 object-contain opacity-70"
          />
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
            Not fasting
          </p>
          <p className="mt-0.5 text-lg font-black text-white">
            {since ? `${since} since last fast` : "Ready when you are"}
          </p>
        </div>
      </div>
      {statusLabel && (
        <p className="mt-2 text-xs font-medium text-white/50">{statusLabel}</p>
      )}
    </div>
  );
}
