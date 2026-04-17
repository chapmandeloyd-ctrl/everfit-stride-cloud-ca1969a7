import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Volume2, VolumeX, ChevronDown, Clock, CircleDot, Check, TimerReset, Lightbulb } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import portalEarth from "@/assets/portal-earth.jpg";
import nebulaFocus from "@/assets/portal-nebula-focus.jpg";
import nebulaSleep from "@/assets/portal-nebula-sleep.jpg";
import nebulaEscape from "@/assets/portal-nebula-escape.jpg";
import { Starfield } from "./Starfield";
import { PortalControlPanel } from "./PortalControlPanel";

function builtInNebulaFor(category: string): string {
  const c = category?.toLowerCase();
  if (c === "sleep") return nebulaSleep;
  if (c === "escape") return nebulaEscape;
  return nebulaFocus; // Focus + fallback
}

export interface PortalScene {
  id: string;
  name: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  video_url: string;
  audio_url: string | null;
  audio_volume: number;
  loop_video: boolean;
  is_premium: boolean;
  override_nebula_id?: string | null;
  override_horizon_id?: string | null;
  override_show_horizon?: boolean | null;
}

interface PortalPlayerProps {
  scene: PortalScene;
  onBack: () => void;
  onOpenLibrary?: () => void;
  onSelectCategory?: (category: "Focus" | "Sleep" | "Escape") => void;
  audioPaused?: boolean;
}

/**
 * PortalPlayer — Portal-app inspired immersive scene player.
 * Default: circular preview with controls.
 * Swipe DOWN on circle → expands to full-screen cinematic mode.
 * Swipe UP from full-screen → collapses back to circle.
 */
export function PortalPlayer({ scene, onBack, onOpenLibrary, onSelectCategory, audioPaused }: PortalPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const [immersive, setImmersive] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(scene.audio_volume);
  const [elapsed, setElapsed] = useState(0);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const dragY = useMotionValue(0);
  const circleScale = useTransform(dragY, [0, 200], [1, 1.15]);
  const hintOpacity = useTransform(dragY, [0, 80], [1, 0]);

  // Sync video play state + try to start audio (browsers may block until user gesture)
  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    const shouldPlay = playing && !audioPaused;
    if (a) a.volume = muted ? 0 : volume;
    if (!v) return;
    if (shouldPlay) {
      v.play().catch(() => {});
      a?.play().catch(() => {});
    } else {
      v.pause();
      a?.pause();
    }
  }, [playing, audioPaused]);

  // Volume sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  // Kick off audio on first user interaction (autoplay policy fallback)
  useEffect(() => {
    const tryPlayAudio = () => {
      const a = audioRef.current;
      if (a && a.paused && playing) {
        a.volume = muted ? 0 : volume;
        a.play().catch(() => {});
      }
    };
    window.addEventListener("pointerdown", tryPlayAudio, { once: true });
    window.addEventListener("touchstart", tryPlayAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", tryPlayAudio);
      window.removeEventListener("touchstart", tryPlayAudio);
    };
  }, [playing, muted, volume]);

  // Timer
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [playing]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleDragEnd = (_: any, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (!immersive && (info.offset.y > 80 || info.velocity.y > 300)) {
      setImmersive(true);
      animate(dragY, 0, { duration: 0.3 });
    } else if (immersive && (info.offset.y < -80 || info.velocity.y < -300)) {
      setImmersive(false);
      animate(dragY, 0, { duration: 0.3 });
    } else {
      animate(dragY, 0, { type: "spring", stiffness: 300, damping: 30 });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden">
      {/* Hidden audio layer (independent from video) */}
      {scene.audio_url && (
        <audio ref={audioRef} src={scene.audio_url} loop preload="auto" />
      )}

      {/* Video — always rendered, scales between circle and full-screen */}
      <AnimatePresence mode="wait">
        {immersive ? (
          <motion.div
            key="immersive"
            className="absolute inset-0"
            initial={{ clipPath: "circle(40% at 50% 50%)" }}
            animate={{ clipPath: "circle(120% at 50% 50%)" }}
            exit={{ clipPath: "circle(40% at 50% 50%)" }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.4}
            onDragEnd={handleDragEnd}
            style={{ y: dragY }}
          >
            <video
              ref={videoRef}
              src={scene.video_url}
              autoPlay
              loop={scene.loop_video}
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Vignette for cinematic feel */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

            {/* Top bar — minimal */}
            <div
              className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 pt-12 pb-4"
              style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 48px)" }}
            >
              <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                <Clock className="h-4 w-4" />
                {formatTime(elapsed)}
              </div>
              <div className="text-white/90 text-sm font-medium tracking-wide uppercase">
                {scene.name}
              </div>
            </div>

            {/* Swipe-up hint — tappable */}
            <motion.button
              onClick={() => setImmersive(false)}
              className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-2 pb-12 text-white/60 hover:text-white/90 transition-colors"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 48px)" }}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="h-5 w-5 rotate-180" />
              <span className="text-[11px] uppercase tracking-widest">Swipe or tap to exit</span>
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            className="absolute inset-0 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Galaxy nebula background, by category */}
            <div className="absolute inset-0 bg-black overflow-hidden">
              <img
                src={nebulaFor(scene.category)}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-90"
                style={{ filter: "saturate(1.05)" }}
              />
              {/* Soft radial darken at edges so the circle pops */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 0%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.85) 100%)",
                }}
              />
              {/* Procedural starfield + shooting stars */}
              <Starfield density={90} />
            </div>

            {/* Earth at the bottom — anchored thin sliver */}
            <div
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                bottom: "-12%",
                width: "180%",
                maxWidth: "1200px",
                aspectRatio: "16 / 9",
              }}
            >
              <img
                src={portalEarth}
                alt=""
                className="w-full h-full object-cover object-top opacity-90"
                style={{
                  maskImage:
                    "radial-gradient(ellipse 70% 90% at 50% 100%, black 40%, transparent 80%)",
                  WebkitMaskImage:
                    "radial-gradient(ellipse 70% 90% at 50% 100%, black 40%, transparent 80%)",
                }}
              />
            </div>
            {/* Subtle top vignette */}
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
              <div className="w-10" />
            </div>

            {/* Circle + Title block — circle is smaller, title sits below */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-24">
              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                style={{ y: dragY, scale: circleScale }}
                className="relative aspect-square w-[58%] max-w-[260px] rounded-full overflow-hidden cursor-grab active:cursor-grabbing touch-none"
              >
                {/* Crisp white ring with soft outer glow */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none z-10"
                  style={{
                    boxShadow:
                      "inset 0 0 0 1.5px rgba(255,255,255,0.95), 0 0 40px 6px rgba(255,255,255,0.18), 0 0 80px 12px rgba(255,255,255,0.08)",
                  }}
                />
                <video
                  ref={videoRef}
                  src={scene.video_url}
                  autoPlay
                  loop={scene.loop_video}
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              </motion.div>

              {/* Title directly under circle */}
              <div className="text-center mt-7">
                <h1 className="text-white text-[17px] font-semibold tracking-[0.18em] uppercase">
                  {scene.name}
                </h1>
                <div className="text-white/60 text-[11px] uppercase tracking-[0.35em] mt-1.5">
                  {scene.category}
                </div>
              </div>
            </div>

            {/* Bottom icon row — flat, minimal */}
            <div
              className="relative z-10 px-8"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)" }}
            >
              {/* Volume slider popover (above the row) */}
              <AnimatePresence>
                {volumeOpen && scene.audio_url && (
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
                {/* FOCUS — opens portal control panel */}
                <button
                  onClick={() => setPanelOpen(true)}
                  className="flex items-center gap-2 hover:text-white transition-colors"
                  aria-label="Open portal panel"
                >
                  <CircleDot className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-[11px] uppercase tracking-[0.25em] font-medium">Focus</span>
                </button>

                <button className="text-white/70 hover:text-white transition-colors p-2" aria-label="Mark complete">
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

              {/* Page indicator dot */}
              <div className="flex justify-center mt-3">
                <div className="h-1 w-1 rounded-full bg-white/40" />
              </div>
            </div>

            {/* Hidden swipe-down hint kept for gesture, but visually removed */}
            <motion.div style={{ opacity: hintOpacity }} className="hidden" />

          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-up control panel (FOCUS tab) */}
      <PortalControlPanel
        open={panelOpen}
        activeCategory={(scene.category?.charAt(0).toUpperCase() + scene.category?.slice(1).toLowerCase()) as "Focus" | "Sleep" | "Escape"}
        onClose={() => setPanelOpen(false)}
        onOpenLibrary={() => {
          setPanelOpen(false);
          onOpenLibrary?.();
        }}
        onSelectCategory={(cat) => {
          setPanelOpen(false);
          onSelectCategory?.(cat);
        }}
      />
    </div>
  );
}
