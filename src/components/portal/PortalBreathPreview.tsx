import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  Clock,
  CircleDot,
  Check,
  TimerReset,
  Volume2,
  VolumeX,
  Lightbulb,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { BreathParticles, type BreathParticleStyle } from "./BreathParticles";
import { Starfield } from "./Starfield";
import { PortalControlPanel } from "./PortalControlPanel";
import nebulaSleep from "@/assets/portal-nebula-sleep.jpg";
import portalEarth from "@/assets/portal-earth.jpg";

type Category = "Focus" | "Sleep" | "Escape" | "Breath";

interface Props {
  onBack: () => void;
  /** Called when user drags the circle down to expand into the full breathing player */
  onExpand: () => void;
  /** When true (e.g. library overlay open), pause ambient music — same pattern as PortalPlayer */
  audioPaused?: boolean;
  /** Optional controlled particle style — when provided, switcher updates parent */
  style?: BreathParticleStyle;
  onStyleChange?: (s: BreathParticleStyle) => void;
  /** Switch to another category from the slide-up panel */
  onSelectCategory?: (cat: Category) => void;
  /** Tap the BREATH title or BREATH tab → open the Breath Library prompt */
  onOpenBreathLibrary?: () => void;
}

const STYLES: { id: BreathParticleStyle; label: string }[] = [
  { id: "soft", label: "Soft Dots" },
  { id: "pulse", label: "Pulse" },
  { id: "aurora", label: "Aurora" },
];

/**
 * PortalBreathPreview — circle-mode preview for the Breath category.
 * Mirrors PortalPlayer's layout (nebula bg + horizon + circle + bottom controls)
 * but the circle shows a live particle field instead of a video. Music plays in the
 * background like the other categories; dragging down opens the full breathing player.
 *
 * Includes a small style switcher so the user can demo Soft / Pulse / Aurora live.
 */
export function PortalBreathPreview({
  onBack,
  onExpand,
  audioPaused,
  style: styleProp,
  onStyleChange,
  onSelectCategory,
  onOpenBreathLibrary,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [styleLocal, setStyleLocal] = useState<BreathParticleStyle>("aurora");
  const style = styleProp ?? styleLocal;
  const setStyle = (s: BreathParticleStyle) => {
    setStyleLocal(s);
    onStyleChange?.(s);
  };
  const [elapsed, setElapsed] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [volumeOpen, setVolumeOpen] = useState(false);

  // Pull a real ambient track from the breathing music library
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

  // Demo breath cycle for "pulse" mode (4s inhale / 2s hold / 6s exhale)
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [progress, setProgress] = useState(0);

  const dragY = useMotionValue(0);
  const circleScale = useTransform(dragY, [0, 200], [1, 1.15]);

  // Tick the demo breath cycle
  useEffect(() => {
    let raf = 0;
    let start = performance.now();
    const cycle = [
      { p: "inhale" as const, ms: 4000 },
      { p: "hold" as const, ms: 2000 },
      { p: "exhale" as const, ms: 6000 },
    ];
    let idx = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const seg = cycle[idx];
      const pr = Math.min(1, elapsed / seg.ms);
      setPhase(seg.p);
      setProgress(pr);
      if (elapsed >= seg.ms) {
        idx = (idx + 1) % cycle.length;
        start = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Session timer (mirrors PortalPlayer)
  useEffect(() => {
    const i = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(i);
  }, []);

  // Audio control — pause when library overlay is open, like the other categories
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = muted ? 0 : volume;
    if (audioPaused) {
      a.pause();
    } else {
      a.play().catch(() => {});
    }
  }, [audioPaused, track?.file_url, muted, volume]);

  // Kick off audio on first user interaction (autoplay fallback)
  useEffect(() => {
    const tryPlay = () => {
      const a = audioRef.current;
      if (a && a.paused && !audioPaused) a.play().catch(() => {});
    };
    window.addEventListener("pointerdown", tryPlay, { once: true });
    window.addEventListener("touchstart", tryPlay, { once: true });
    return () => {
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("touchstart", tryPlay);
    };
  }, [audioPaused]);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleDragEnd = (
    _: any,
    info: { offset: { y: number }; velocity: { y: number } }
  ) => {
    if (info.offset.y > 80 || info.velocity.y > 300) {
      onExpand();
      animate(dragY, 0, { duration: 0.3 });
    } else {
      animate(dragY, 0, { type: "spring", stiffness: 300, damping: 30 });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden">
      {/* Ambient music from the trainer-managed breathing music library */}
      {track?.file_url && (
        <audio
          ref={audioRef}
          src={track.file_url}
          loop
          preload="auto"
        />
      )}

      <motion.div
        className="absolute inset-0 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Nebula background (using sleep palette — soft blues for breathing) */}
        <div className="absolute inset-0 bg-black overflow-hidden">
          <img
            src={nebulaSleep}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-90"
            style={{ filter: "saturate(1.05)" }}
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

        {/* Horizon (Earth) */}
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
          <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
            <Clock className="h-4 w-4" />
            {formatTime(elapsed)}
          </div>
        </div>

        {/* Circle + Title */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-24">
          <motion.div
            drag="y"
            dragMomentum={false}
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.12}
            onDragEnd={handleDragEnd}
            style={{ y: dragY, scale: circleScale, touchAction: "none" }}
            className="relative aspect-square w-[58%] max-w-[260px] rounded-full overflow-hidden cursor-grab active:cursor-grabbing touch-none"
          >
            {/* Crisp white ring with soft outer glow — matches PortalPlayer */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none z-10"
              style={{
                boxShadow:
                  "inset 0 0 0 1.5px rgba(255,255,255,0.95), 0 0 40px 6px rgba(255,255,255,0.18), 0 0 80px 12px rgba(255,255,255,0.08)",
              }}
            />
            {/* Soft dark blue gradient backdrop inside the circle */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 50% 45%, rgba(40,70,120,0.85) 0%, rgba(15,25,50,0.95) 60%, rgba(5,10,25,1) 100%)",
              }}
            />
            {/* Particles */}
            <div className="absolute inset-0">
              <BreathParticles style={style} phase={phase} breathProgress={progress} />
            </div>
          </motion.div>

          {/* Title — tap to open the Breath Library prompt */}
          <button
            onClick={onOpenBreathLibrary}
            className="text-center mt-7 group"
            aria-label="Open Breath Library"
          >
            <h1 className="text-white text-[17px] font-semibold tracking-[0.18em] uppercase group-hover:text-white/90 transition-colors">
              Breath
            </h1>
            <div className="text-white/60 text-[11px] uppercase tracking-[0.35em] mt-1.5">
              Live Particles
            </div>
          </button>


          {/* Drag-down hint */}
          <motion.div
            animate={{ y: [0, 6, 0], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="mt-6 flex flex-col items-center gap-1 text-white/55"
          >
            <ChevronDown className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-[0.3em]">Drag down to begin</span>
          </motion.div>
        </div>

        {/* Bottom icon row — matches PortalPlayer footer (Focus / Check / Timer / Volume / Lightbulb) */}
        <div
          className="relative z-10 px-8"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)" }}
        >
          {/* Volume slider popover (above the row) */}
          <AnimatePresence>
            {volumeOpen && track?.file_url && (
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
            {/* BREATH — opens portal control panel */}
            <button
              onClick={() => setPanelOpen(true)}
              className="flex items-center gap-2 hover:text-white transition-colors"
              aria-label="Open portal panel"
            >
              <CircleDot className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-[11px] uppercase tracking-[0.25em] font-medium">Breath</span>
            </button>

            <button
              onClick={onExpand}
              className="text-white/70 hover:text-white transition-colors p-2"
              aria-label="Begin session"
            >
              <Check className="h-5 w-5" strokeWidth={1.5} />
            </button>

            <button
              onClick={onExpand}
              className="text-white/70 hover:text-white transition-colors p-2"
              aria-label="Set timer"
            >
              <TimerReset className="h-5 w-5" strokeWidth={1.5} />
            </button>

            <button
              onClick={() => setVolumeOpen((o) => !o)}
              className={`p-2 transition-colors ${volumeOpen ? "text-white" : "text-white/70 hover:text-white"}`}
              aria-label="Volume"
            >
              {muted ? <VolumeX className="h-5 w-5" strokeWidth={1.5} /> : <Volume2 className="h-5 w-5" strokeWidth={1.5} />}
            </button>

            <button
              className="text-white/70 hover:text-white transition-colors p-2"
              aria-label="Ambient light"
            >
              <Lightbulb className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Page indicator dot */}
          <div className="flex justify-center mt-3">
            <div className="h-1 w-1 rounded-full bg-white/40" />
          </div>
        </div>
      </motion.div>

      {/* Slide-up panel — same chrome as the other categories. Tapping the BREATH tab opens the library prompt. */}
      <PortalControlPanel
        open={panelOpen}
        activeCategory={"Focus"}
        onClose={() => setPanelOpen(false)}
        onOpenLibrary={() => {
          setPanelOpen(false);
          onOpenBreathLibrary?.();
        }}
        onSelectCategory={(cat) => {
          setPanelOpen(false);
          if (cat === "Breath") {
            onOpenBreathLibrary?.();
            return;
          }
          onSelectCategory?.(cat);
        }}
      />
    </div>
  );
}
