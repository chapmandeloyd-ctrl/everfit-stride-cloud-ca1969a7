import { useEffect, useRef } from "react";

interface CoachWaveformProps {
  compact?: boolean;
}

export function CoachWaveform({ compact = false }: CoachWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    const draw = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width * ratio));
      const height = Math.max(1, Math.floor(rect.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.clearRect(0, 0, width, height);
      const bars = compact ? 30 : 48;
      const gap = compact ? 3 : 5;
      const barWidth = Math.max(2, (width - gap * (bars - 1)) / bars);
      const time = Date.now() / 230;
      for (let index = 0; index < bars; index += 1) {
        const center = Math.abs(index - bars / 2) / (bars / 2);
        const pulse = (Math.sin(time + index * 0.62) + Math.sin(time * 0.63 + index * 0.31) + 2) / 4;
        const barHeight = Math.max(6 * ratio, height * (0.18 + pulse * 0.7) * (1 - center * 0.34));
        const x = index * (barWidth + gap);
        const y = (height - barHeight) / 2;
        const hue = (index / bars) * 220 + (Date.now() / 38) % 360;
        const gradient = context.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, `hsla(${hue}, 95%, 65%, .95)`);
        gradient.addColorStop(1, `hsla(${(hue + 150) % 360}, 95%, 55%, .75)`);
        context.fillStyle = gradient;
        context.shadowColor = `hsla(${hue}, 95%, 60%, .65)`;
        context.shadowBlur = compact ? 4 : 12;
        context.beginPath();
        context.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        context.fill();
      }
      context.shadowBlur = 0;
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [compact]);

  return <canvas ref={canvasRef} className={compact ? "h-8 w-32" : "h-28 w-full max-w-xl"} aria-hidden="true" />;
}