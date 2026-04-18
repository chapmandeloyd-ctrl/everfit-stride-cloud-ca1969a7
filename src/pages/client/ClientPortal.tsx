import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPlayer, type PortalScene } from "@/components/portal/PortalPlayer";
import { PortalEntry } from "@/components/portal/PortalEntry";
import { PortalLibrary } from "@/components/portal/PortalLibrary";
import { PortalBreathPlayer } from "@/components/portal/PortalBreathPlayer";

type EntryCategory = "Focus" | "Sleep" | "Escape" | "Breath";

export default function ClientPortal() {
  const [activeScene, setActiveScene] = useState<PortalScene | null>(null);
  const [breathOpen, setBreathOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

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
      setActiveScene(null);
      setBreathOpen(true);
      return;
    }
    const first = findFirstInCategory(category);
    if (first) {
      setBreathOpen(false);
      setActiveScene(first);
    }
  };

  // Breath player — independent immersive surface
  if (breathOpen) {
    return (
      <>
        <PortalBreathPlayer
          onBack={() => setBreathOpen(false)}
          onOpenLibrary={() => setLibraryOpen(true)}
          onSelectCategory={(cat) => {
            if (cat === "Breath") return;
            setBreathOpen(false);
            const next = findFirstInCategory(cat);
            if (next) setActiveScene(next);
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
      </>
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
