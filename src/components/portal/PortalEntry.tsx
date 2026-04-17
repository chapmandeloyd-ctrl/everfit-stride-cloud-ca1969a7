import { motion } from "framer-motion";

interface PortalEntryProps {
  onSelectCategory: (category: "Focus" | "Sleep" | "Escape") => void;
}

export function PortalEntry({ onSelectCategory, onOpenLibrary }: PortalEntryProps) {
  const categories: Array<"Focus" | "Sleep" | "Escape"> = ["Focus", "Sleep", "Escape"];

  return (
    <div className="fixed inset-0 bg-black overflow-hidden z-50">
      {/* Earth video — fills screen */}
      <video
        src="/portal/ksom-calm-earth.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Top vignette to anchor title */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none" />
      {/* Bottom vignette to anchor buttons */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

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

      {/* Frosted glass buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
        className="absolute bottom-[8%] inset-x-0 px-8 space-y-3"
      >
        {onOpenLibrary && (
          <button
            onClick={onOpenLibrary}
            className="w-full py-3.5 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/15 text-white/90 text-xs font-light tracking-[0.3em] uppercase hover:bg-white/15 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <Library className="h-4 w-4" />
            Open Library
          </button>
        )}
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className="w-full py-4 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white text-sm font-light tracking-[0.3em] uppercase hover:bg-white/20 active:scale-[0.98] transition-all"
          >
            {cat}
          </button>
        ))}
      </motion.div>
    </div>
  );
}
