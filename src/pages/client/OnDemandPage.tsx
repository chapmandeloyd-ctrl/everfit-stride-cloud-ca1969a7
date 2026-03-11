import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/hooks/useAuth";
import { Play, Clock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClientContext {
  profile: Profile;
  onSignOut: () => void;
}

export default function OnDemandPage() {
  const { profile } = useOutletContext<ClientContext>();
  const [collections, setCollections] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.id) return;

    // Fetch workout collections the client has access to
    supabase
      .from("client_workout_collection_access")
      .select("collection:workout_collections(id, name, description, cover_image_url)")
      .eq("client_id", profile.id)
      .then(({ data }) => {
        setCollections(data?.map((d: any) => d.collection).filter(Boolean) || []);
      });

    // Fetch studio programs
    supabase
      .from("client_studio_program_access")
      .select("program:studio_programs(id, name, description, cover_image_url, duration_weeks)")
      .eq("client_id", profile.id)
      .then(({ data }) => {
        setPrograms(data?.map((d: any) => d.program).filter(Boolean) || []);
      });
  }, [profile?.id]);

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading">On-Demand</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Workouts & programs you can do anytime</p>
      </div>

      {/* Studio Programs */}
      {programs.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Programs
          </p>
          {programs.map((p) => (
            <div
              key={p.id}
              className="relative rounded-2xl overflow-hidden h-40 group cursor-pointer"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform group-hover:scale-105"
                style={{
                  backgroundImage: p.cover_image_url
                    ? `url(${p.cover_image_url})`
                    : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="relative h-full flex flex-col justify-end p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white font-heading">{p.name}</h3>
                    {p.duration_weeks && (
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-white/60" />
                        <span className="text-xs text-white/60">{p.duration_weeks} weeks</span>
                      </div>
                    )}
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <Play className="h-4 w-4 text-primary-foreground ml-0.5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Workout Collections */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Collections
        </p>
        {collections.length === 0 && programs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <Play className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">No content yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your coach will add on-demand workouts and programs here.
              </p>
            </div>
          </div>
        ) : (
          collections.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-xl bg-cover bg-center flex-shrink-0"
                  style={{
                    backgroundImage: c.cover_image_url
                      ? `url(${c.cover_image_url})`
                      : undefined,
                    backgroundColor: c.cover_image_url ? undefined : "hsl(var(--muted))",
                  }}
                />
                <div>
                  <p className="text-sm font-semibold">{c.name}</p>
                  {c.description && (
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {c.description}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
