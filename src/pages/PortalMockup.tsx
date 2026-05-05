import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  X,
  Layers,
  Pause,
  Play,
  Music2,
  RotateCcw,
  Timer,
  ChevronUp,
  Volume2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import portalEarth from "@/assets/portal-earth.jpg";
import { BREATHING_EXERCISES } from "@/lib/breathingExercises";

/**
 * VISUAL MOCKUP — Portal scene exploration
 * Route: /portal-mockup
 * Toggle scenarios + bottom-control styles. No DB, no real video, no audio.
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
type ControlStyle = "docked" | "sheet" | "pill";

const VARIANTS: { id: Variant; name: string; tagline: string }[] = [
  { id: "v1", name: "Earth + Strip + Ring", tagline: "Gold Earth default · scene strip · breath ring around circle" },
  { id: "v2", name: "Breathing Only", tagline: "No Earth · scenes are the portal · pure cinematic, no ring" },
  { id: "v3", name: "Tap-to-Pick + Phase Text", tagline: "Earth default · tap portal opens picker · video + Inhale/Hold/Exhale text only" },
];

const CONTROL_STYLES: { id: ControlStyle; name: string; tagline: string }[] = [
  { id: "docked", name: "A · Docked tab bar", tagline: "Always-visible row of icons (matches your screenshot #1)" },
  { id: "sheet", name: "B · Bottom sheet", tagline: "Just pause; tap chevron to slide up music + timer" },
  { id: "pill", name: "C · Floating pill", tagline: "Compact pill, expands on tap with all options inline" },
];

const DURATIONS = [30, 60, 120, 180, 300, 600];
const MUSIC_TRACKS = ["None", "Ocean Drone", "Aurora Pad", "Heartbeat"];

export default function PortalMockup() {
  const navigate = useNavigate();
  const [variant, setVariant] = useState<Variant>("v1");
  const [controlStyle, setControlStyle] = useState<ControlStyle>("docked");

  // Mock player state
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState<number>(180);
  const [musicIdx, setMusicIdx] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pillExpanded, setPillExpanded] = useState(false);

  const sceneList = variant === "v2" ? BREATHING_SCENES : [EARTH_SCENE, ...BREATHING_SCENES];
  const defaultId = variant === "v2" ? BREATHING_SCENES[0].id : EARTH_SCENE.id;
  const [activeId, setActiveId] = useState<string>(defaultId);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setActiveId(variant === "v2" ? BREATHING_SCENES[0].id : EARTH_SCENE.id);
    setPickerOpen(false);
    setSheetOpen(false);
    setPillExpanded(false);
  }, [variant]);

  const active = sceneList.find((s) => s.id === activeId) ?? sceneList[0];
  const isBreathing = active.id !== "earth";

  const cycleSeconds = useMemo(
    () => active.pattern.reduce((a, b) => a + b, 0) || 1,
    [active]
  );

  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  useEffect(() => {
    setPhaseIdx(0);
    setPhaseElapsed(0);
  }, [active.id]);
  useEffect(() => {
    if (!isBreathing || isPaused) return;
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
  }, [isBreathing, active, phaseIdx, isPaused]);

  const phaseLabel = useMemo(() => {
    if (!isBreathing) return "";
    const ex = BREATHING_EXERCISES.find((e) => e.id === active.id);
    return ex?.phases[phaseIdx]?.label ?? "";
  }, [active, phaseIdx, isBreathing]);

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

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r === 0 ? `${m} min` : m === 0 ? `${s}s` : `${m}:${String(r).padStart(2, "0")}`;
  };

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
          {variant.toUpperCase()} · {controlStyle.toUpperCase()}
        </div>
        <div className="w-12" />
      </div>

      {/* Variant switcher */}
      <div className="relative z-10 px-3 pb-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1.5 px-1">
          Layout
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {VARIANTS.map((v) => {
            const isOn = variant === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setVariant(v.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-all border ${
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
      </div>

      {/* Control style switcher */}
      <div className="relative z-10 px-3 pb-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1.5 px-1">
          Bottom Controls Style
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {CONTROL_STYLES.map((c) => {
            const isOn = controlStyle === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setControlStyle(c.id);
                  setSheetOpen(false);
                  setPillExpanded(false);
                }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-all border ${
                  isOn
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
        <div className="text-[11px] text-muted-foreground/80 mt-2 px-1 italic">
          {CONTROL_STYLES.find((c) => c.id === controlStyle)?.tagline}
        </div>
      </div>

      {/* Portal stage */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 pt-2 pb-4">
        <div
          className="relative"
          style={{ width: 280, height: 280 }}
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
                  animate={isPaused ? { scale: 1, opacity: 0.7 } : ringKeyframes}
                  transition={{
                    duration: cycleSeconds,
                    repeat: isPaused ? 0 : Infinity,
                    ease: "easeInOut",
                    times: isPaused ? undefined : ringTimes,
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
        <div className="mt-4 text-center min-h-[60px]">
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
        <div className="relative z-10 px-2 pb-32">
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
        </div>
      )}

      {!showStrip && <div className="h-32" />}

      {/* ============== BOTTOM CONTROLS — 3 STYLES ============== */}

      {/* A — DOCKED TAB BAR (always visible icons) */}
      {controlStyle === "docked" && (
        <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent backdrop-blur-md">
          <div className="text-center text-[11px] text-white/50 mb-2">
            {fmtTime(duration)} · {MUSIC_TRACKS[musicIdx]}
          </div>
          <div className="flex items-center justify-around max-w-sm mx-auto">
            <button
              onClick={() => setPhaseIdx(0)}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
            >
              <RotateCcw className="w-5 h-5 text-white/80" />
            </button>
            <button
              onClick={() => setIsPaused((p) => !p)}
              className="w-16 h-16 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition border border-white/20"
            >
              {isPaused ? (
                <Play className="w-6 h-6 text-white" />
              ) : (
                <Pause className="w-6 h-6 text-white" />
              )}
            </button>
            <button
              onClick={() => setMusicIdx((m) => (m + 1) % MUSIC_TRACKS.length)}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
            >
              <Music2 className="w-5 h-5 text-white/80" />
            </button>
          </div>
        </div>
      )}

      {/* B — BOTTOM SHEET (just pause; chevron opens sheet) */}
      {controlStyle === "sheet" && (
        <>
          <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-3 flex flex-col items-center gap-2">
            <button
              onClick={() => setSheetOpen(true)}
              className="text-white/50 hover:text-white/80 flex flex-col items-center gap-0.5 transition"
            >
              <ChevronUp className="w-5 h-5" />
              <span className="text-[10px] uppercase tracking-widest">Options</span>
            </button>
            <button
              onClick={() => setIsPaused((p) => !p)}
              className="w-16 h-16 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition border border-white/20"
            >
              {isPaused ? (
                <Play className="w-6 h-6 text-white" />
              ) : (
                <Pause className="w-6 h-6 text-white" />
              )}
            </button>
          </div>

          <AnimatePresence>
            {sheetOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSheetOpen(false)}
                  className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950 border-t border-white/10 rounded-t-3xl px-5 pt-4 pb-8"
                >
                  <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
                  <button
                    onClick={() => {
                      setSheetOpen(false);
                      navigate(-1);
                    }}
                    className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs mb-5 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Library
                  </button>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 mb-2">
                    Duration
                  </div>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {DURATIONS.map((d) => {
                      const on = d === duration;
                      return (
                        <button
                          key={d}
                          onClick={() => setDuration(d)}
                          className={`px-3 py-1.5 rounded-full text-xs border transition ${
                            on
                              ? "bg-white text-black border-white"
                              : "border-white/15 text-white/70 hover:border-white/40"
                          }`}
                        >
                          {fmtTime(d)}
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 mb-2">
                    Background Music
                  </div>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {MUSIC_TRACKS.map((t, i) => {
                      const on = i === musicIdx;
                      return (
                        <button
                          key={t}
                          onClick={() => setMusicIdx(i)}
                          className={`px-3 py-1.5 rounded-full text-xs border flex items-center gap-1.5 transition ${
                            on
                              ? "bg-white text-black border-white"
                              : "border-white/15 text-white/70 hover:border-white/40"
                          }`}
                        >
                          <Music2 className="w-3 h-3" />
                          {t}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setSheetOpen(false)}
                    className="w-full py-3 rounded-full bg-white/10 hover:bg-white/20 text-sm text-white transition"
                  >
                    Done
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      {/* C — FLOATING PILL (compact; expands inline) */}
      {controlStyle === "pill" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
          <motion.div
            layout
            className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-full overflow-hidden flex items-center"
            style={{ boxShadow: "0 10px 40px hsl(0 0% 0% / 0.5)" }}
          >
            <AnimatePresence initial={false}>
              {pillExpanded && (
                <motion.div
                  key="expanded"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-1 pl-2 overflow-hidden"
                >
                  <button
                    onClick={() => setPhaseIdx(0)}
                    className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition"
                  >
                    <RotateCcw className="w-4 h-4 text-white/80" />
                  </button>
                  <button
                    onClick={() => setMusicIdx((m) => (m + 1) % MUSIC_TRACKS.length)}
                    className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition"
                    title={MUSIC_TRACKS[musicIdx]}
                  >
                    <Music2 className="w-4 h-4 text-white/80" />
                  </button>
                  <button
                    onClick={() =>
                      setDuration(
                        DURATIONS[(DURATIONS.indexOf(duration) + 1) % DURATIONS.length]
                      )
                    }
                    className="px-2 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition gap-1"
                    title="Duration"
                  >
                    <Timer className="w-4 h-4 text-white/80" />
                    <span className="text-[11px] text-white/80">{fmtTime(duration)}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setIsPaused((p) => !p)}
              className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition m-1"
            >
              {isPaused ? (
                <Play className="w-5 h-5 text-white" />
              ) : (
                <Pause className="w-5 h-5 text-white" />
              )}
            </button>

            <button
              onClick={() => setPillExpanded((e) => !e)}
              className="w-10 h-12 flex items-center justify-center hover:bg-white/5 transition pr-2"
            >
              <motion.div animate={{ rotate: pillExpanded ? 180 : 0 }}>
                <ChevronUp className="w-4 h-4 text-white/60 rotate-90" />
              </motion.div>
            </button>
          </motion.div>
          <div className="text-[10px] text-white/40 text-center mt-2">
            {pillExpanded ? "Tap chevron to collapse" : "Tap chevron for options"}
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
