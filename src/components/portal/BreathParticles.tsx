import { useEffect, useRef } from "react";

export type BreathParticleStyle = "soft" | "pulse" | "aurora";

interface Props {
  style: BreathParticleStyle;
  /** 0..1 phase progress for "pulse" mode (drives expand/contract). Optional. */
  breathProgress?: number;
  /** "inhale" | "exhale" | "hold" — drives pulse direction. Optional. */
  phase?: "inhale" | "exhale" | "hold";
  className?: string;
}

/**
 * BreathParticles — canvas particle field rendered inside the circular preview.
 * Three styles for the user to compare:
 *  - "soft":   gentle white/blue dots drifting slowly (matches EXHALE screenshot)
 *  - "pulse":  particles expand on inhale / contract on exhale (synced to demo rhythm)
 *  - "aurora": flowing soft light curtains in blue/purple
 */
export function BreathParticles({ style, breathProgress = 0.5, phase = "inhale", className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phase);
  const progressRef = useRef(breathProgress);

  useEffect(() => {
    phaseRef.current = phase;
    progressRef.current = breathProgress;
  }, [phase, breathProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const w = () => canvas.getBoundingClientRect().width;
    const h = () => canvas.getBoundingClientRect().height;

    // ---------- Particle pools ----------
    type Dot = { x: number; y: number; r: number; a: number; vx: number; vy: number; baseR: number };
    const dots: Dot[] = [];
    const N = style === "soft" ? 70 : style === "pulse" ? 90 : 0;
    for (let i = 0; i < N; i++) {
      const baseR = 0.6 + Math.random() * 1.8;
      dots.push({
        x: Math.random(),
        y: Math.random(),
        r: baseR,
        baseR,
        a: 0.25 + Math.random() * 0.55,
        vx: (Math.random() - 0.5) * 0.00025,
        vy: -0.0001 - Math.random() * 0.0003,
      });
    }

    let t = 0;

    const draw = () => {
      const W = w();
      const H = h();
      ctx.clearRect(0, 0, W, H);
      t += 1 / 60;

      if (style === "soft") {
        // Drifting dots, no breath sync
        for (const d of dots) {
          d.x += d.vx;
          d.y += d.vy;
          if (d.y < -0.05) d.y = 1.05;
          if (d.x < -0.05) d.x = 1.05;
          if (d.x > 1.05) d.x = -0.05;
          const tw = 0.7 + Math.sin(t * 1.3 + d.x * 12) * 0.3;
          ctx.beginPath();
          ctx.fillStyle = `rgba(220, 235, 255, ${d.a * tw})`;
          ctx.arc(d.x * W, d.y * H, d.r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (style === "pulse") {
        // Particles emanate from center, expand on inhale / pull in on exhale
        const cx = W / 2;
        const cy = H / 2;
        const p = progressRef.current;
        const ph = phaseRef.current;
        // radial offset: inhale 0 → 1, hold ≈ 1, exhale 1 → 0
        const radial =
          ph === "inhale" ? p : ph === "exhale" ? 1 - p : 1;
        const maxR = Math.min(W, H) * 0.48;

        for (let i = 0; i < dots.length; i++) {
          const d = dots[i];
          // Distribute around center using stable angle from index
          const angle = (i / dots.length) * Math.PI * 2 + t * 0.05;
          const wobble = Math.sin(t * 1.1 + i) * 0.04;
          const rNorm = 0.15 + radial * 0.85 + wobble;
          const px = cx + Math.cos(angle) * maxR * rNorm * (0.6 + (i % 5) * 0.08);
          const py = cy + Math.sin(angle) * maxR * rNorm * (0.6 + (i % 5) * 0.08);
          const fade = 1 - rNorm * 0.4;
          ctx.beginPath();
          ctx.fillStyle = `rgba(190, 220, 255, ${d.a * fade})`;
          ctx.arc(px, py, d.baseR * (0.8 + radial * 0.6), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (style === "aurora") {
        // Flowing soft curtains — additive gradients
        ctx.globalCompositeOperation = "lighter";
        const bands = 3;
        for (let i = 0; i < bands; i++) {
          const phase = t * 0.4 + i * 1.7;
          const cx = W * (0.3 + 0.4 * Math.sin(phase));
          const cy = H * (0.45 + 0.15 * Math.cos(phase * 0.8));
          const radius = Math.min(W, H) * (0.45 + 0.1 * Math.sin(phase * 0.7));
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
          const hueA = i === 0 ? "120, 170, 240" : i === 1 ? "160, 140, 230" : "100, 200, 220";
          grad.addColorStop(0, `rgba(${hueA}, 0.35)`);
          grad.addColorStop(0.5, `rgba(${hueA}, 0.12)`);
          grad.addColorStop(1, `rgba(${hueA}, 0)`);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, H);
        }
        ctx.globalCompositeOperation = "source-over";

        // A few sparkles on top
        for (let i = 0; i < 25; i++) {
          const sx = ((i * 73 + t * 20) % W);
          const sy = ((i * 131 + t * 8) % H);
          ctx.beginPath();
          ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.2 * Math.sin(t * 2 + i)})`;
          ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [style]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
