import { motion } from "framer-motion";
import { useState } from "react";

interface PortalEntryProps {
  onSelectCategory: (category: "Focus" | "Sleep" | "Escape") => void;
}

type TitleVariant = "breathing" | "shimmer" | "serif" | "monogram";

export function PortalEntry({ onSelectCategory }: PortalEntryProps) {
  const categories: Array<"Focus" | "Sleep" | "Escape"> = ["Focus", "Sleep", "Escape"];
  const [variant, setVariant] = useState<TitleVariant>("breathing");

  const variants: Array<{ id: TitleVariant; label: string }> = [
    { id: "breathing", label: "Breathing" },
    { id: "shimmer", label: "Shimmer" },
    { id: "serif", label: "Serif" },
    { id: "monogram", label: "Monogram" },
  ];

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

      {/* Variant switcher (preview only) */}
      <div className="absolute top-3 inset-x-0 z-20 flex justify-center gap-1.5 px-4">
        {variants.map((v) => (
          <button
            key={v.id}
            onClick={() => setVariant(v.id)}
            className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] backdrop-blur-md border transition-all ${
              variant === v.id
                ? "bg-white/25 border-white/40 text-white"
                : "bg-white/5 border-white/10 text-white/50"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Title — variant 1: Breathing */}
      {variant === "breathing" && (
        <motion.div
          key="breathing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute top-[16%] inset-x-0 flex flex-col items-center"
        >
          <div className="text-white/40 text-[9px] uppercase tracking-[0.5em] mb-4">
            ksom presents
          </div>
          <motion.h1
            animate={{ scale: [1, 1.03, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="text-white font-extralight text-[44px] leading-none"
            style={{ letterSpacing: "0.15em", paddingLeft: "0.15em" }}
          >
            CALM
          </motion.h1>
        </motion.div>
      )}

      {/* Title — variant 2: Shimmer letter reveal */}
      {variant === "shimmer" && (
        <div
          key="shimmer"
          className="absolute top-[14%] inset-x-0 flex flex-col items-center"
        >
          <div className="text-white/50 text-[10px] uppercase tracking-[0.4em] mb-3">
            Beta · Immersive
          </div>
          <div className="flex gap-[0.4em]">
            {"KSOM CALM".split("").map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 8, filter: "blur(8px)" }}
                animate={{ opacity: char === " " ? 0 : 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.8, delay: i * 0.12, ease: "easeOut" }}
                className="text-white font-extralight text-[18px] inline-block"
                style={{
                  background: "linear-gradient(120deg, #fff 30%, #a5d8ff 50%, #fff 70%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 3s ease-in-out infinite",
                  width: char === " " ? "0.5em" : "auto",
                }}
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </div>
          <style>{`
            @keyframes shimmer {
              0%, 100% { background-position: 200% center; }
              50% { background-position: -200% center; }
            }
          `}</style>
        </div>
      )}

      {/* Title — variant 3: Serif split */}
      {variant === "serif" && (
        <motion.div
          key="serif"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute top-[15%] inset-x-0 flex flex-col items-center"
        >
          <div className="text-white/40 text-[9px] uppercase tracking-[0.5em] mb-4">
            the stillness engine
          </div>
          <div className="flex items-baseline gap-3">
            <span
              className="text-white font-light text-[20px]"
              style={{ letterSpacing: "0.35em", paddingLeft: "0.35em" }}
            >
              KSOM
            </span>
            <span className="text-white/40 text-[20px]">·</span>
            <span
              className="text-white text-[26px] italic"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Calm
            </span>
          </div>
        </motion.div>
      )}

      {/* Title — variant 4: Stacked monogram */}
      {variant === "monogram" && (
        <motion.div
          key="monogram"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4 }}
          className="absolute top-[12%] inset-x-0 flex flex-col items-center"
        >
          <div
            className="text-white font-extralight text-[22px] leading-none"
            style={{ letterSpacing: "0.4em", paddingLeft: "0.4em" }}
          >
            KSOM
          </div>
          <div className="w-12 h-px bg-white/30 my-3" />
          <div
            className="text-white font-extralight text-[22px] leading-none"
            style={{ letterSpacing: "0.4em", paddingLeft: "0.4em" }}
          >
            CALM
          </div>
          <div
            className="text-white/50 text-[9px] italic mt-4"
            style={{ fontFamily: "Georgia, serif" }}
          >
            the stillness engine
          </div>
        </motion.div>
      )}

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
