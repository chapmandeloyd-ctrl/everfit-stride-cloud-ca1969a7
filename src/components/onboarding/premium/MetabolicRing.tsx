interface Props {
  size?: number;
  progress?: number; // 0-100
  label?: string;
  sublabel?: string;
}

export default function MetabolicRing({
  size = 220,
  progress = 72,
  label,
  sublabel,
}: Props) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const offset = c - (progress / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ksomring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(174 72% 50%)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="hsl(var(--border))"
          strokeOpacity={0.2}
          strokeWidth={6}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ksomring)"
          strokeWidth={6}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label && (
          <div className="text-4xl font-semibold tracking-tight text-foreground">
            {label}
          </div>
        )}
        {sublabel && (
          <div className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {sublabel}
          </div>
        )}
      </div>
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          boxShadow: "0 0 80px hsl(var(--primary) / 0.25)",
        }}
      />
    </div>
  );
}
