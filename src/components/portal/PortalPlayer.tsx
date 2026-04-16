import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowLeft, Pause, Play, Volume2, VolumeX, ChevronDown, Clock } from "lucide-react";
import { Slider } from "@/components/ui/slider";

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
}

interface PortalPlayerProps {
  scene: PortalScene;
  onBack: () => void;
}

/**
 * PortalPlayer — Portal-app inspired immersive scene player.
 * Default: circular preview with controls.
 * Swipe DOWN on circle → expands to full-screen cinematic mode.
 * Swipe UP from full-screen → collapses back to circle.
 */
export function PortalPlayer({ scene, onBack }: PortalPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [immersive, setImmersive] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(scene.audio_volume);
  const [elapsed, setElapsed] = useState(0);

  const dragY = useMotionValue(0);
  const circleScale = useTransform(dragY, [0, 200], [1, 1.15]);
  const hintOpacity = useTransform(dragY, [0, 80], [1, 0]);

  // Sync video play state
  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v) return;
    if (playing) {
      v.play().catch(() => {});
      a?.play().catch(() => {});
    } else {
      v.pause();
      a?.pause();
    }
  }, [playing]);

  // Volume sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

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
            {/* Background blurred thumbnail */}
            {scene.thumbnail_url && (
              <div
                className="absolute inset-0 bg-cover bg-center scale-110 blur-3xl opacity-40"
                style={{ backgroundImage: `url(${scene.thumbnail_url})` }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />

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
              <div className="text-white/50 text-xs uppercase tracking-widest">Portal</div>
              <div className="w-10" />
            </div>

            {/* Title block */}
            <div className="relative z-10 px-6 pt-6 text-center">
              <div className="text-white/40 text-[11px] uppercase tracking-[0.2em] mb-1.5">
                {scene.category}
              </div>
              <h1 className="text-white text-2xl font-light tracking-tight">{scene.name}</h1>
              {scene.description && (
                <p className="text-white/50 text-sm mt-2 max-w-xs mx-auto">{scene.description}</p>
              )}
            </div>

            {/* Circular video preview — draggable down */}
            <div className="relative z-10 flex-1 flex items-center justify-center px-8">
              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.5}
                onDragEnd={handleDragEnd}
                style={{ y: dragY, scale: circleScale }}
                className="relative aspect-square w-full max-w-sm rounded-full overflow-hidden shadow-2xl ring-1 ring-white/10 cursor-grab active:cursor-grabbing"
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
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none" />

                {/* Timer overlay */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white/90 text-sm font-medium tracking-wider">
                  {formatTime(elapsed)}
                </div>

                {/* Play/Pause center */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPlaying((p) => !p);
                  }}
                  className="absolute inset-0 flex items-center justify-center"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  <div className="h-16 w-16 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center ring-1 ring-white/20">
                    {playing ? (
                      <Pause className="h-7 w-7 text-white" />
                    ) : (
                      <Play className="h-7 w-7 text-white ml-1" />
                    )}
                  </div>
                </button>
              </motion.div>
            </div>

            {/* Swipe-down hint */}
            <motion.div
              className="relative z-10 flex flex-col items-center gap-2 pb-2 text-white/50"
              style={{ opacity: hintOpacity }}
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="h-5 w-5" />
              <span className="text-[11px] uppercase tracking-widest">Swipe down to enter</span>
            </motion.div>

            {/* Volume controls */}
            {scene.audio_url && (
              <div
                className="relative z-10 px-8 pb-8 pt-4"
                style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 32px)" }}
              >
                <div className="flex items-center gap-3 bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-full px-4 py-3">
                  <button
                    onClick={() => setMuted((m) => !m)}
                    className="text-white/70 hover:text-white transition-colors"
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
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
