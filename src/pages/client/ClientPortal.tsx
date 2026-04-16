import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPlayer, type PortalScene } from "@/components/portal/PortalPlayer";
import { PortalEntry } from "@/components/portal/PortalEntry";
import { Sparkles, Lock, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type EntryCategory = "Focus" | "Sleep" | "Escape";

export default function ClientPortal() {
  const navigate = useNavigate();
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

  if (activeScene) {
    return <PortalPlayer scene={activeScene} onBack={() => setActiveScene(null)} />;
  }

  // Show KSOM CALM entry screen first
  if (!selectedCategory) {
    return <PortalEntry onSelectCategory={setSelectedCategory} />;
  }

  // Filter scenes by selected category (case-insensitive)
  const filteredScenes = scenes.filter(
    (s) => s.category?.toLowerCase() === selectedCategory.toLowerCase()
  );
  const grouped = { [selectedCategory]: filteredScenes };

  return (
    <ClientLayout>
      <div className="min-h-screen bg-[hsl(220,25%,4%)] pb-12">
        {/* Hero header */}
        <div className="relative px-5 pt-6 pb-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-blue-900/20 to-transparent" />
          <div className="relative">
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs mb-3 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              KSOM CALM
            </button>
            <div className="text-white/40 text-[11px] uppercase tracking-[0.25em] mb-2">
              {selectedCategory}
            </div>
            <h1 className="text-white text-3xl font-light tracking-tight">{selectedCategory} Scenes</h1>
            <p className="text-white/50 text-sm mt-2 max-w-xs">
              Step into cinematic ambient scenes. Tap any to enter full immersion.
            </p>
          </div>
        </div>

        {/* Scene grid */}
        <div className="px-4 space-y-8">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
            </div>
          ) : scenes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-white/40">
              <Sparkles className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">No scenes yet</p>
              <p className="text-xs mt-1">Your trainer hasn't added Portal scenes</p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, list]) => (
              <div key={category}>
                <div className="text-white/40 text-[11px] uppercase tracking-[0.2em] mb-3 px-1">
                  {category}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {list.map((scene) => (
                    <button
                      key={scene.id}
                      onClick={() => setActiveScene(scene)}
                      className="group relative aspect-[3/4] rounded-2xl overflow-hidden ring-1 ring-white/10 hover:ring-white/30 transition-all"
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      {scene.is_premium && (
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1.5">
                          <Lock className="h-3 w-3 text-amber-300" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                        <div className="text-white text-sm font-medium leading-tight">
                          {scene.name}
                        </div>
                        {scene.description && (
                          <div className="text-white/60 text-[11px] mt-0.5 line-clamp-1">
                            {scene.description}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Comparison footer */}
          <div className="pt-8 text-center">
            <button
              onClick={() => navigate("/client/vibes")}
              className="text-white/40 hover:text-white/60 text-xs underline underline-offset-4 transition-colors"
            >
              Compare with Restore →
            </button>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
