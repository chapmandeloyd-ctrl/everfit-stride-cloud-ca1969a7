import { useEffect, useState } from "react";

/**
 * Animated SVG: two metabolic rings that drift apart (separated)
 * or interlock (combined). Pulses red+teal at intersection when locked.
 */
export default function InterlockingRings({
  mode = "locked",
  size = 240,
}: {
  mode?: "separated" | "locked";
  size?: number;
}) {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (mode !== "locked") return;
    const id = setInterval(() => setPulse((p) => !p), 1400);
    return () => clearInterval(id);
  }, [mode]);

  const offset = mode === "locked" ? 32 : 70;
  const r = 46;
  const trackColor = "hsl(0 0% 92%)";
  const restoreColor = "hsl(250 65% 68%)";

  return (
    <svg
      width={size}
      height={size * 0.7}
      viewBox="0 0 240 168"
      className="drop-shadow-[0_0_40px_hsl(var(--primary)/0.25)]"
    >
      <defs>
        <radialGradient id="redGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tealGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(174 72% 50%)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="hsl(174 72% 50%)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {mode === "locked" && (
        <circle
          cx="120"
          cy="84"
          r={pulse ? 32 : 22}
          fill="white"
          opacity={pulse ? 0.18 : 0.08}
          style={{ transition: "all 1.2s ease-in-out" }}
        />
      )}

      {/* FAST — top left */}
      <circle
        cx={120 - offset}
        cy={84 - offset * 0.55}
        r={r}
        fill="url(#redGrad)"
        style={{ transition: "cx 0.8s ease-in-out" }}
      />
      <circle
        cx={120 - offset}
        cy={84 - offset * 0.55}
        r={r}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        opacity="0.9"
        style={{ transition: "cx 0.8s ease-in-out" }}
      />
      <text
        x={120 - offset}
        y={88 - offset * 0.55}
        textAnchor="middle"
        fill="white"
        fontSize="11"
        fontWeight="600"
        letterSpacing="1"
        opacity="0.85"
      >
        FAST
      </text>

      {/* FUEL — top right */}
      <circle
        cx={120 + offset}
        cy={84 - offset * 0.55}
        r={r}
        fill="url(#tealGrad)"
        style={{ transition: "cx 0.8s ease-in-out" }}
      />
      <circle
        cx={120 + offset}
        cy={84 - offset * 0.55}
        r={r}
        fill="none"
        stroke="hsl(174 72% 50%)"
        strokeWidth="2.5"
        opacity="0.9"
        style={{ transition: "cx 0.8s ease-in-out" }}
      />
      <text
        x={120 + offset}
        y={88 - offset * 0.55}
        textAnchor="middle"
        fill="white"
        fontSize="11"
        fontWeight="600"
        letterSpacing="1"
        opacity="0.85"
      >
        FUEL
      </text>

      {/* TRACK — bottom left */}
      <circle
        cx={120 - offset}
        cy={84 + offset * 0.55}
        r={r}
        fill="none"
        stroke={trackColor}
        strokeWidth="2.5"
        opacity="0.85"
      />
      <text
        x={120 - offset}
        y={88 + offset * 0.55}
        textAnchor="middle"
        fill="white"
        fontSize="11"
        fontWeight="600"
        letterSpacing="1"
        opacity="0.85"
      >
        TRACK
      </text>

      {/* RESTORE — bottom right */}
      <circle
        cx={120 + offset}
        cy={84 + offset * 0.55}
        r={r}
        fill="none"
        stroke={restoreColor}
        strokeWidth="2.5"
        opacity="0.85"
      />
      <text
        x={120 + offset}
        y={88 + offset * 0.55}
        textAnchor="middle"
        fill="white"
        fontSize="11"
        fontWeight="600"
        letterSpacing="1"
        opacity="0.85"
      >
        RESTORE
      </text>
    </svg>
  );
}