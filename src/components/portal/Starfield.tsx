import { useMemo } from "react";

/**
 * Lightweight procedural starfield with 3 parallax depth layers and
 * occasional shooting stars. Pure CSS — no canvas, no images.
 */
interface StarfieldProps {
  /** Number of small stars (default 80) */
  density?: number;
  /** Show occasional shooting stars (default true) */
  shootingStars?: boolean;
}

interface Star {
  top: string;
  left: string;
  size: number;
  delay: string;
  duration: string;
  opacity: number;
}

function makeStars(count: number, sizeMin: number, sizeMax: number): Star[] {
  return Array.from({ length: count }, () => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: sizeMin + Math.random() * (sizeMax - sizeMin),
    delay: `${Math.random() * 6}s`,
    duration: `${3 + Math.random() * 4}s`,
    opacity: 0.4 + Math.random() * 0.6,
  }));
}

export function Starfield({ density = 80, shootingStars = true }: StarfieldProps) {
  // Memoize so stars don't reshuffle on re-renders
  const farStars = useMemo(() => makeStars(Math.round(density * 0.6), 0.6, 1.2), [density]);
  const midStars = useMemo(() => makeStars(Math.round(density * 0.3), 1.2, 2), [density]);
  const nearStars = useMemo(() => makeStars(Math.round(density * 0.1), 1.8, 2.8), [density]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Far layer — tiny, dim, slow twinkle */}
      {farStars.map((s, i) => (
        <span
          key={`f${i}`}
          className="absolute rounded-full bg-white"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            opacity: s.opacity * 0.6,
            animation: `portalTwinkle ${s.duration} ease-in-out ${s.delay} infinite`,
          }}
        />
      ))}
      {/* Mid layer */}
      {midStars.map((s, i) => (
        <span
          key={`m${i}`}
          className="absolute rounded-full bg-white"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            opacity: s.opacity * 0.85,
            boxShadow: "0 0 4px rgba(255,255,255,0.5)",
            animation: `portalTwinkle ${s.duration} ease-in-out ${s.delay} infinite`,
          }}
        />
      ))}
      {/* Near layer — brighter with halo */}
      {nearStars.map((s, i) => (
        <span
          key={`n${i}`}
          className="absolute rounded-full bg-white"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            boxShadow:
              "0 0 6px rgba(255,255,255,0.85), 0 0 12px rgba(180,210,255,0.4)",
            animation: `portalTwinkle ${s.duration} ease-in-out ${s.delay} infinite`,
          }}
        />
      ))}

      {/* Shooting stars — 2 staggered streaks */}
      {shootingStars && (
        <>
          <span
            className="absolute block"
            style={{
              top: "18%",
              left: "-10%",
              width: 140,
              height: 1.5,
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)",
              transform: "rotate(20deg)",
              borderRadius: 9999,
              filter: "drop-shadow(0 0 4px rgba(255,255,255,0.6))",
              animation: "portalShoot1 11s ease-in 2s infinite",
              opacity: 0,
            }}
          />
          <span
            className="absolute block"
            style={{
              top: "58%",
              left: "-10%",
              width: 110,
              height: 1.2,
              background:
                "linear-gradient(90deg, transparent, rgba(200,220,255,0.9), transparent)",
              transform: "rotate(15deg)",
              borderRadius: 9999,
              filter: "drop-shadow(0 0 3px rgba(180,210,255,0.6))",
              animation: "portalShoot2 17s ease-in 8s infinite",
              opacity: 0,
            }}
          />
        </>
      )}

      <style>{`
        @keyframes portalTwinkle {
          0%, 100% { opacity: var(--tw-opacity, 1); transform: scale(1); }
          50% { opacity: 0.25; transform: scale(0.85); }
        }
        @keyframes portalShoot1 {
          0% { transform: translate(0, 0) rotate(20deg); opacity: 0; }
          5% { opacity: 1; }
          25% { transform: translate(120vw, 40vh) rotate(20deg); opacity: 0; }
          100% { transform: translate(120vw, 40vh) rotate(20deg); opacity: 0; }
        }
        @keyframes portalShoot2 {
          0% { transform: translate(0, 0) rotate(15deg); opacity: 0; }
          5% { opacity: 1; }
          22% { transform: translate(120vw, 30vh) rotate(15deg); opacity: 0; }
          100% { transform: translate(120vw, 30vh) rotate(15deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
