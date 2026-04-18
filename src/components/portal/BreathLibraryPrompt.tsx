import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, X, Wind } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenLibrary: () => void;
}

/**
 * Modal prompt shown when:
 *  - a quick breath session ends, or
 *  - the user taps the Breath tab while already on Breath.
 *
 * Mirrors the visual language of the other Portal popups and invites the user
 * into the (forthcoming) full Breath Library — longer durations, music, exercises.
 */
export function BreathLibraryPrompt({ open, onClose, onOpenLibrary }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(14px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[360px] rounded-3xl border border-white/15 bg-black/70 p-6 text-center"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-3 p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/15 mb-4">
                <Wind className="h-6 w-6 text-white/85" strokeWidth={1.5} />
              </div>

              <h3 className="text-white text-[15px] font-semibold tracking-[0.18em] uppercase">
                Nice Breath
              </h3>
              <p className="mt-3 text-white/65 text-[13px] leading-relaxed font-light">
                Open the <span className="text-white/90 font-medium">Breath Library</span> to access
                longer durations, music control, and more exercises.
              </p>

              <button
                onClick={onOpenLibrary}
                className="mt-6 w-full rounded-full border border-white/25 bg-white/[0.08] hover:bg-white/[0.14] text-white text-sm font-medium tracking-[0.18em] uppercase py-3.5 flex items-center justify-center gap-2 transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                Open Breath Library
              </button>

              <button
                onClick={onClose}
                className="mt-3 text-white/50 hover:text-white/80 text-[11px] uppercase tracking-[0.25em] py-2"
              >
                Not now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
