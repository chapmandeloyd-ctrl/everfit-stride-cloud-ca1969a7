import { motion } from "framer-motion";

interface PortalEntryProps {
  onSelectCategory: (category: "Focus" | "Sleep" | "Escape") => void;
}

export function PortalEntry({ onSelectCategory }: PortalEntryProps) {
  const categories: Array<"Focus" | "Sleep" | "Escape"> = ["Focus", "Sleep", "Escape"];

  return (
    <div className="fixed inset-0 bg-black overflow-hidden z-50">
      {/* Earth video — fills screen, anchored bottom */}
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

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute top-[14%] inset-x-0 flex flex-col items-center"
      >
        <div className="text-white/50 text-[10px] uppercase tracking-[0.4em] mb-3">
          Beta · Immersive
        </div>
        <h1
          className="text-white font-extralight text-2xl"
          style={{ letterSpacing: "0.55em", paddingLeft: "0.55em" }}
        >
          K S O M&nbsp;&nbsp;C A L M
        </h1>
      </motion.div>

      {/* Frosted glass buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
        className="absolute bottom-[10%] inset-x-0 px-8 space-y-3"
      >
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
