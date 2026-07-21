/**
 * Animated SVG: flat plateau line vs compounding curve.
 * Used on the "Why Pairing Matters" slide.
 */
export default function PlateauVsCompound() {
  return (
    <svg viewBox="0 0 320 180" className="w-full max-w-[340px]">
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

      {/* FAST + FUEL curve */}
      <path
        d="M 20 130 Q 90 122, 150 100 T 300 60"
        fill="none"
        stroke="hsl(174 72% 50%)"
        strokeOpacity="0.75"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <text x="215" y="78" fill="hsl(174 72% 50%)" fillOpacity="0.9" fontSize="9">
        FAST + FUEL
      </text>

      {/* + TRACK curve */}
      <path
        d="M 20 132 Q 100 120, 160 88 T 300 40"
        fill="none"
        stroke="hsl(0 0% 92%)"
        strokeOpacity="0.85"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
      <text x="205" y="55" fill="white" fillOpacity="0.85" fontSize="9">
        + TRACK
      </text>

      {/* + RESTORE — full compound curve */}
      <path
        d="M 20 134 Q 100 118, 165 78 T 300 18"
        fill="none"
        stroke="url(#curveGrad)"
        strokeWidth="3.75"
        strokeLinecap="round"
      />
      <circle cx="300" cy="18" r="5" fill="hsl(var(--primary))" />
      <text x="150" y="35" fill="white" fillOpacity="0.98" fontSize="11" fontWeight="700">
        + RESTORE — full compound
      </text>
    </svg>
  );
}