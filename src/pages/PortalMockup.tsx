import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, X, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import portalEarth from "@/assets/portal-earth.jpg";
import { BREATHING_EXERCISES } from "@/lib/breathingExercises";

/**
 * VISUAL MOCKUP — Portal scene exploration
 * Route: /portal-mockup
 * Lets you toggle between 3 design scenarios. No DB, no real video, no audio.
 */

type Scene = {
  id: string;
  name: string;
  emoji: string;
  hueBase: number;
  pattern: number[];
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

type Variant = "v1" | "v2" | "v3";

const VARIANTS: { id: Variant; name: string; tagline: string }[] = [
  { id: "v1", name: "Earth + Strip + Ring", tagline: "Gold Earth default · scene strip · breath ring around circle" },
  { id: "v2", name: "Breathing Only", tagline: "No Earth · scenes are the portal · pure cinematic, no ring" },
  { id: "v3", name: "Tap-to-Pick + Phase Text", tagline: "Earth default · tap portal opens picker · video + Inhale/Hold/Exhale text only" },
];

export default function PortalMockup() {
  const navigate = useNavigate();
  const [variant, setVariant] = useState<Variant>("v1");

  // Scene list & default depend on variant
  const sceneList = variant === "v2" ? BREATHING_SCENES : [EARTH_SCENE, ...BREATHING_SCENES];
  const defaultId = variant === "v2" ? BREATHING_SCENES[0].id : EARTH_SCENE.id;
  const [activeId, setActiveId] = useState<string>(defaultId);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Reset active scene when variant changes
  useEffect(() => {
    setActiveId(variant === "v2" ? BREATHING_SCENES[0].id : EARTH_SCENE.id);
    setPickerOpen(false);
  }, [variant]);

  const active = sceneList.find((s) => s.id === activeId) ?? sceneList[0];
  const isBreathing = active.id !== "earth";

  const cycleSeconds = useMemo(
    () => active.pattern.reduce((a, b) => a + b, 0) || 1,
    [active]
  );

  // Phase ticker
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  useEffect(() => {
    setPhaseIdx(0);
    setPhaseElapsed(0);
  }, [active.id]);
  useEffect(() => {
    if (!isBreathing) return;
    const i = setInterval(() => {
      setPhaseElapsed((prev) => {
        const len = active.pattern[phaseIdx] ?? 4;
        if (prev + 0.1 >= len) {
          setPhaseIdx((p) => (p + 1) % active.pattern.length);
          return 0;
        }
        return prev + 0.1;
      });
    }, 100);
    return () => clearInterval(i);
  }, [isBreathing, active, phaseIdx]);

  const phaseLabel = useMemo(() => {
    if (!isBreathing) return "";
    const ex = BREATHING_EXERCISES.find((e) => e.id === active.id);
    return ex?.phases[phaseIdx]?.label ?? "";
  }, [active, phaseIdx, isBreathing]);

  // Ring keyframes (only used in v1)
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
        scales.push(scales[scales.length - 1] ?? 1);
        opacities.push(opacities[opacities.length - 1] ?? 0.7);
      }
    });
    return { scale: [1, ...scales], opacity: [0.55, ...opacities] };
  }, [active, isBreathing]);

  const ringTimes = useMemo(
    () => [
      0,
      ...active.pattern.map((_, i) => {
        const sumSoFar = active.pattern.slice(0, i + 1).reduce((a, b) => a + b, 0);
        return sumSoFar / cycleSeconds;
      }),
    ],
    [active, cycleSeconds]
  );

  const showRing = variant === "v1" && isBreathing;
  const showStrip = variant === "v1" || variant === "v2";
  const showPhaseText = (variant === "v1" || variant === "v3") && isBreathing;

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-hidden relative">
      {/* Backdrop */}
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
          Portal Mockup · {variant.toUpperCase()}
        </div>
        <div className="w-12" />
      </div>

      {/* Variant switcher */}
      <div className="relative z-10 px-3 pb-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {VARIANTS.map((v) => {
            const isOn = variant === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setVariant(v.id)}
                className={`flex-shrink-0 px-3 py-2 rounded-full text-xs transition-all border ${
                  isOn
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
                }`}
              >
                {v.name}
              </button>
            );
          })}
        </div>
        <div className="text-[11px] text-muted-foreground/80 mt-2 px-1 italic">
          {VARIANTS.find((v) => v.id === variant)?.tagline}
        </div>
      </div>

      {/* Portal stage */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 pt-2 pb-4">
        <div
          className="relative"
          style={{ width: 320, height: 320 }}
          onClick={() => {
            if (variant === "v3") setPickerOpen(true);
          }}
        >
          {/* Breath ring (v1 only) */}
          <AnimatePresence>
            {showRing && (
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
                    times: ringTimes,
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* The portal circle */}
          <div
            className={`absolute inset-4 rounded-full overflow-hidden ${
              variant === "v3" ? "cursor-pointer" : ""
            }`}
            style={{
              boxShadow: "0 0 80px hsl(0 0% 0% / 0.8), inset 0 0 40px hsl(0 0% 0% / 0.6)",
            }}
          >
            <AnimatePresence>
              {!isBreathing && (
                <motion.img
                  key="earth"
                  src={portalEarth}
                  alt="Gold Earth"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1, rotate: 360 }}
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
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-7xl opacity-60 select-none">{active.emoji}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* v3 — tap hint overlay on the circle */}
            {variant === "v3" && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
                <div className="px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm text-[10px] uppercase tracking-widest text-white/70 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  Tap to change scene
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Title + phase */}
        <div className="mt-6 text-center min-h-[60px]">
          <div className="text-lg font-medium tracking-wide">{active.name}</div>
          <AnimatePresence mode="wait">
            {showPhaseText && (
              <motion.div
                key={phaseLabel + phaseIdx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 0.85, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className={`mt-1 uppercase tracking-[0.3em] ${
                  variant === "v3" ? "text-base" : "text-sm text-muted-foreground"
                }`}
                style={
                  variant === "v3"
                    ? { color: `hsl(${active.hueBase} 90% 75%)` }
                    : undefined
                }
              >
                {phaseLabel}
              </motion.div>
            )}
            {variant === "v2" && isBreathing && (
              <motion.div
                key="v2-sub"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                className="text-xs text-muted-foreground mt-1 italic"
              >
                {active.pattern.join("-")} breath
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Scene Strip (v1 + v2) */}
      {showStrip && (
        <div className="relative z-10 px-2 pb-8">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground text-center mb-3">
            Scenes
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 px-3 snap-x snap-mandatory scrollbar-none">
            {sceneList.map((scene) => {
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
      )}

      {/* v3 — Modal scene picker */}
      <AnimatePresence>
        {variant === "v3" && pickerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <div className="text-sm uppercase tracking-[0.3em] text-white/70">
                Choose a scene
              </div>
              <button
                onClick={() => setPickerOpen(false)}
                className="text-white/70 hover:text-white p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-10">
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                {[EARTH_SCENE, ...BREATHING_SCENES].map((scene) => {
                  const isOn = scene.id === activeId;
                  return (
                    <button
                      key={scene.id}
                      onClick={() => {
                        setActiveId(scene.id);
                        setPickerOpen(false);
                      }}
                      className="aspect-square rounded-2xl relative overflow-hidden transition-all"
                      style={{
                        background:
                          scene.id === "earth"
                            ? "radial-gradient(circle at 30% 30%, hsl(42 80% 55%), hsl(35 70% 15%))"
                            : `radial-gradient(circle at 30% 30%, hsl(${scene.hueBase} 70% 45%), hsl(${scene.hueBase} 70% 10%))`,
                        boxShadow: isOn
                          ? `0 0 30px hsl(${scene.hueBase} 90% 60% / 0.6), inset 0 0 0 2px hsl(${scene.hueBase} 90% 70%)`
                          : "inset 0 0 0 1px hsl(0 0% 100% / 0.1)",
                      }}
                    >
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <span className="text-5xl">{scene.emoji}</span>
                        <div className="text-xs text-white/90 font-medium">{scene.name}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
