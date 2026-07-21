/**
 * Chart: flat plateau vs stacked compounding curves.
 * Clean layout — curves on the left, legend on the right, no overlap.
 */
const SERIES = [
  { label: "Unpaired — plateau", stroke: "hsl(0 0% 60%)", dashed: true, end: { x: 260, y: 108 } },
  { label: "+ FAST + FUEL", stroke: "hsl(174 72% 50%)", end: { x: 260, y: 78 } },
  { label: "+ TRACK", stroke: "hsl(0 0% 92%)", end: { x: 260, y: 52 } },
  { label: "+ RESTORE — full", stroke: "hsl(var(--primary))", end: { x: 260, y: 24 }, glow: true },
];

function curvePath(endY: number) {
  // start at (30, 130), gently sweep to (260, endY)
  const midX = 145;
  const midY = 130 - (130 - endY) * 0.35;
  return `M 30 130 Q ${midX} ${midY}, 260 ${endY}`;
}

export default function PlateauVsCompound() {
  return (
    <svg
      viewBox="0 0 340 220"
      className="w-full max-w-[360px]"
      role="img"
      aria-label="Four levers compound results chart"
    >
      {/* subtle grid */}
      {[40, 70, 100, 130].map((y) => (
        <line
          key={y}
          x1="30"
          y1={y}
          x2="260"
          y2={y}
          stroke="white"
          strokeOpacity="0.05"
        />
      ))}

      {/* axes */}
      <line x1="30" y1="140" x2="260" y2="140" stroke="white" strokeOpacity="0.2" />
      <line x1="30" y1="20" x2="30" y2="140" stroke="white" strokeOpacity="0.2" />

      {/* axis labels */}
      <text x="30" y="158" fill="white" fillOpacity="0.4" fontSize="8" letterSpacing="1">
        WEEK 1
      </text>
      <text x="260" y="158" fill="white" fillOpacity="0.4" fontSize="8" letterSpacing="1" textAnchor="end">
        WEEK 12
      </text>
      <text
        x="18"
        y="80"
        fill="white"
        fillOpacity="0.4"
        fontSize="8"
        letterSpacing="1"
        transform="rotate(-90 18 80)"
        textAnchor="middle"
      >
        RESULTS
      </text>

      {/* curves */}
      {SERIES.map((s, i) => (
        <g key={s.label}>
          <path
            d={curvePath(s.end.y)}
            fill="none"
            stroke={s.stroke}
            strokeWidth={s.glow ? 3 : 2.25}
            strokeLinecap="round"
            strokeDasharray={s.dashed ? "3 4" : undefined}
            opacity={s.dashed ? 0.55 : 0.95}
            style={s.glow ? { filter: "drop-shadow(0 0 6px hsl(var(--primary)/0.7))" } : undefined}
          />
          {!s.dashed && (
            <circle cx={s.end.x} cy={s.end.y} r={s.glow ? 4 : 2.5} fill={s.stroke} />
          )}
        </g>
      ))}

      {/* legend — clean, right-aligned, off the curves */}
      <g transform="translate(30 180)">
        {SERIES.map((s, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = col * 160;
          const y = row * 16;
          return (
            <g key={s.label} transform={`translate(${x} ${y})`}>
              <line
                x1="0"
                y1="0"
                x2="14"
                y2="0"
                stroke={s.stroke}
                strokeWidth={s.glow ? 3 : 2.25}
                strokeLinecap="round"
                strokeDasharray={s.dashed ? "3 3" : undefined}
              />
              <text
                x="20"
                y="3"
                fill="white"
                fillOpacity={s.dashed ? 0.55 : 0.9}
                fontSize="9"
                fontWeight={s.glow ? 700 : 500}
              >
                {s.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}