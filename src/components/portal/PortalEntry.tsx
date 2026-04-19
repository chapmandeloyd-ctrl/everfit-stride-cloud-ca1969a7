import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PortalEntryProps {
  onSelectCategory: (category: "Focus" | "Sleep" | "Escape" | "Breath") => void;
}

export function PortalEntry({ onSelectCategory }: PortalEntryProps) {
  const navigate = useNavigate();
  const categories: Array<"Focus" | "Sleep" | "Escape" | "Breath"> = ["Focus", "Sleep", "Escape", "Breath"];
  const [videoReady, setVideoReady] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    el.muted = true;

    const reveal = () => {
      setVideoReady(true);
      // Give the user ~1.2s to actually see Earth before buttons fade in
      setTimeout(() => setShowButtons(true), 1200);
    };

    const tryPlay = () => {
      el.play()
        .then(reveal)
        .catch(() => {
          // Autoplay blocked — still reveal so the user can interact
          reveal();
        });
    };

    if (el.readyState >= 3) {
      tryPlay();
    } else {
      el.addEventListener("canplay", tryPlay, { once: true });
      el.addEventListener("loadeddata", tryPlay, { once: true });
    }

    // Hard fallback: never leave the user staring at a black screen for >3.5s
    const fallback = setTimeout(() => {
      if (!videoReady) {
        setVideoReady(true);
        setTimeout(() => setShowButtons(true), 600);
      }
    }, 3500);

    return () => {
      clearTimeout(fallback);
      el.removeEventListener("canplay", tryPlay);
      el.removeEventListener("loadeddata", tryPlay);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden z-50">
      {/* Starfield fallback — visible immediately while video buffers */}
      <div
        className="absolute inset-0 bg-black"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 30% 40%, rgba(40,80,140,0.35) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(20,40,80,0.4) 0%, transparent 55%), radial-gradient(circle at 50% 50%, #000 0%, #000 100%)",
        }}
      />

      {/* Earth video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster="/portal/ksom-calm-earth-poster.jpg"
        disablePictureInPicture
        disableRemotePlayback
        controls={false}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-out ${
          videoReady ? "opacity-100" : "opacity-0"
        }`}
      >
        <source src="/portal/ksom-calm-earth-optimized.mp4" type="video/mp4" />
      </video>

      {/* Top vignette to anchor title */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none" />
      {/* Bottom vignette to anchor buttons */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

      {/* Close button — returns to dashboard */}
      <button
        onClick={() => navigate("/client/dashboard")}
        aria-label="Close"
        className="absolute z-[60] left-4 h-10 w-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white/90 hover:bg-white/20 active:scale-95 transition-all"
        style={{ top: "max(env(safe-area-inset-top, 0px), 16px)" }}
      >
        <X className="h-5 w-5" />
      </button>

      {/* Title — Breathing CALM with shimmer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="absolute top-[16%] inset-x-0 flex flex-col items-center"
      >
        <div className="text-white/40 text-[9px] uppercase tracking-[0.5em] mb-4">
          ksom presents
        </div>
        <motion.h1
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.7, 1, 0.7],
            filter: [
              "drop-shadow(0 0 8px rgba(165,216,255,0.2))",
              "drop-shadow(0 0 24px rgba(165,216,255,0.6))",
              "drop-shadow(0 0 8px rgba(165,216,255,0.2))",
            ],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="font-extralight text-[56px] leading-none"
          style={{
            letterSpacing: "0.15em",
            paddingLeft: "0.15em",
            background:
              "linear-gradient(120deg, #ffffff 30%, #a5d8ff 50%, #ffffff 70%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundSize: "200% 100%",
            animation: "calmShimmer 4s ease-in-out infinite",
          }}
        >
          CALM
        </motion.h1>
        <style>{`
          @keyframes calmShimmer {
            0%, 100% { background-position: 200% center; }
            50% { background-position: -200% center; }
          }
        `}</style>
      </motion.div>

      {/* Loading hint — shows only while video is buffering */}
      <AnimatePresence>
        {!videoReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="absolute bottom-[14%] inset-x-0 flex flex-col items-center gap-3 pointer-events-none"
          >
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-white/60"
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
            <div className="text-white/40 text-[10px] uppercase tracking-[0.4em]">
              entering orbit
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Frosted glass buttons — appear AFTER Earth is visible */}
      <AnimatePresence>
        {showButtons && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute bottom-[8%] inset-x-0 px-8 space-y-3"
          >
            {categories.map((cat, i) => (
              <motion.button
                key={cat}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                onClick={() => onSelectCategory(cat)}
                className="w-full py-4 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white text-sm font-light tracking-[0.3em] uppercase hover:bg-white/20 active:scale-[0.98] transition-all"
              >
                {cat}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
