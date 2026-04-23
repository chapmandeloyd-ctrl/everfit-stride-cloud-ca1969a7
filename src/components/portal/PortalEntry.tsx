import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface PortalEntryProps {
  onSelectCategory: (category: "Focus" | "Sleep" | "Escape" | "Breath") => void;
}

// Cloudflare Stream — adaptive bitrate, global CDN, instant start on mobile
const CF_STREAM_VIDEO_ID = "85540f98da2a784c61adeee613d82061";
const CF_STREAM_SUBDOMAIN = "customer-33brxqrbc8olytg8.cloudflarestream.com";
const CF_STREAM_THUMBNAIL = `https://${CF_STREAM_SUBDOMAIN}/${CF_STREAM_VIDEO_ID}/thumbnails/thumbnail.jpg`;

export function PortalEntry({ onSelectCategory }: PortalEntryProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const categories: Array<"Focus" | "Sleep" | "Escape" | "Breath"> = ["Focus", "Sleep", "Escape", "Breath"];
  const [videoReady, setVideoReady] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const revealTimeoutRef = useRef<number | null>(null);
  // Cache-bust the iframe src so a stuck/failed first load can be retried
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    // Cloudflare Stream handles buffering + adaptive bitrate. We just reveal
    // when the iframe has loaded, with a hard fallback so the UI never hangs.
    const reveal = () => {
      setVideoReady(true);
      revealTimeoutRef.current = window.setTimeout(() => setShowButtons(true), 1200);
    };

    const fallback = window.setTimeout(reveal, 2500);

    return () => {
      window.clearTimeout(fallback);
      if (revealTimeoutRef.current) window.clearTimeout(revealTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIframeLoad = () => {
    setVideoReady(true);
    if (revealTimeoutRef.current) window.clearTimeout(revealTimeoutRef.current);
    revealTimeoutRef.current = window.setTimeout(() => setShowButtons(true), 1200);
    // If autoplay was blocked by the browser (common on iOS Safari without
    // a prior gesture), the iframe still loads but the video stays paused.
    // Surface a tap-to-play affordance after a short grace period.
    window.setTimeout(() => setNeedsTap(true), 2000);
  };

  const handleTapToPlay = () => {
    setNeedsTap(false);
    // Force-reload the Stream iframe — the user gesture allows autoplay to succeed
    setIframeKey((k) => k + 1);
  };

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

      {/* Poster — instant paint while Cloudflare Stream warms up */}
      <img
        src={CF_STREAM_THUMBNAIL}
        alt=""
        aria-hidden
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-out ${
          videoReady ? "opacity-0" : "opacity-100"
        }`}
        onError={(e) => {
          // Fall back to bundled poster if Cloudflare thumbnail isn't ready yet
          (e.currentTarget as HTMLImageElement).src = "/portal/ksom-calm-earth-poster.jpg";
        }}
      />

      {/* Earth hero — Cloudflare Stream adaptive HLS player. Works on every device,
          including iPhone Safari, with no native <video> crash risk. */}
      <iframe
        ref={iframeRef}
        key={iframeKey}
        src={`https://${CF_STREAM_SUBDOMAIN}/${CF_STREAM_VIDEO_ID}/iframe?autoplay=true&muted=true&loop=true&controls=false&preload=auto&poster=${encodeURIComponent(
          CF_STREAM_THUMBNAIL,
        )}`}
        onLoad={handleIframeLoad}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen={false}
        loading="eager"
        title="KSOM Calm Earth"
        className={`absolute inset-0 w-full h-full border-0 pointer-events-none transition-opacity duration-[1500ms] ease-out ${
          videoReady ? "opacity-100" : "opacity-0"
        }`}
        style={{
          // Slightly upscale to hide Cloudflare's thin letterbox on some aspect ratios
          transform: isMobile ? "scale(1.15)" : "scale(1.05)",
          transformOrigin: "center center",
        }}
      />

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

      {/* Tap-to-play fallback — appears if autoplay was blocked (iOS Safari) */}
      <AnimatePresence>
        {videoReady && needsTap && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={handleTapToPlay}
            className="absolute inset-0 z-[55] flex flex-col items-center justify-center bg-black/30 backdrop-blur-[2px]"
            aria-label="Tap to start Earth"
          >
            <div className="h-16 w-16 rounded-full bg-white/15 backdrop-blur-xl border border-white/30 flex items-center justify-center mb-3">
              <div className="w-0 h-0 border-y-[10px] border-y-transparent border-l-[16px] border-l-white ml-1" />
            </div>
            <div className="text-white/70 text-[10px] uppercase tracking-[0.4em]">tap to enter</div>
          </motion.button>
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
