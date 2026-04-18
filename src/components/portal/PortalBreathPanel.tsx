import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, CircleDot, Moon, Globe, Wind, Music2, Timer, Check } from "lucide-react";
import { BREATHING_EXERCISES, type BreathingExercise } from "@/lib/breathingExercises";

type Category = "Focus" | "Sleep" | "Escape" | "Breath";

interface PortalBreathPanelProps {
  open: boolean;
  onClose: () => void;
  onOpenLibrary: () => void;
  onSelectCategory: (category: Category) => void;
  activeExerciseId: string;
  onSelectExercise: (ex: BreathingExercise) => void;
  durationMin: number;
  onSelectDuration: (min: number) => void;
  musicTrack: string;
  musicTracks: string[];
  onSelectMusic: (track: string) => void;
}

const DURATIONS_MIN = [3, 5, 10, 15, 20];

/**
 * PortalBreathPanel — slide-up sheet for the Breath player.
 * Matches PortalControlPanel chrome but exposes breathing-specific
 * controls: exercise library, duration, background music.
 */
export function PortalBreathPanel({
  open,
  onClose,
  onOpenLibrary,
  onSelectCategory,
  activeExerciseId,
  onSelectExercise,
  durationMin,
  onSelectDuration,
  musicTrack,
  musicTracks,
  onSelectMusic,
}: PortalBreathPanelProps) {
  const tabs: Array<{ key: Category; icon: typeof CircleDot }> = [
    { key: "Focus", icon: CircleDot },
    { key: "Sleep", icon: Moon },
    { key: "Escape", icon: Globe },
    { key: "Breath", icon: Wind },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 z-[110] bg-black/40"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
            className="absolute inset-x-0 bottom-0 z-[120] bg-black/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl max-h-[85vh] flex flex-col"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}
          >
            {/* Title row */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0">
              <div className="w-6" />
              <h2 className="text-white text-base font-light tracking-[0.5em] uppercase">
                Breath
              </h2>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white p-1"
                aria-label="Close"
              >
                <X className="h-6 w-6" strokeWidth={1.5} />
              </button>
            </div>

            <div className="h-px bg-white/10 mx-6 shrink-0" />

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              {/* Breathing exercise library */}
              <div className="px-6 pt-5 pb-2">
                <div className="text-white/40 text-[10px] uppercase tracking-[0.3em] mb-3">
                  Breathing Library
                </div>
                <div className="space-y-2">
                  {BREATHING_EXERCISES.map((ex) => {
                    const active = ex.id === activeExerciseId;
                    const rhythm = ex.phases.map((p) => p.seconds).join("·");
                    return (
                      <button
                        key={ex.id}
                        onClick={() => onSelectExercise(ex)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                          active
                            ? "bg-white/[0.10] border-white/30 text-white"
                            : "bg-white/[0.02] border-white/10 text-white/75 hover:bg-white/[0.06] hover:border-white/20"
                        }`}
                      >
                        <span className="text-2xl shrink-0">{ex.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{ex.name}</div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-0.5">
                            {rhythm} · {ex.phases.map((p) => p.label[0]).join("-")}
                          </div>
                        </div>
                        {active && <Check className="h-4 w-4 text-white shrink-0" strokeWidth={2} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-white/10 mx-6 my-5" />

              {/* Duration */}
              <div className="px-6 pb-5">
                <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase tracking-[0.3em] mb-3">
                  <Timer className="h-3 w-3" /> Duration
                </div>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS_MIN.map((m) => {
                    const on = m === durationMin;
                    return (
                      <button
                        key={m}
                        onClick={() => onSelectDuration(m)}
                        className={`px-4 py-2 rounded-full text-xs border transition ${
                          on
                            ? "bg-white text-black border-white"
                            : "border-white/15 text-white/70 hover:border-white/40"
                        }`}
                      >
                        {m} min
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-white/10 mx-6" />

              {/* Background music */}
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase tracking-[0.3em] mb-3">
                  <Music2 className="h-3 w-3" /> Background Music
                </div>
                <div className="flex flex-wrap gap-2">
                  {musicTracks.map((t) => {
                    const on = t === musicTrack;
                    return (
                      <button
                        key={t}
                        onClick={() => onSelectMusic(t)}
                        className={`px-4 py-2 rounded-full text-xs border transition flex items-center gap-1.5 ${
                          on
                            ? "bg-white text-black border-white"
                            : "border-white/15 text-white/70 hover:border-white/40"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-white/10 mx-6" />

              {/* Open Library pill */}
              <div className="px-6 py-5">
                <button
                  onClick={onOpenLibrary}
                  className="w-full py-4 rounded-full bg-white/[0.04] border border-white/15 text-white/90 text-sm font-light tracking-[0.3em] uppercase hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <BookOpen className="h-4 w-4" strokeWidth={1.5} />
                  Open Library
                </button>
              </div>
            </div>

            {/* Category tabs (sticky at bottom of sheet) */}
            <div className="px-4 pb-4 pt-2 shrink-0 border-t border-white/5">
              <div className="grid grid-cols-4 bg-white/[0.04] rounded-xl overflow-hidden border border-white/10">
                {tabs.map(({ key, icon: Icon }) => {
                  const active = key === "Breath";
                  return (
                    <button
                      key={key}
                      onClick={() => onSelectCategory(key)}
                      className={`relative py-3.5 flex flex-col items-center gap-1.5 transition-colors ${
                        active
                          ? "bg-white/[0.08] text-white"
                          : "text-white/55 hover:text-white/85"
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                      <span className="text-[10px] uppercase tracking-[0.3em] font-medium">
                        {key}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
