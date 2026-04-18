import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Volume2, VolumeX, Clock, Wind, Check, TimerReset, Lightbulb } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Starfield } from "./Starfield";
import { BREATHING_EXERCISES, type BreathingExercise } from "@/lib/breathingExercises";
import { PortalBreathPanel } from "./PortalBreathPanel";
import portalEarth from "@/assets/portal-earth.jpg";
import nebulaFocus from "@/assets/portal-nebula-focus.jpg";

const MUSIC_TRACKS = ["None", "Ocean Drone", "Aurora Pad", "Heartbeat", "Forest"];

interface PortalBreathPlayerProps {
  onBack: () => void;
  onOpenLibrary?: () => void;
  onSelectCategory?: (category: "Focus" | "Sleep" | "Escape" | "Breath") => void;
}

/**
 * PortalBreathPlayer — Breath equivalent of PortalPlayer.
 * Same cinematic chrome (KSOM CALM header, circle, bottom icons) but the
 * inner circle pulses to a breathing exercise rhythm and the slide-up sheet
 * exposes the breathing library + timer + music instead of scenes.
 */
export function PortalBreathPlayer({ onBack, onOpenLibrary, onSelectCategory }: PortalBreathPlayerProps) {
  const [exercise, setExercise] = useState<BreathingExercise>(BREATHING_EXERCISES[0]);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [durationMin, setDurationMin] = useState(5);
  const [musicTrack, setMusicTrack] = useState<string>("Ocean Drone");

  const cycleSeconds = useMemo(
    () => exercise.phases.reduce((a, p) => a + p.seconds, 0) || 1,
    [exercise]
  );

  // Reset when exercise changes
  useEffect(() => {
    setPhaseIdx(0);
    setPhaseElapsed(0);
  }, [exercise.id]);

  // Breathing phase progression
  useEffect(() => {
    if (paused || panelOpen) return;
    const i = setInterval(() => {
      setPhaseElapsed((prev) => {
        const len = exercise.phases[phaseIdx]?.seconds ?? 4;
        if (prev + 0.1 >= len) {
          setPhaseIdx((p) => (p + 1) % exercise.phases.length);
          return 0;
        }
        return prev + 0.1;
      });
    }, 100);
    return () => clearInterval(i);
  }, [exercise, phaseIdx, paused, panelOpen]);

  // Total elapsed timer
  useEffect(() => {
    if (paused || panelOpen) return;
    const i = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(i);
  }, [paused, panelOpen]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const phase = exercise.phases[phaseIdx];
  const phaseLabel = phase?.label ?? "";
  const phaseRemaining = Math.max(0, Math.ceil((phase?.seconds ?? 0) - phaseElapsed));

  // Pulse scale per phase type
  const targetScale =
    phase?.type === "inhale" ? 1.18 : phase?.type === "exhale" ? 0.92 : 1.05;

  const hue = exercise.tone.hueBase;

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden">
      {/* Galaxy nebula background */}
      <div className="absolute inset-0 bg-black overflow-hidden">
        <img
          src={nebulaFocus}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-90"
          style={{ filter: `saturate(1.05) hue-rotate(${hue - 200}deg)` }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 0%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.85) 100%)",
          }}
        />
        <Starfield density={90} />
      </div>

      {/* Earth horizon at bottom */}
      <div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
        style={{ bottom: 0, width: "100%", maxWidth: "900px" }}
      >
        <img
          src={portalEarth}
          alt=""
          className="w-full h-auto block opacity-95"
          style={{
            maskImage:
              "radial-gradient(ellipse 55% 65% at 50% 75%, black 30%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.4) 65%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 55% 65% at 50% 75%, black 30%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.4) 65%, transparent 80%)",
          }}
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent pointer-events-none" />

      {/* Top header */}
      <div
        className="relative z-10 flex items-center justify-between px-5 pt-4"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 16px)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors min-h-[44px]"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
        <div className="text-white/50 text-xs uppercase tracking-widest">KSOM Calm</div>
        <div className="flex items-center gap-1 text-white/60 text-xs font-medium">
          <Clock className="h-3.5 w-3.5" />
          {formatTime(elapsed)}
        </div>
      </div>

      {/* Circle + Title */}
      <div className="relative z-10 flex flex-col items-center justify-center px-8" style={{ paddingTop: "8vh" }}>
        <motion.div
          animate={{ scale: paused ? 1 : targetScale }}
          transition={{
            duration: phase?.seconds ?? 4,
            ease: "easeInOut",
          }}
          className="relative aspect-square w-[58%] max-w-[260px] rounded-full overflow-hidden"
        >
          {/* Outer glow ring */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none z-10"
            style={{
              boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,0.95), 0 0 60px 10px hsla(${hue}, 90%, 60%, 0.35), 0 0 120px 20px hsla(${hue}, 90%, 60%, 0.15)`,
            }}
          />
          {/* Animated breath fill */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 50%, hsl(${hue} 80% 55%) 0%, hsl(${hue} 70% 25%) 60%, hsl(${hue} 80% 10%) 100%)`,
            }}
          />
          <motion.div
            className="absolute inset-0"
            animate={{
              opacity: phase?.type === "inhale" ? [0.4, 0.85] : phase?.type === "exhale" ? [0.85, 0.4] : 0.7,
            }}
            transition={{ duration: phase?.seconds ?? 4, ease: "easeInOut" }}
            style={{
              background: `radial-gradient(circle at 50% 50%, hsl(${hue} 100% 70% / 0.6), transparent 70%)`,
            }}
          />
          {/* Phase label centered */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <div className="text-[10px] uppercase tracking-[0.4em] text-white/70">{phaseLabel}</div>
            <div className="text-5xl font-extralight tabular-nums mt-1">{phaseRemaining}</div>
          </div>
        </motion.div>

        {/* Title under circle */}
        <div className="text-center mt-7">
          <h1 className="text-white text-[17px] font-semibold tracking-[0.18em] uppercase">
            {exercise.name}
          </h1>
          <div className="text-white/60 text-[11px] uppercase tracking-[0.35em] mt-1.5">
            {exercise.phases.map((p) => p.seconds).join(" · ")} · Breath
          </div>
        </div>
      </div>

      {/* Bottom icon row */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 px-8"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)" }}
      >
        <AnimatePresence>
          {volumeOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mb-4 mx-auto max-w-xs flex items-center gap-3 bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-full px-4 py-3"
            >
              <button
                onClick={() => setMuted((m) => !m)}
                className="text-white/80 hover:text-white"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <Slider
                value={[muted ? 0 : volume * 100]}
                onValueChange={(v) => {
                  setVolume(v[0] / 100);
                  if (muted && v[0] > 0) setMuted(false);
                }}
                max={100}
                step={1}
                className="flex-1"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between text-white/85">
          {/* BREATH — opens the breath panel */}
          <button
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-2 hover:text-white transition-colors"
            aria-label="Open breath panel"
          >
            <Wind className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-[11px] uppercase tracking-[0.25em] font-medium">Breath</span>
          </button>

          <button
            onClick={() => setPaused((p) => !p)}
            className="text-white/70 hover:text-white transition-colors p-2"
            aria-label={paused ? "Resume" : "Pause"}
          >
            <Check className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <button className="text-white/70 hover:text-white transition-colors p-2" aria-label="Set timer">
            <TimerReset className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <button
            onClick={() => setVolumeOpen((o) => !o)}
            className={`p-2 transition-colors ${volumeOpen ? "text-white" : "text-white/70 hover:text-white"}`}
            aria-label="Volume"
          >
            {muted ? <VolumeX className="h-5 w-5" strokeWidth={1.5} /> : <Volume2 className="h-5 w-5" strokeWidth={1.5} />}
          </button>

          <button className="text-white/70 hover:text-white transition-colors p-2" aria-label="Ambient light">
            <Lightbulb className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex justify-center mt-3">
          <div className="h-1 w-1 rounded-full bg-white/40" />
        </div>
      </div>

      {/* Slide-up Breath panel */}
      <PortalBreathPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onOpenLibrary={() => {
          setPanelOpen(false);
          onOpenLibrary?.();
        }}
        onSelectCategory={(cat) => {
          setPanelOpen(false);
          if (cat !== "Breath") onSelectCategory?.(cat);
        }}
        activeExerciseId={exercise.id}
        onSelectExercise={(ex) => setExercise(ex)}
        durationMin={durationMin}
        onSelectDuration={setDurationMin}
        musicTrack={musicTrack}
        musicTracks={MUSIC_TRACKS}
        onSelectMusic={setMusicTrack}
      />
    </div>
  );
}
