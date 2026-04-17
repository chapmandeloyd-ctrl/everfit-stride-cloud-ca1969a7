import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPlayer, type PortalScene } from "@/components/portal/PortalPlayer";
import { PortalEntry } from "@/components/portal/PortalEntry";

type EntryCategory = "Focus" | "Sleep" | "Escape";

export default function ClientPortal() {
  const [activeScene, setActiveScene] = useState<PortalScene | null>(null);

  const { data: scenes = [] } = useQuery({
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

  // Active scene → cinematic player. Back returns to Calm entry.
  if (activeScene) {
    return <PortalPlayer scene={activeScene} onBack={() => setActiveScene(null)} />;
  }

  // Tap a category on the Calm screen → jump straight into the first scene of that category.
  const handleSelectCategory = (category: EntryCategory) => {
    const first = scenes.find(
      (s) => s.category?.toLowerCase() === category.toLowerCase()
    );
    if (first) setActiveScene(first);
  };

  return <PortalEntry onSelectCategory={handleSelectCategory} />;
}
