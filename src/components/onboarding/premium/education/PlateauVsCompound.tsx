/**
 * Animated SVG: flat plateau line vs compounding curve.
 * Used on the "Why Pairing Matters" slide.
 */
export default function PlateauVsCompound() {
  return (
    <svg viewBox="0 0 320 160" className="w-full max-w-[320px]">
      <defs>
        <linearGradient id="curveGrad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="hsl(174 72% 50%)" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>

      {/* axes */}
      <line x1="20" y1="140" x2="310" y2="140" stroke="white" strokeOpacity="0.15" />
      <line x1="20" y1="20" x2="20" y2="140" stroke="white" strokeOpacity="0.15" />

      {/* flat plateau */}
      <path
        d="M 20 110 Q 80 95, 140 100 T 300 105"
        fill="none"
        stroke="white"
        strokeOpacity="0.35"
        strokeWidth="2.5"
        strokeDasharray="4 4"
      />
      <text x="200" y="95" fill="white" fillOpacity="0.5" fontSize="10">
        Unpaired — plateau
      </text>

      {/* compounding curve */}
      <path
        d="M 20 130 Q 90 125, 150 95 T 300 30"
        fill="none"
        stroke="url(#curveGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="300" cy="30" r="5" fill="hsl(var(--primary))" />
      <text x="180" y="55" fill="white" fillOpacity="0.95" fontSize="11" fontWeight="600">
        Synergy — compounds
      </text>
    </svg>
  );
}