interface Props {
  bmi: number;
  sex: "male" | "female";
}

export default function BodySilhouette({ bmi, sex }: Props) {
  // Scale torso width by bmi (clamped 18–40 → 0.85–1.4)
  const t = Math.max(0.85, Math.min(1.4, 0.85 + (bmi - 18) * 0.027));
  const stroke = "hsl(var(--primary))";
  const fill = "hsl(var(--primary) / 0.08)";

  if (sex === "female") {
    return (
      <svg viewBox="0 0 100 200" className="h-44 w-auto">
        <g
          fill={fill}
          stroke={stroke}
          strokeWidth={1.2}
          strokeLinejoin="round"
          style={{ transition: "transform 0.6s ease" }}
        >
          {/* Head */}
          <circle cx="50" cy="22" r="12" />
          {/* Shoulders / bust tapering to waist, then flared hips */}
          <path
            d={`M ${50 - 12 * t} 42
                L ${50 - 16 * t} 68
                Q ${50 - 9 * t} 82 ${50 - 12 * t} 98
                L ${50 - 18 * t} 120
                L ${50 - 11} 180
                L ${50 - 3} 180
                L ${50 - 5} 125
                L ${50 + 5} 125
                L ${50 + 3} 180
                L ${50 + 11} 180
                L ${50 + 18 * t} 120
                Q ${50 + 9 * t} 82 ${50 + 16 * t} 68
                L ${50 + 12 * t} 42 Z`}
          />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 200" className="h-44 w-auto">
      <g
        fill={fill}
        stroke={stroke}
        strokeWidth={1.2}
        strokeLinejoin="round"
        style={{ transition: "transform 0.6s ease" }}
      >
        {/* Head */}
        <circle cx="50" cy="22" r="12" />
        {/* Broad shoulders, tapered torso, straight legs */}
        <path
          d={`M ${50 - 20 * t} 42
              L ${50 - 16 * t} 70
              L ${50 - 12 * t} 105
              L ${50 - 10} 180
              L ${50 - 2} 180
              L ${50 - 4} 115
              L ${50 + 4} 115
              L ${50 + 2} 180
              L ${50 + 10} 180
              L ${50 + 12 * t} 105
              L ${50 + 16 * t} 70
              L ${50 + 20 * t} 42 Z`}
        />
      </g>
    </svg>
  );
}
