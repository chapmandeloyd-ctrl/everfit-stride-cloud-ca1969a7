import { useMemo } from "react";
import { X, Star, Lock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import type { PortalScene } from "./PortalPlayer";
import nebulaFocus from "@/assets/portal-nebula-focus.jpg";

interface PortalLibraryProps {
  scenes: PortalScene[];
  isLoading: boolean;
  onClose: () => void;
  onSelectScene: (scene: PortalScene) => void;
}

/**
 * PortalLibrary — Portal-app inspired library browser.
 * Layout: Hero header (PORTAL LIBRARY) → Featured large cards → grouped circle rows
 * (large circles + small "Browse More" circles) for a dynamic, varied look.
 */
export function PortalLibrary({
  scenes,
  isLoading,
  onClose,
  onSelectScene,
}: PortalLibraryProps) {
  const { featured, escapes, focus, sleep, browseMore } = useMemo(() => {
    const featured = scenes.filter((s) => s.is_premium).slice(0, 6);
    const focus = scenes.filter((s) => s.category?.toLowerCase() === "focus");
    const sleep = scenes.filter((s) => s.category?.toLowerCase() === "sleep");
    const escapes = scenes.filter((s) => s.category?.toLowerCase() === "escape");
    const browseMore = scenes.slice(0, 16);
    return {
      featured: featured.length ? featured : scenes.slice(0, 4),
      focus,
      sleep,
      escapes: escapes.length ? escapes : scenes.slice(0, 8),
      browseMore,
    };
  }, [scenes]);

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
            KSOM Calm Library
          </h1>
          <p className="text-white/70 text-sm font-light mt-3 tracking-wide">
            Transform Your Surroundings
          </p>
        </motion.div>
      </div>

      {/* Body */}
      <div className="relative -mt-6 pb-32 space-y-10">
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
            {/* Featured — large cards */}
            <Section
              title="Featured"
              subtitle="Be inspired by our team's top picks"
            >
              <CardRow scenes={featured} onSelect={onSelectScene} />
            </Section>

            {/* Our Greatest Escapes — large circles */}
            {escapes.length > 0 && (
              <Section
                title="Our Greatest Escapes"
                subtitle="Discover hidden havens in remote reaches of the world"
              >
                <CircleRow scenes={escapes} onSelect={onSelectScene} size="lg" />
              </Section>
            )}

            {/* Focus collection */}
            {focus.length > 0 && (
              <Section
                title="Find Your Focus"
                subtitle="Settle in. Tune out. Get to work."
              >
                <CircleRow scenes={focus} onSelect={onSelectScene} size="md" />
              </Section>
            )}

            {/* Sleep collection */}
            {sleep.length > 0 && (
              <Section
                title="Drift Off"
                subtitle="Gentle scenes to ease you into sleep"
              >
                <CircleRow scenes={sleep} onSelect={onSelectScene} size="md" />
              </Section>
            )}

            {/* Browse More — small circles, dense row */}
            {browseMore.length > 0 && (
              <Section title="Browse More">
                <CircleRow scenes={browseMore} onSelect={onSelectScene} size="sm" />
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
      <div className="px-10 mb-4">
        <h2 className="text-white text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-white/55 text-sm font-light mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

const SIZE_MAP = {
  lg: "w-44",
  md: "w-36",
  sm: "w-24",
} as const;

function CircleRow({
  scenes,
  onSelect,
  size,
}: {
  scenes: PortalScene[];
  onSelect: (s: PortalScene) => void;
  size: keyof typeof SIZE_MAP;
}) {
  const w = SIZE_MAP[size];
  const small = size === "sm";
  return (
    <div className="flex gap-4 overflow-x-auto pl-10 pr-6 pb-2 scrollbar-hide [scroll-padding-left:2.5rem]">
      {scenes.map((scene) => (
        <button
          key={scene.id}
          onClick={() => onSelect(scene)}
          className={`shrink-0 ${w} flex flex-col items-start group`}
        >
          <div
            className={`relative ${w} aspect-square rounded-full overflow-hidden ring-1 ring-white/50 group-hover:ring-white/90 transition-all shadow-[0_0_24px_rgba(255,255,255,0.1)]`}
          >
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
          {!small && (
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
          )}
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
    <div className="flex gap-4 overflow-x-auto pl-10 pr-6 pb-2 scrollbar-hide [scroll-padding-left:2.5rem]">
      {scenes.map((scene) => (
        <button
          key={scene.id}
          onClick={() => onSelect(scene)}
          className="shrink-0 w-[82vw] max-w-md group"
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
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
