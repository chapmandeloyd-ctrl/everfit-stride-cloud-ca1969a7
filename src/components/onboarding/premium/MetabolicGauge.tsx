interface Props {
  score: number; // 0-100
}

export default function MetabolicGauge({ score }: Props) {
  const angle = (Math.max(0, Math.min(100, score)) / 100) * 180;
  const r = 80;
  const cx = 100;
  const cy = 100;
  const rad = (Math.PI * (180 - angle)) / 180;
  const x = cx + r * Math.cos(rad);
  const y = cy - r * Math.sin(rad);

  const tier =
    score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Needs Support" : "High Strain";

  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-64">
        <defs>
          <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(0 80% 55%)" />
            <stop offset="50%" stopColor="hsl(43 90% 55%)" />
            <stop offset="100%" stopColor="hsl(142 70% 50%)" />
          </linearGradient>
        </defs>
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gauge)"
          strokeWidth={10}
          strokeLinecap="round"
        />
        <line
          x1={cx}
          y1={cy}
          x2={x}
          y2={y}
          stroke="hsl(var(--foreground))"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5} fill="hsl(var(--foreground))" />
      </svg>
      <div className="mt-3 text-center">
        <div className="text-4xl font-semibold tracking-tight">{score}</div>
        <div className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {tier}
        </div>
      </div>
    </div>
  );
}
