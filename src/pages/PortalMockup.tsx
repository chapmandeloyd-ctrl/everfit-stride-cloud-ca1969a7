import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import portalEarth from "@/assets/portal-earth.jpg";
import { BREATHING_EXERCISES } from "@/lib/breathingExercises";

/**
 * VISUAL MOCKUP — Portal + Breathing Scene Strip + Breath Pacing Ring
 * Route: /portal-mockup
 * Purpose: Preview the proposed UI before any DB or live integration.
 * Safe to delete entirely once a direction is chosen.
 */

type Scene = {
  id: string;
  name: string;
  emoji: string;
  hueBase: number;
  /** [inhale, hold, exhale, optional hold] in seconds */
  pattern: number[];
  /** Tailwind/CSS gradient (used as a placeholder for real video) */
  bg: string;
};

const EARTH_SCENE: Scene = {
  id: "earth",
  name: "Gold Earth",
  emoji: "🌍",
  hueBase: 42,
  pattern: [0, 0, 0],
  bg: "",
};

const BREATHING_SCENES: Scene[] = BREATHING_EXERCISES.map((ex) => ({
  id: ex.id,
  name: ex.name,
  emoji: ex.icon,
  hueBase: ex.tone.hueBase,
  pattern: ex.phases.map((p) => p.seconds),
  bg: `radial-gradient(circle at 50% 40%, hsl(${ex.tone.hueBase} 60% 35%) 0%, hsl(${ex.tone.hueBase} 70% 12%) 60%, hsl(${ex.tone.hueBase} 80% 4%) 100%)`,
}));

const ALL_SCENES: Scene[] = [EARTH_SCENE, ...BREATHING_SCENES];

export default function PortalMockup() {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string>(EARTH_SCENE.id);
  const active = ALL_SCENES.find((s) => s.id === activeId) ?? EARTH_SCENE;
  const isBreathing = active.id !== "earth";

  // Compute total breath cycle duration
  const cycleSeconds = useMemo(
    () => active.pattern.reduce((a, b) => a + b, 0),
    [active]
  );

  // Phase timer: drives the label (Inhale / Hold / Exhale)
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  useEffect(() => {
    if (!isBreathing) return;
    setPhaseIdx(0);
    setPhaseElapsed(0);
  }, [active.id, isBreathing]);

  useEffect(() => {
    if (!isBreathing) return;
    const interval = setInterval(() => {
      setPhaseElapsed((prev) => {
        const currentPhaseLen = active.pattern[phaseIdx] ?? 4;
        if (prev + 0.1 >= currentPhaseLen) {
          setPhaseIdx((p) => (p + 1) % active.pattern.length);
          return 0;
        }
        return prev + 0.1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isBreathing, active, phaseIdx]);

  const phaseLabel = useMemo(() => {
    if (!isBreathing) return "";
    const ex = BREATHING_EXERCISES.find((e) => e.id === active.id);
    return ex?.phases[phaseIdx]?.label ?? "";
  }, [active, phaseIdx, isBreathing]);

  // Build keyframes for the breath ring scale (1 = rest, 1.18 = full inhale)
  const ringKeyframes = useMemo(() => {
    if (!isBreathing) return { scale: [1, 1], opacity: [0.7, 0.7] };
    const ex = BREATHING_EXERCISES.find((e) => e.id === active.id);
    if (!ex) return { scale: [1, 1], opacity: [0.7, 0.7] };
    const scales: number[] = [];
    const opacities: number[] = [];
    ex.phases.forEach((p) => {
      if (p.type === "inhale") {
        scales.push(1.18);
        opacities.push(1);
      } else if (p.type === "exhale") {
        scales.push(1);
        opacities.push(0.55);
      } else {
        // hold — keep last value
        scales.push(scales[scales.length - 1] ?? 1);
        opacities.push(opacities[opacities.length - 1] ?? 0.7);
      }
    });
    // Start at rest
    return {
      scale: [1, ...scales],
      opacity: [0.55, ...opacities],
    };
  }, [active, isBreathing]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-hidden relative">
      {/* Ambient backdrop tinted by active scene */}
      <div
        className="absolute inset-0 transition-colors duration-1000"
        style={{
          background: isBreathing
            ? `radial-gradient(ellipse at center, hsl(${active.hueBase} 50% 8%) 0%, hsl(${active.hueBase} 40% 3%) 70%, hsl(220 30% 2%) 100%)`
            : "radial-gradient(ellipse at center, hsl(220 40% 8%) 0%, hsl(220 30% 3%) 70%, hsl(220 30% 2%) 100%)",
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Portal Mockup
        </div>
        <div className="w-12" />
      </div>

      {/* Portal stage */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 pt-6 pb-4">
        <div className="relative" style={{ width: 320, height: 320 }}>
          {/* Breath pacing ring — only when in a breathing scene */}
          <AnimatePresence>
            {isBreathing && (
              <motion.div
                key={active.id + "-ring"}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 pointer-events-none"
              >
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    boxShadow: `0 0 60px 8px hsl(${active.hueBase} 90% 60% / 0.35), inset 0 0 0 2px hsl(${active.hueBase} 90% 70% / 0.6)`,
                  }}
                  animate={ringKeyframes}
                  transition={{
                    duration: cycleSeconds,
                    repeat: Infinity,
                    ease: "easeInOut",
                    times: [
                      0,
                      ...active.pattern.map((_, i) => {
                        const sumSoFar = active.pattern
                          .slice(0, i + 1)
                          .reduce((a, b) => a + b, 0);
                        return sumSoFar / cycleSeconds;
                      }),
                    ],
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* The portal circle itself */}
          <div
            className="absolute inset-4 rounded-full overflow-hidden"
            style={{
              boxShadow: "0 0 80px hsl(0 0% 0% / 0.8), inset 0 0 40px hsl(0 0% 0% / 0.6)",
            }}
          >
            {/* Earth scene */}
            <AnimatePresence>
              {!isBreathing && (
                <motion.img
                  key="earth"
                  src={portalEarth}
                  alt="Gold Earth"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    rotate: 360,
                  }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{
                    opacity: { duration: 0.8 },
                    scale: { duration: 0.8 },
                    rotate: { duration: 120, repeat: Infinity, ease: "linear" },
                  }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </AnimatePresence>

            {/* Breathing scene placeholder (gradient stand-in for video) */}
            <AnimatePresence>
              {isBreathing && (
                <motion.div
                  key={active.id + "-bg"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0"
                  style={{ background: active.bg }}
                >
                  {/* Subtle moving glow inside the circle */}
                  <motion.div
                    className="absolute inset-0"
                    animate={{
                      background: [
                        `radial-gradient(circle at 30% 30%, hsl(${active.hueBase} 80% 55% / 0.4), transparent 60%)`,
                        `radial-gradient(circle at 70% 70%, hsl(${active.hueBase} 80% 55% / 0.4), transparent 60%)`,
                        `radial-gradient(circle at 30% 30%, hsl(${active.hueBase} 80% 55% / 0.4), transparent 60%)`,
                      ],
                    }}
                    transition={{ duration: cycleSeconds * 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {/* Center emoji as visual anchor (placeholder for real video) */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-7xl opacity-60 select-none">{active.emoji}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Scene title + phase label */}
        <div className="mt-6 text-center min-h-[60px]">
          <div className="text-lg font-medium tracking-wide">{active.name}</div>
          <AnimatePresence mode="wait">
            {isBreathing && (
              <motion.div
                key={phaseLabel + phaseIdx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 0.7, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-muted-foreground mt-1 uppercase tracking-[0.3em]"
              >
                {phaseLabel}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Scene Strip */}
      <div className="relative z-10 px-2 pb-8">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground text-center mb-3">
          Scenes
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 px-3 snap-x snap-mandatory scrollbar-none">
          {ALL_SCENES.map((scene) => {
            const isActive = scene.id === activeId;
            return (
              <button
                key={scene.id}
                onClick={() => setActiveId(scene.id)}
                className="snap-center flex-shrink-0 flex flex-col items-center gap-2 transition-all duration-300"
                style={{ width: 64 }}
              >
                <div
                  className={`relative rounded-full overflow-hidden transition-all duration-300 ${
                    isActive ? "scale-110" : "scale-100 opacity-60"
                  }`}
                  style={{
                    width: 56,
                    height: 56,
                    boxShadow: isActive
                      ? `0 0 20px hsl(${scene.hueBase} 90% 60% / 0.6), inset 0 0 0 2px hsl(${scene.hueBase} 90% 70%)`
                      : "inset 0 0 0 1px hsl(0 0% 100% / 0.1)",
                    background:
                      scene.id === "earth"
                        ? "radial-gradient(circle at 30% 30%, hsl(42 80% 55%), hsl(35 70% 25%))"
                        : `radial-gradient(circle at 30% 30%, hsl(${scene.hueBase} 70% 45%), hsl(${scene.hueBase} 70% 15%))`,
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">
                    {scene.emoji}
                  </div>
                </div>
                <div
                  className={`text-[10px] text-center leading-tight transition-opacity duration-300 ${
                    isActive ? "opacity-100" : "opacity-50"
                  }`}
                >
                  {scene.name.split(" ")[0]}
                </div>
              </button>
            );
          })}
        </div>
        <div className="text-[10px] text-muted-foreground text-center mt-3 opacity-70">
          Tap a scene · Visual mockup only · No real video / audio
        </div>
      </div>
    </div>
  );
}
