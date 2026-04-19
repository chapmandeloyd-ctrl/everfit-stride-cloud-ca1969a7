import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPlayer, type PortalScene } from "@/components/portal/PortalPlayer";
import { PortalEntry } from "@/components/portal/PortalEntry";
import { PortalLibrary } from "@/components/portal/PortalLibrary";
import { BreathingPlayer } from "@/components/vibes/BreathingPlayer";
import { BREATHING_EXERCISES, type BreathingExercise } from "@/lib/breathingExercises";
import { PortalBreathPreview } from "@/components/portal/PortalBreathPreview";
import { BreathLibraryPrompt } from "@/components/portal/BreathLibraryPrompt";
import { BreathLibrary } from "@/components/portal/BreathLibrary";
import { useBreathingExercises } from "@/hooks/useBreathingExercises";
import type { BreathParticleStyle } from "@/components/portal/BreathParticles";

type EntryCategory = "Focus" | "Sleep" | "Escape" | "Breath";
type BreathStage = "preview" | "player";

// Default breath quick-session = Ocean Downshift (4-2-6)
const DEFAULT_BREATH_EXERCISE =
  BREATHING_EXERCISES.find((e) => e.id === "ocean-wave") ?? BREATHING_EXERCISES[0];

export default function ClientPortal() {
  const [activeScene, setActiveScene] = useState<PortalScene | null>(null);
  const [breathOpen, setBreathOpen] = useState(false);
  const [breathStage, setBreathStage] = useState<BreathStage>("preview");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [breathLibraryOpen, setBreathLibraryOpen] = useState(false);
  const [breathPromptOpen, setBreathPromptOpen] = useState(false);
  const [breathStyle, setBreathStyle] = useState<BreathParticleStyle>("aurora");
  const [activeExercise, setActiveExercise] = useState<BreathingExercise | null>(null);

  const { exercises, isLoading: exercisesLoading } = useBreathingExercises();

  const { data: scenes = [], isLoading } = useQuery({
    queryKey: ["portal-scenes-client"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_scenes")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as PortalScene[];
    },
  });

  const findFirstInCategory = (category: EntryCategory) =>
    scenes.find((s) => s.category?.toLowerCase() === category.toLowerCase()) ?? null;

  const handleSelectCategory = (category: EntryCategory) => {
    if (category === "Breath") {
      // If already on Breath circle, re-tapping opens the library prompt (matches other categories)
      if (breathOpen && breathStage === "preview") {
        setBreathPromptOpen(true);
        return;
      }
      setActiveScene(null);
      setBreathStage("preview");
      setBreathOpen(true);
      return;
    }
    const first = findFirstInCategory(category);
    if (first) {
      setBreathOpen(false);
      setActiveScene(first);
    }
  };

  // Breath flow: circle preview → drag down → quick-start full player
  if (breathOpen) {
    if (breathStage === "preview") {
      return (
        <>
          <PortalBreathPreview
            onBack={() => setBreathOpen(false)}
            onExpand={() => setBreathStage("player")}
            audioPaused={libraryOpen || breathPromptOpen}
            style={breathStyle}
            onStyleChange={setBreathStyle}
            onOpenBreathLibrary={() => setBreathPromptOpen(true)}
            onSelectCategory={(cat) => {
              if (cat === "Breath") {
                setBreathPromptOpen(true);
                return;
              }
              const next = findFirstInCategory(cat);
              if (next) {
                setBreathOpen(false);
                setActiveScene(next);
              }
            }}
          />
          {libraryOpen && (
            <PortalLibrary
              scenes={scenes}
              isLoading={isLoading}
              onClose={() => setLibraryOpen(false)}
              onSelectScene={(scene) => {
                setLibraryOpen(false);
                setBreathOpen(false);
                setActiveScene(scene);
              }}
            />
          )}
          <BreathLibraryPrompt
            open={breathPromptOpen}
            onClose={() => setBreathPromptOpen(false)}
            onOpenLibrary={() => {
              // TODO: route to dedicated Breath Library when built;
              // for now reuse the Portal library overlay.
              setBreathPromptOpen(false);
              setLibraryOpen(true);
            }}
          />
        </>
      );
    }

    return (
      <BreathingPlayer
        exercise={DEFAULT_BREATH_EXERCISE}
        quickStart
        quickDurationSecs={30}
        onBack={() => {
          setBreathStage("preview");
          setBreathPromptOpen(true);
        }}
        onComplete={() => {
          setBreathStage("preview");
          setBreathPromptOpen(true);
        }}
      />
    );
  }

  // Active scene → cinematic player. Library can be opened from inside the player.
  if (activeScene) {
    return (
      <>
        <PortalPlayer
          scene={activeScene}
          onBack={() => setActiveScene(null)}
          onOpenLibrary={() => setLibraryOpen(true)}
          onSelectCategory={(cat) => {
            if (cat === "Breath") {
              setActiveScene(null);
              setBreathStage("preview");
              setBreathOpen(true);
              return;
            }
            const next = findFirstInCategory(cat);
            if (next) setActiveScene(next);
          }}
          audioPaused={libraryOpen}
        />
        {libraryOpen && (
          <PortalLibrary
            scenes={scenes}
            isLoading={isLoading}
            onClose={() => setLibraryOpen(false)}
            onSelectScene={(scene) => {
              setLibraryOpen(false);
              setActiveScene(scene);
            }}
          />
        )}
      </>
    );
  }

  return <PortalEntry onSelectCategory={handleSelectCategory} />;
}
