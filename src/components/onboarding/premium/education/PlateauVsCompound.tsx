/**
 * Clean 4-line chart: plateau vs FAST+FUEL vs +TRACK vs +RESTORE (full compound).
 * Labels live in an external legend below the plot — no overlapping text.
 */
export default function PlateauVsCompound() {
  const lines = [
    { label: "Unpaired", color: "hsl(0 0% 55%)", dash: "4 4", d: "M 40 150 Q 120 145, 200 148 T 360 150" },
    { label: "FAST + FUEL", color: "hsl(174 72% 55%)", d: "M 40 152 Q 140 138, 220 116 T 360 82" },
    { label: "+ TRACK", color: "hsl(0 0% 95%)", d: "M 40 154 Q 150 132, 230 96 T 360 52" },
    { label: "+ RESTORE", color: "hsl(var(--primary))", d: "M 40 156 Q 160 128, 240 78 T 360 24", width: 3.5 },
  ];

  return (
    <div className="w-full max-w-[380px]">
      <svg viewBox="0 0 380 190" className="w-full">
        {/* frame */}
        <line x1="40" y1="170" x2="365" y2="170" stroke="white" strokeOpacity="0.15" />
        <line x1="40" y1="20" x2="40" y2="170" stroke="white" strokeOpacity="0.15" />

        {/* axis labels */}
        <text x="40" y="185" fill="white" fillOpacity="0.4" fontSize="9">
          Week 1
        </text>
        <text x="335" y="185" fill="white" fillOpacity="0.4" fontSize="9">
          Week 12
        </text>
        <text
          x="15"
          y="95"
          fill="white"
          fillOpacity="0.4"
          fontSize="9"
          transform="rotate(-90 15 95)"
          textAnchor="middle"
        >
          Results
        </text>

        {lines.map((l) => (
          <path
            key={l.label}
            d={l.d}
            fill="none"
            stroke={l.color}
            strokeWidth={l.width ?? 2.5}
            strokeLinecap="round"
            strokeDasharray={l.dash}
          />
        ))}

        {/* endpoint dot on full compound */}
        <circle cx="360" cy="24" r="4" fill="hsl(var(--primary))" />
      </svg>

      {/* legend */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 px-2">
        {lines.map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <span
              className="inline-block h-[3px] w-5 rounded-full"
              style={{ background: l.color, opacity: l.dash ? 0.6 : 1 }}
            />
            <span className="text-[11px] text-white/80">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}