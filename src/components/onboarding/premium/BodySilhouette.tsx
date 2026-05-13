interface Props {
  bmi: number;
  sex?: "male" | "female" | "other";
}

export default function BodySilhouette({ bmi, sex = "male" }: Props) {
  // Scale torso width by bmi (clamped 18–40 → 0.85–1.4)
  const t = Math.max(0.85, Math.min(1.4, 0.85 + (bmi - 18) * 0.027));
  const stroke = "hsl(var(--primary))";
  const fill = "hsl(var(--primary) / 0.08)";
  return (
    <svg viewBox="0 0 100 200" className="h-44 w-auto">
      <g
        fill={fill}
        stroke={stroke}
        strokeWidth={1.2}
        strokeLinejoin="round"
        style={{ transition: "transform 0.6s ease" }}
      >
        <circle cx="50" cy="22" r="12" />
        <path
          d={`M ${50 - 18 * t} 42
              Q ${50 - 22 * t} 70 ${50 - 16 * t} 110
              L ${50 - 10} 180
              L ${50 - 2} 180
              L ${50 - 4} 115
              L ${50 + 4} 115
              L ${50 + 2} 180
              L ${50 + 10} 180
              L ${50 + 16 * t} 110
              Q ${50 + 22 * t} 70 ${50 + 18 * t} 42 Z`}
        />
      </g>
    </svg>
  );
}
