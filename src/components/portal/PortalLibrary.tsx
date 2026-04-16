import { useMemo } from "react";
import { ArrowLeft, Lock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import type { PortalScene } from "./PortalPlayer";

interface PortalLibraryProps {
  category: "Focus" | "Sleep" | "Escape";
  scenes: PortalScene[];
  isLoading: boolean;
  onBack: () => void;
  onSelectScene: (scene: PortalScene) => void;
}

const CATEGORY_COPY: Record<string, { tagline: string; heroLabel: string }> = {
  Focus: { tagline: "Think Somewhere Different", heroLabel: "Focus" },
  Sleep: { tagline: "Drift Somewhere Quiet", heroLabel: "Sleep" },
  Escape: { tagline: "Be Somewhere Else", heroLabel: "Escape" },
};

/**
 * PortalLibrary — scrollable scene browser inspired by Portal app.
 * Sections: Hero header (looping featured video) → Favourites circles row →
 * Curated Collections (large cards) → category-grouped scene rows.
 */
export function PortalLibrary({
  category,
  scenes,
  isLoading,
  onBack,
  onSelectScene,
}: PortalLibraryProps) {
  const copy = CATEGORY_COPY[category];

  // Hero = first scene; favourites = next 6; collections = scenes flagged premium or all
  const { hero, favourites, collections, more } = useMemo(() => {
    const hero = scenes[0] ?? null;
    const favourites = scenes.slice(0, 8);
    const collections = scenes.filter((s) => s.is_premium).slice(0, 6);
    const more = scenes.slice(0, 12);
    return { hero, favourites, collections, more };
  }, [scenes]);

  return (
    <div className="fixed inset-0 z-[90] bg-black overflow-y-auto overflow-x-hidden">
      {/* Hero header */}
      <div className="relative h-[55vh] min-h-[380px] w-full overflow-hidden">
        {hero?.video_url ? (
          <video
            src={hero.video_url}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : hero?.thumbnail_url ? (
          <img
            src={hero.thumbnail_url}
            alt={hero.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black" />
        )}

        {/* Gradient overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black" />

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-0 left-0 p-4 z-10 text-white/80 hover:text-white transition-colors"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 16px)" }}
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>

        {/* Centered title */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center px-6"
        >
          <div className="h-6 w-6 rounded-full border-2 border-white/80 flex items-center justify-center mb-3">
            <div className="h-1.5 w-1.5 rounded-full bg-white/90" />
          </div>
          <h1 className="text-white text-3xl font-light tracking-[0.3em] uppercase">
            {copy.heroLabel}
          </h1>
          <p className="text-white/70 text-sm font-light italic mt-2 tracking-wide">
            {copy.tagline}
          </p>
        </motion.div>
      </div>

      {/* Body */}
      <div className="relative -mt-8 pb-24 space-y-10">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          </div>
        ) : scenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-white/40 px-6">
            <Sparkles className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">No scenes yet</p>
            <p className="text-xs mt-1">Your trainer hasn't added Portal scenes</p>
          </div>
        ) : (
          <>
            {/* Favourites — circular row */}
            {favourites.length > 0 && (
              <Section title={`${category} Favourites`}>
                <CircleRow scenes={favourites} onSelect={onSelectScene} />
              </Section>
            )}

            {/* Curated Collections — large cards */}
            {collections.length > 0 && (
              <Section title="Curated Collections">
                <CardRow scenes={collections} onSelect={onSelectScene} />
              </Section>
            )}

            {/* More scenes — circular row */}
            {more.length > 0 && (
              <Section title="Browse More">
                <CircleRow scenes={more} onSelect={onSelectScene} small />
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-white text-xl font-semibold px-5 mb-4 tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function CircleRow({
  scenes,
  onSelect,
  small,
}: {
  scenes: PortalScene[];
  onSelect: (s: PortalScene) => void;
  small?: boolean;
}) {
  const size = small ? "w-32" : "w-44";
  return (
    <div className="flex gap-4 overflow-x-auto px-5 pb-2 scrollbar-hide snap-x snap-mandatory">
      {scenes.map((scene) => (
        <button
          key={scene.id}
          onClick={() => onSelect(scene)}
          className={`shrink-0 ${size} snap-start flex flex-col items-start group`}
        >
          <div className={`relative ${size} aspect-square rounded-full overflow-hidden ring-1 ring-white/40 group-hover:ring-white/80 transition-all shadow-[0_0_24px_rgba(255,255,255,0.08)]`}>
            {scene.thumbnail_url ? (
              <img
                src={scene.thumbnail_url}
                alt={scene.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <video
                src={scene.video_url}
                muted
                loop
                playsInline
                autoPlay
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {scene.is_premium && (
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1.5">
                <Lock className="h-3 w-3 text-amber-300" />
              </div>
            )}
          </div>
          <div className="mt-3 text-left w-full">
            <div className="text-white text-xs font-bold uppercase tracking-wider truncate">
              {scene.name}
            </div>
            {scene.description && (
              <div className="text-white/40 text-[10px] uppercase tracking-widest mt-0.5 truncate">
                {scene.description}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function CardRow({
  scenes,
  onSelect,
}: {
  scenes: PortalScene[];
  onSelect: (s: PortalScene) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto px-5 pb-2 scrollbar-hide snap-x snap-mandatory">
      {scenes.map((scene) => (
        <button
          key={scene.id}
          onClick={() => onSelect(scene)}
          className="shrink-0 w-[78vw] max-w-md snap-start group"
        >
          <div className="relative aspect-[16/10] rounded-2xl overflow-hidden ring-1 ring-white/10 group-hover:ring-white/30 transition-all">
            {scene.thumbnail_url ? (
              <img
                src={scene.thumbnail_url}
                alt={scene.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            ) : (
              <video
                src={scene.video_url}
                muted
                loop
                playsInline
                autoPlay
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            {scene.is_premium && (
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full p-1.5">
                <Lock className="h-3.5 w-3.5 text-amber-300" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-right">
              <div className="text-white text-lg font-bold uppercase tracking-widest drop-shadow-lg">
                {scene.name}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
