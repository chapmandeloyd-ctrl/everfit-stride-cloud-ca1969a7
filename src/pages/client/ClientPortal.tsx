import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPlayer, type PortalScene } from "@/components/portal/PortalPlayer";
import { PortalEntry } from "@/components/portal/PortalEntry";
import { PortalLibrary } from "@/components/portal/PortalLibrary";

type EntryCategory = "Focus" | "Sleep" | "Escape";

export default function ClientPortal() {
  const [activeScene, setActiveScene] = useState<PortalScene | null>(null);
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
    const first = findFirstInCategory(category);
    if (first) setActiveScene(first);
  };

  // Active scene → cinematic player. Library can be opened from inside the player.
  if (activeScene) {
    return (
      <>
        <PortalPlayer
          scene={activeScene}
          onBack={() => setActiveScene(null)}
          onOpenLibrary={() => setLibraryOpen(true)}
          onSelectCategory={(cat) => {
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
              setActiveScene(scene);
            }}
          />
        )}
      </>
    );
  }

  return <PortalEntry onSelectCategory={handleSelectCategory} />;
}
