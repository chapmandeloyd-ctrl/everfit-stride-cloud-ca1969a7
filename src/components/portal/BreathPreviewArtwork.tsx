import { useId } from "react";
import type { BreathingAnimation } from "@/lib/breathingExercises";

interface Props {
  animation: BreathingAnimation;
  progress: number;
  phaseType: "inhale" | "hold" | "exhale";
  hue: number;
  sat: number;
  time: number;
}

const VIEWBOX_SIZE = 300;
const CENTER = VIEWBOX_SIZE / 2;

export function BreathPreviewArtwork({ animation, progress, phaseType, hue, sat, time }: Props) {
  const id = useId().replace(/:/g, "");

  switch (animation) {
    case "ocean":
      return <OceanPreview id={id} progress={progress} phaseType={phaseType} hue={hue} sat={sat} time={time} />;
    case "lotus":
      return <LotusPreview id={id} progress={progress} phaseType={phaseType} hue={hue} sat={sat} time={time} />;
    case "orbital":
      return <OrbitalPreview id={id} progress={progress} phaseType={phaseType} hue={hue} sat={sat} time={time} />;
    case "aurora":
      return <AuroraPreview id={id} progress={progress} phaseType={phaseType} hue={hue} sat={sat} time={time} />;
    case "heartbeat":
    default:
      return <HeartbeatPreview id={id} progress={progress} phaseType={phaseType} hue={hue} sat={sat} time={time} />;
  }
}

function getBreathScale(phaseType: Props["phaseType"], progress: number, inhalePeak = 1.08, exhaleFloor = 0.94) {
  if (phaseType === "inhale") return 0.9 + progress * (inhalePeak - 0.9);
  if (phaseType === "exhale") return inhalePeak - progress * (inhalePeak - exhaleFloor);
  return inhalePeak;
}

function wavePath(baseY: number, amplitude: number, frequency: number, phase: number) {
  let d = `M -30 ${baseY}`;
  for (let x = -30; x <= 330; x += 4) {
    const y = baseY + Math.sin((x / VIEWBOX_SIZE) * Math.PI * frequency + phase) * amplitude;
    d += ` L ${x} ${y}`;
  }
  d += ` L 330 330 L -30 330 Z`;
  return d;
}

function sharedShell(id: string, hue: number, sat: number) {
  return (
    <defs>
      <radialGradient id={`${id}-baseGlow`} cx="50%" cy="42%" r="68%">
        <stop offset="0%" stopColor={`hsla(${hue}, ${Math.min(80, sat + 16)}%, 62%, 0.30)`} />
        <stop offset="52%" stopColor={`hsla(${hue}, ${sat}%, 26%, 0.18)`} />
        <stop offset="100%" stopColor={`hsla(${hue}, ${Math.max(18, sat - 18)}%, 8%, 0)`} />
      </radialGradient>
      <radialGradient id={`${id}-edgeShade`} cx="50%" cy="55%" r="78%">
        <stop offset="62%" stopColor="transparent" />
        <stop offset="100%" stopColor="rgba(0,0,0,0.28)" />
      </radialGradient>
    </defs>
  );
}

function OceanPreview({ id, progress, phaseType, hue, sat, time }: PreviewProps) {
  const breath = getBreathScale(phaseType, progress, 1.05, 0.97);
  const horizon = 182 - (breath - 1) * 32;

  return (
    <svg viewBox="0 0 300 300" className="h-full w-full" aria-hidden="true">
      {sharedShell(id, hue, sat)}
      <defs>
        <linearGradient id={`${id}-oceanFront`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`hsla(${hue + 8}, ${sat + 8}%, 74%, 0.26)`} />
          <stop offset="100%" stopColor={`hsla(${hue - 6}, ${sat - 8}%, 24%, 0.06)`} />
        </linearGradient>
        <linearGradient id={`${id}-oceanMid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`hsla(${hue + 14}, ${sat}%, 62%, 0.16)`} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <linearGradient id={`${id}-oceanBack`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`hsla(${hue - 10}, ${sat - 14}%, 58%, 0.10)`} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>

      <rect width="300" height="300" fill={`url(#${id}-baseGlow)`} />
      <ellipse cx="150" cy="118" rx="112" ry="86" fill={`hsla(${hue + 10}, ${sat + 6}%, 62%, 0.10)`} style={{ filter: "blur(24px)" }} />
      <path d={wavePath(horizon + 26, 12, 1.8, time * 0.55 + 1.6)} fill={`url(#${id}-oceanBack)`} />
      <path d={wavePath(horizon + 12, 18, 1.45, time * 0.72 + 0.9)} fill={`url(#${id}-oceanMid)`} />
      <path d={wavePath(horizon, 24, 1.18, time * 0.9 + 0.2)} fill={`url(#${id}-oceanFront)`} />
      <rect width="300" height="300" fill={`url(#${id}-edgeShade)`} />
    </svg>
  );
}

function LotusPreview({ id, progress, phaseType, hue, sat, time }: PreviewProps) {
  const breath = getBreathScale(phaseType, progress, 1.14, 0.92);
  const petals = Array.from({ length: 10 }, (_, index) => {
    const angle = (index / 10) * Math.PI * 2 + time * 0.22;
    const radius = 44 + Math.sin(time * 0.5 + index * 0.75) * 5;
    const cx = CENTER + Math.cos(angle) * radius * 0.46;
    const cy = CENTER + Math.sin(angle) * radius * 0.46;
    const petalLength = 88 * breath + Math.sin(time * 0.7 + index) * 5;

    return (
      <ellipse
        key={index}
        cx={cx}
        cy={cy}
        rx={petalLength * 0.34}
        ry={petalLength * 0.105}
        transform={`rotate(${(angle * 180) / Math.PI} ${cx} ${cy})`}
        fill={`hsla(${hue + index * 5 - 12}, ${sat - 4}%, 70%, ${0.14 + index * 0.004})`}
      />
    );
  });

  return (
    <svg viewBox="0 0 300 300" className="h-full w-full" aria-hidden="true">
      {sharedShell(id, hue, sat)}
      <defs>
        <radialGradient id={`${id}-lotusCore`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={`hsla(${hue + 8}, ${sat + 8}%, 76%, 0.44)`} />
          <stop offset="65%" stopColor={`hsla(${hue - 8}, ${sat - 8}%, 28%, 0.08)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <rect width="300" height="300" fill={`url(#${id}-baseGlow)`} />
      <g transform={`translate(${CENTER} ${CENTER}) scale(${breath}) translate(${-CENTER} ${-CENTER})`}>
        {petals}
      </g>
      <circle cx="150" cy="150" r={34 * breath} fill={`url(#${id}-lotusCore)`} />
      <circle cx="150" cy="150" r={10 + breath * 7} fill={`hsla(${hue + 12}, ${sat + 10}%, 84%, 0.22)`} />
      <rect width="300" height="300" fill={`url(#${id}-edgeShade)`} />
    </svg>
  );
}

function OrbitalPreview({ id, progress, phaseType, hue, sat, time }: PreviewProps) {
  const breath = getBreathScale(phaseType, progress, 1.1, 0.96);
  const rings = Array.from({ length: 4 }, (_, index) => {
    const rx = (56 + index * 24) * breath;
    const ry = rx * (0.42 + index * 0.035);
    const rotation = time * (20 + index * 8) + index * 38;

    return (
      <ellipse
        key={index}
        cx="150"
        cy="150"
        rx={rx}
        ry={ry}
        fill="none"
        stroke={`hsla(${hue + index * 10}, ${sat - index * 3}%, ${74 - index * 5}%, ${0.18 - index * 0.024})`}
        strokeWidth={2.6 - index * 0.38}
        transform={`rotate(${rotation} 150 150)`}
      />
    );
  });

  return (
    <svg viewBox="0 0 300 300" className="h-full w-full" aria-hidden="true">
      {sharedShell(id, hue, sat)}
      <defs>
        <radialGradient id={`${id}-orbGlow`} cx="50%" cy="50%" r="52%">
          <stop offset="0%" stopColor={`hsla(${hue + 10}, ${sat + 8}%, 82%, 0.26)`} />
          <stop offset="75%" stopColor={`hsla(${hue}, ${sat - 10}%, 30%, 0.05)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <rect width="300" height="300" fill={`url(#${id}-baseGlow)`} />
      <ellipse cx="150" cy="150" rx="118" ry="88" fill={`hsla(${hue + 6}, ${sat}%, 58%, 0.08)`} style={{ filter: "blur(22px)" }} />
      {rings}
      <circle cx="150" cy="150" r={18 * breath} fill={`url(#${id}-orbGlow)`} />
      <rect width="300" height="300" fill={`url(#${id}-edgeShade)`} />
    </svg>
  );
}

function AuroraPreview({ id, progress, phaseType, hue, sat, time }: PreviewProps) {
  const breath = getBreathScale(phaseType, progress, 1.08, 0.95);
  const ribbons = Array.from({ length: 4 }, (_, index) => {
    const x = 34 + index * 72 + Math.sin(time * 0.46 + index) * 12;
    const width = 56 + Math.cos(time * 0.35 + index) * 8;
    const top = -34;
    const bottom = 334;
    const swayLeft = x - width * (0.28 + Math.sin(time * 0.4 + index * 0.7) * 0.06);
    const swayRight = x + width * (0.34 + Math.cos(time * 0.5 + index * 0.8) * 0.06);

    return (
      <path
        key={index}
        d={`M ${x} ${top} C ${swayLeft} 78, ${swayRight} 224, ${x + Math.sin(time * 0.55 + index) * 18} ${bottom}`}
        stroke={`hsla(${hue - 16 + index * 10}, ${sat + 6}%, ${72 - index * 4}%, ${0.16 + index * 0.018})`}
        strokeWidth={width * breath}
        fill="none"
        strokeLinecap="round"
        style={{ filter: `blur(${18 + index * 2}px)` }}
      />
    );
  });

  return (
    <svg viewBox="0 0 300 300" className="h-full w-full" aria-hidden="true">
      {sharedShell(id, hue, sat)}
      <rect width="300" height="300" fill={`url(#${id}-baseGlow)`} />
      <ellipse cx="150" cy="140" rx="132" ry="112" fill={`hsla(${hue - 12}, ${sat + 6}%, 62%, 0.08)`} style={{ filter: "blur(30px)" }} />
      {ribbons}
      <rect width="300" height="300" fill={`url(#${id}-edgeShade)`} />
    </svg>
  );
}

function HeartbeatPreview({ id, progress, phaseType, hue, sat, time }: PreviewProps) {
  const breath = getBreathScale(phaseType, progress, 1.12, 0.92);
  const rings = Array.from({ length: 4 }, (_, index) => {
    const radius = (30 + index * 26) * breath + Math.sin(time * 1.6 - index * 0.45) * 2;

    return (
      <circle
        key={index}
        cx="150"
        cy="150"
        r={radius}
        fill="none"
        stroke={`hsla(${hue + index * 4}, ${sat - index * 2}%, ${76 - index * 5}%, ${0.22 - index * 0.04})`}
        strokeWidth={2.6 - index * 0.38}
      />
    );
  });

  return (
    <svg viewBox="0 0 300 300" className="h-full w-full" aria-hidden="true">
      {sharedShell(id, hue, sat)}
      <defs>
        <radialGradient id={`${id}-heartCore`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor={`hsla(${hue + 6}, ${sat + 10}%, 82%, 0.34)`} />
          <stop offset="72%" stopColor={`hsla(${hue - 4}, ${sat - 8}%, 34%, 0.06)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <rect width="300" height="300" fill={`url(#${id}-baseGlow)`} />
      <circle cx="150" cy="150" r="92" fill={`url(#${id}-heartCore)`} />
      {rings}
      <circle cx="150" cy="150" r={16 * breath} fill={`hsla(${hue + 8}, ${sat + 10}%, 82%, 0.20)`} />
      <rect width="300" height="300" fill={`url(#${id}-edgeShade)`} />
    </svg>
  );
}

interface PreviewProps {
  id: string;
  progress: number;
  phaseType: Props["phaseType"];
  hue: number;
  sat: number;
  time: number;
}