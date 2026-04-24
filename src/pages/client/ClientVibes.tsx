import { useEffect, useState, useCallback } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAudioMixer } from "@/hooks/useAudioMixer";
import { VibesHomeTab } from "@/components/vibes/VibesHomeTab";
import { VibesSoundsTab } from "@/components/vibes/VibesSoundsTab";
import { VibesMixesTab } from "@/components/vibes/VibesMixesTab";
import { VibesMyMixesTab } from "@/components/vibes/VibesMyMixesTab";
import { VibesSleepTab } from "@/components/vibes/VibesSleepTab";
import { VibesMiniPlayer } from "@/components/vibes/VibesMiniPlayer";
import { RestoreStateHeader } from "@/components/vibes/RestoreEntryScreen";
import { RestoreQuickStart } from "@/components/vibes/RestoreQuickStart";
import { RestoreModuleGrid, type RestoreModule } from "@/components/vibes/RestoreModuleGrid";
import { RestoreBreathingTab } from "@/components/vibes/RestoreBreathingTab";
import { RestoreSleepTab } from "@/components/vibes/RestoreSleepTab";

import { BreathingPlayer } from "@/components/vibes/BreathingPlayer";
import { type BreathingExercise } from "@/lib/breathingExercises";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useClientFeatureSettings } from "@/hooks/useClientFeatureSettings";
import { ArrowLeft, Sparkles } from "lucide-react";

type ViewState =
  | { type: "home" }
  | { type: "module"; module: RestoreModule }
  | { type: "breathing-session"; exercise: BreathingExercise }
  | { type: "soundlab" };

export default function ClientVibes() {
  const { settings, isLoading: settingsLoading } = useClientFeatureSettings();
  const mixer = useAudioMixer();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mixRefreshKey, setMixRefreshKey] = useState(0);
  const [view, setView] = useState<ViewState>({ type: "home" });

  const { data: sounds = [] } = useQuery({
    queryKey: ["vibes-sounds-client"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vibes_sounds")
        .select("*, vibes_categories(name, slug)")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["vibes-categories-client"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vibes_categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const slug = searchParams.get("mix");
    if (!slug) return;
    (async () => {
      const { data: mix } = await supabase
        .from("vibes_mixes")
        .select("id")
        .eq("share_slug", slug)
        .single();
      if (!mix) return;
      const { data: items } = await supabase
        .from("vibes_mix_items")
        .select("sound_id, volume, vibes_sounds(name, audio_url, icon_url)")
        .eq("mix_id", mix.id);
      if (!items) return;
      const loaded = items.map((it: any) => ({
        soundId: it.sound_id,
        name: it.vibes_sounds?.name || "Sound",
        url: it.vibes_sounds?.audio_url || "",
        volume: it.volume,
        iconUrl: it.vibes_sounds?.icon_url,
      }));
      mixer.loadMix(loaded);
      setView({ type: "soundlab" });
    })();
  }, [searchParams]);

  const handleMixSaved = useCallback(() => {
    setMixRefreshKey((k) => k + 1);
  }, []);

  if (settingsLoading) {
    return (
      <ClientLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </ClientLayout>
    );
  }

  // Note: we intentionally do NOT redirect when restore_enabled is false.
  // A redirect from here back to /client/dashboard caused a "screen refresh / bug"
  // feel for users whose settings row was missing or whose gate flipped briefly.
  // The Restore card on the dashboard / sidebar already gates entry; if the user
  // gets here directly, just render the experience.

  // Breathing session — full screen
  if (view.type === "breathing-session") {
    return (
      <BreathingPlayer
        exercise={view.exercise}
        onBack={() => setView({ type: "module", module: "breathing" })}
      />
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-[hsl(220,20%,5%)] pb-40">
        <div className="p-4 space-y-6">
          {/* Back button when in a module */}
          {view.type !== "home" && (
            <button
              onClick={() => setView({ type: "home" })}
              className="flex items-center gap-1.5 text-white/40 hover:text-white/60 text-xs font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}

          {/* State Header — always visible */}
          <RestoreStateHeader />

          {/* HOME VIEW */}
          {view.type === "home" && (
            <div className="space-y-8">
              {/* Portal Beta tile — for A/B testing the new immersive experience */}
              <button
                onClick={() => navigate("/client/portal")}
                className="group relative w-full overflow-hidden rounded-2xl ring-1 ring-white/10 hover:ring-white/30 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-blue-700 to-indigo-900" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
                <div className="relative p-5 flex items-center justify-between">
                  <div className="text-left">
                    <div className="flex items-center gap-2 text-white/70 text-[10px] uppercase tracking-[0.25em] mb-1">
                      <Sparkles className="h-3 w-3" />
                      Beta
                    </div>
                    <div className="text-white text-lg font-light tracking-tight">Try Portal</div>
                    <div className="text-white/60 text-xs mt-1">
                      Cinematic immersive scenes
                    </div>
                  </div>
                  <ArrowLeft className="h-5 w-5 text-white/70 rotate-180 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              <RestoreQuickStart
                onStartBreathing={(ex) =>
                  setView({ type: "breathing-session", exercise: ex })
                }
                onNavigateGuided={() =>
                  setView({ type: "module", module: "breathing" })
                }
              />
              <RestoreModuleGrid
                onModuleSelect={(mod) =>
                  mod === "soundlab"
                    ? setView({ type: "soundlab" })
                    : setView({ type: "module", module: mod })
                }
              />
            </div>
          )}

          {/* BREATHING MODULE */}
          {view.type === "module" && view.module === "breathing" && (
            <RestoreBreathingTab
              onStartSession={(ex) =>
                setView({ type: "breathing-session", exercise: ex })
              }
            />
          )}

          {/* SLEEP MODULE */}
          {view.type === "module" && view.module === "sleep" && (
            <RestoreSleepTab sounds={sounds} mixer={mixer} />
          )}

          {/* SOUND LAB MODULE */}
          {view.type === "soundlab" && (
            <div className="space-y-4">
              <Tabs defaultValue="home">
                <TabsList className="w-full grid grid-cols-4 bg-white/[0.06] border border-white/[0.06]">
                  <TabsTrigger value="home" className="text-white/50 data-[state=active]:text-white/90 data-[state=active]:bg-white/[0.08]">Home</TabsTrigger>
                  <TabsTrigger value="sounds" className="text-white/50 data-[state=active]:text-white/90 data-[state=active]:bg-white/[0.08]">Sounds</TabsTrigger>
                  <TabsTrigger value="my-mixes" className="text-white/50 data-[state=active]:text-white/90 data-[state=active]:bg-white/[0.08]">My Mixes</TabsTrigger>
                  <TabsTrigger value="mixes" className="text-white/50 data-[state=active]:text-white/90 data-[state=active]:bg-white/[0.08]">Mixes</TabsTrigger>
                </TabsList>

                <TabsContent value="home">
                  <VibesHomeTab sounds={sounds} mixer={mixer} />
                </TabsContent>
                <TabsContent value="sounds">
                  <VibesSoundsTab sounds={sounds} categories={categories} mixer={mixer} />
                </TabsContent>
                <TabsContent value="my-mixes">
                  <VibesMyMixesTab mixer={mixer} sounds={sounds} refreshKey={mixRefreshKey} />
                </TabsContent>
                <TabsContent value="mixes">
                  <VibesMixesTab mixer={mixer} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        <VibesMiniPlayer mixer={mixer} onMixSaved={handleMixSaved} />
      </div>
    </ClientLayout>
  );
}
