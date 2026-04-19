import { useMemo } from "react";
import { X, Star, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import nebulaFocus from "@/assets/portal-nebula-focus.jpg";
import type { BreathingExercise } from "@/lib/breathingExercises";
import { getExerciseMode } from "@/lib/breathingExercises";
import { BreathPreviewCircle } from "./BreathPreviewCircle";

interface BreathLibraryProps {
  exercises: BreathingExercise[];
  isLoading: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: BreathingExercise) => void;
}

/**
 * BreathLibrary — Portal-style library for breathing exercises.
 * Visually mirrors PortalLibrary (hero header + circle rows) but uses
 * gradient circles tinted by each exercise's tone with the emoji icon centered.
 */
export function BreathLibrary({
  exercises,
  isLoading,
  onClose,
  onSelectExercise,
}: BreathLibraryProps) {
  const { featured, downshift, regulate, activate, browseAll } = useMemo(() => {
    const downshift = exercises.filter((e) => getExerciseMode(e) === "downshift");
    const regulate = exercises.filter((e) => getExerciseMode(e) === "regulate");
    const activate = exercises.filter((e) => getExerciseMode(e) === "activate");
    const featured = exercises.slice(0, 4);
    return {
      featured,
      downshift,
      regulate,
      activate,
      browseAll: exercises,
    };
  }, [exercises]);

  return (
    <div className="fixed inset-0 z-[200] bg-black overflow-y-auto overflow-x-hidden">
      {/* Hero header */}
      <div className="relative h-[36vh] min-h-[280px] w-full overflow-hidden">
        <img
          src={nebulaFocus}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black" />

        {/* Top bar */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 z-10"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 16px)" }}
        >
          <button
            className="text-white/80 hover:text-white p-1"
            aria-label="Favourites"
          >
            <Star className="h-5 w-5" fill="currentColor" />
          </button>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center px-6 text-center"
        >
          <h1 className="text-white text-2xl font-light tracking-[0.3em] uppercase">
            KSOM Calm Breathing
          </h1>
          <p className="text-white/70 text-sm font-light mt-3 tracking-wide">
            Find Your Rhythm
          </p>
        </motion.div>
      </div>

      {/* Body */}
      <div className="relative -mt-6 pb-32 space-y-10">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          </div>
        ) : exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-white/40 px-6">
            <Sparkles className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">No breathing exercises yet</p>
            <p className="text-xs mt-1">Your trainer hasn't added any breathwork</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            <Section title="Featured" subtitle="Start here. Trainer-picked breaths.">
              <CardRow exercises={featured} onSelect={onSelectExercise} />
            </Section>

            {/* Downshift collection */}
            {downshift.length > 0 && (
              <Section
                title="Downshift"
                subtitle="Slow the system. Long exhales for deep calm."
              >
                <CircleRow exercises={downshift} onSelect={onSelectExercise} size="lg" />
              </Section>
            )}

            {/* Regulate collection */}
            {regulate.length > 0 && (
              <Section
                title="Regulate"
                subtitle="Center the breath. Find your baseline."
              >
                <CircleRow exercises={regulate} onSelect={onSelectExercise} size="md" />
              </Section>
            )}

            {/* Activate collection */}
            {activate.length > 0 && (
              <Section
                title="Activate"
                subtitle="Wake up. Sharpen focus."
              >
                <CircleRow exercises={activate} onSelect={onSelectExercise} size="md" />
              </Section>
            )}

            {/* Browse all — small circles */}
            {browseAll.length > 0 && (
              <Section title="Browse All">
                <CircleRow exercises={browseAll} onSelect={onSelectExercise} size="sm" />
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="px-5 mb-4">
        <h2 className="text-white text-2xl font-semibold tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-white/55 text-sm font-light mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

const SIZE_MAP = {
  lg: "w-40",
  md: "w-32",
  sm: "w-20",
} as const;

function CircleRow({
  exercises,
  onSelect,
  size,
}: {
  exercises: BreathingExercise[];
  onSelect: (e: BreathingExercise) => void;
  size: keyof typeof SIZE_MAP;
}) {
  const w = SIZE_MAP[size];
  const small = size === "sm";
  return (
    <div className="flex gap-5 overflow-x-auto px-6 pb-2 scrollbar-hide snap-x">
      {exercises.map((ex) => {
        const cycleSecs = ex.phases.reduce((a, p) => a + p.seconds, 0);
        return (
          <button
            key={ex.id}
            onClick={() => onSelect(ex)}
            className={`shrink-0 ${w} snap-start flex flex-col items-center group`}
          >
            <BreathPreviewCircle
              exercise={ex}
              className={`${w} aspect-square ring-1 ring-white/40 group-hover:ring-white/90 transition-all shadow-[0_0_24px_rgba(255,255,255,0.08)]`}
            />
            {!small && (
              <div className="mt-3 w-full text-center px-1">
                <div className="text-white text-[11px] font-bold uppercase tracking-wider truncate">
                  {ex.name}
                </div>
                <div className="text-white/40 text-[9px] uppercase tracking-[0.18em] mt-1 truncate">
                  {cycleSecs}s per cycle
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function CardRow({
  exercises,
  onSelect,
}: {
  exercises: BreathingExercise[];
  onSelect: (e: BreathingExercise) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide snap-x snap-mandatory">
      {exercises.map((ex) => {
        const cycleSecs = ex.phases.reduce((a, p) => a + p.seconds, 0);
        return (
          <button
            key={ex.id}
            onClick={() => onSelect(ex)}
            className="shrink-0 w-[82vw] max-w-md snap-start group"
          >
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden ring-1 ring-white/10 group-hover:ring-white/30 transition-all bg-black">
              <div className="absolute inset-0 scale-[1.6] origin-center">
                <BreathPreviewCircle exercise={ex} className="w-full h-full !rounded-none" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="text-white text-lg font-bold uppercase tracking-widest drop-shadow-lg">
                  {ex.name}
                </div>
                <div className="text-white/60 text-[10px] uppercase tracking-widest mt-1">
                  {cycleSecs}s · {ex.phases.map((p) => `${p.label[0]}${p.seconds}`).join(" · ")}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

