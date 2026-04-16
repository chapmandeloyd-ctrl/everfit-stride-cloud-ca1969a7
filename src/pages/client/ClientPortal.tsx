import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPlayer, type PortalScene } from "@/components/portal/PortalPlayer";
import { PortalEntry } from "@/components/portal/PortalEntry";
import { PortalLibrary } from "@/components/portal/PortalLibrary";

type EntryCategory = "Focus" | "Sleep" | "Escape";

export default function ClientPortal() {
  const [activeScene, setActiveScene] = useState<PortalScene | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EntryCategory | null>(null);

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

  // Active scene → cinematic player
  if (activeScene) {
    return <PortalPlayer scene={activeScene} onBack={() => setActiveScene(null)} />;
  }

  // No category yet → KSOM CALM intro
  if (!selectedCategory) {
    return <PortalEntry onSelectCategory={setSelectedCategory} />;
  }

  // Category selected → scrollable Portal Library
  const filteredScenes = scenes.filter(
    (s) => s.category?.toLowerCase() === selectedCategory.toLowerCase()
  );

  return (
    <PortalLibrary
      category={selectedCategory}
      scenes={filteredScenes}
      isLoading={isLoading}
      onBack={() => setSelectedCategory(null)}
      onSelectScene={setActiveScene}
    />
  );
}
