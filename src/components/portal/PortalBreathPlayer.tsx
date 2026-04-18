import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Pause, Play, RotateCcw, Music2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BreathParticles, type BreathParticleStyle } from "./BreathParticles";
import { Starfield } from "./Starfield";
import { BREATHING_EXERCISES, type BreathingExercise } from "@/lib/breathingExercises";
import { PortalBreathPanel } from "./PortalBreathPanel";
import nebulaSleep from "@/assets/portal-nebula-sleep.jpg";

interface PortalBreathPlayerProps {
  onBack: () => void;
  onOpenLibrary?: () => void;
  onSelectCategory?: (category: "Focus" | "Sleep" | "Escape" | "Breath") => void;
  /** Particle style chosen on the preview screen */
  particleStyle?: BreathParticleStyle;
  /** Total session duration in minutes (defaults to 5) */
  initialDurationMin?: number;
}

const MUSIC_TRACKS = ["None", "Ocean Drone", "Aurora Pad", "Heartbeat", "Forest"];

/**
 * PortalBreathPlayer — full-screen cinematic breathing session.
 * Layout matches the user reference: ambient particle field across the whole
 * viewport, centered phase label ("EXHALE / 3"), pattern footer ("4 — 2 — 6"),
 * and a 3-button control row (restart, pause/play, music). Drag down or tap the
 * music button to open the breath library panel.
 */
export function PortalBreathPlayer({
  onBack,
  onOpenLibrary,
  onSelectCategory,
  particleStyle = "aurora",
  initialDurationMin = 5,
}: PortalBreathPlayerProps) {
  const [exercise, setExercise] = useState<BreathingExercise>(BREATHING_EXERCISES[0]);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [cycles, setCycles] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [durationMin, setDurationMin] = useState(initialDurationMin);
  const [musicTrack, setMusicTrack] = useState<string>("Ocean Drone");

  const audioRef = useRef<HTMLAudioElement>(null);

  // Pull a real ambient track from the trainer-managed breathing library
  const { data: track } = useQuery({
    queryKey: ["portal-breath-music"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("breathing_music_tracks")
        .select("id, name, file_url")
        .eq("is_active", true)
        .order("order_index", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const totalSeconds = durationMin * 60;
  const remaining = Math.max(0, totalSeconds - elapsed);

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
          setPhaseIdx((p) => {
            const next = (p + 1) % exercise.phases.length;
            if (next === 0) setCycles((c) => c + 1);
            return next;
          });
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

  // Audio — pause when panel opens or session paused, same as other categories
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = 0.35;
    if (paused || panelOpen) {
      a.pause();
    } else {
      a.play().catch(() => {});
    }
  }, [paused, panelOpen, track?.file_url]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const phase = exercise.phases[phaseIdx];
  const phaseLabel = (phase?.label ?? "").toUpperCase();
  const phaseRemaining = Math.max(1, Math.ceil((phase?.seconds ?? 0) - phaseElapsed));
  const phaseProgress = (phase?.seconds ?? 1) > 0 ? phaseElapsed / (phase?.seconds ?? 1) : 0;

  const patternStr = useMemo(
    () => exercise.phases.map((p) => p.seconds).join(" — "),
    [exercise]
  );

  const handleRestart = () => {
    setPhaseIdx(0);
    setPhaseElapsed(0);
    setElapsed(0);
    setCycles(1);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden">
      {/* Ambient music from the trainer-managed breathing music library */}
      {track?.file_url && (
        <audio ref={audioRef} src={track.file_url} loop preload="auto" />
      )}

      {/* Full-screen ambient background */}
      <div className="absolute inset-0">
        <img
          src={nebulaSleep}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-70"
          style={{ filter: "saturate(0.8) brightness(0.55)" }}
        />
        {/* Vignette to push focus to center */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 75% 65% at 50% 50%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.85) 100%)",
          }}
        />
        <Starfield density={70} />
        {/* Particle field across the whole viewport */}
        <div className="absolute inset-0">
          <BreathParticles
            style={particleStyle}
            phase={phase?.type === "hold" ? "hold" : phase?.type === "exhale" ? "exhale" : "inhale"}
            breathProgress={phaseProgress}
          />
        </div>
      </div>

      {/* Top header */}
      <div
        className="relative z-10 flex items-center justify-between px-5 pt-4"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 16px)" }}
      >
        <button
          onClick={onBack}
          className="text-white/70 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-white/85 text-sm font-medium tabular-nums tracking-wide">
          {formatTime(remaining)} remaining
        </div>
        <div className="text-white/70 text-sm font-medium tabular-nums w-10 text-right">
          {cycles}
        </div>
      </div>

      {/* Centered phase label — pulses with the breath */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${exercise.id}-${phaseIdx}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <motion.h1
              animate={{
                scale:
                  phase?.type === "inhale"
                    ? 1 + phaseProgress * 0.08
                    : phase?.type === "exhale"
                    ? 1.08 - phaseProgress * 0.08
                    : 1.08,
              }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="text-white text-[26px] font-light tracking-[0.35em]"
            >
              {phaseLabel}
            </motion.h1>
            <div className="text-white/60 text-3xl font-extralight tabular-nums mt-3">
              {phaseRemaining}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom — pattern + control row */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 px-8"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 28px)" }}
      >
        <div className="flex flex-col items-center gap-5">
          <div className="text-white/55 text-[11px] tracking-[0.4em] tabular-nums">
            {patternStr}
          </div>

          <div className="flex items-center justify-center gap-6">
            {/* Restart */}
            <button
              onClick={handleRestart}
              className="h-12 w-12 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/15 text-white/75 hover:text-white hover:bg-white/[0.14] transition-all flex items-center justify-center"
              aria-label="Restart"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
            </button>

            {/* Pause / Play — primary */}
            <button
              onClick={() => setPaused((p) => !p)}
              className="h-16 w-16 rounded-full bg-white/[0.12] backdrop-blur-md border border-white/25 text-white hover:bg-white/[0.18] transition-all flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.15)]"
              aria-label={paused ? "Resume" : "Pause"}
            >
              {paused ? (
                <Play className="h-5 w-5" strokeWidth={1.5} fill="currentColor" />
              ) : (
                <Pause className="h-5 w-5" strokeWidth={1.5} fill="currentColor" />
              )}
            </button>

            {/* Music — opens breath library panel */}
            <button
              onClick={() => setPanelOpen(true)}
              className="h-12 w-12 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/15 text-white/75 hover:text-white hover:bg-white/[0.14] transition-all flex items-center justify-center"
              aria-label="Open breath library"
            >
              <Music2 className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
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
