import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/hooks/useAuth";
import { TrendingUp, TrendingDown, Minus, Target, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ClientContext {
  profile: Profile;
  onSignOut: () => void;
}

export default function ProgressPage() {
  const { profile } = useOutletContext<ClientContext>();
  const [tiles, setTiles] = useState<any[]>([]);
  const [goal, setGoal] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [metricEntries, setMetricEntries] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!profile?.id) return;

    // Fetch progress tiles
    supabase
      .from("client_progress_tiles")
      .select("*, metric_definition:metric_definitions(name, unit)")
      .eq("client_id", profile.id)
      .eq("is_visible", true)
      .order("order_index")
      .then(({ data }) => {
        setTiles(data || []);
        // For each tile, fetch latest metric entry
        data?.forEach((tile: any) => {
          if (tile.metric_definition_id) {
            supabase
              .from("client_metrics")
              .select("id")
              .eq("client_id", profile.id)
              .eq("metric_definition_id", tile.metric_definition_id)
              .maybeSingle()
              .then(({ data: cm }) => {
                if (cm) {
                  supabase
                    .from("metric_entries")
                    .select("value, recorded_at")
                    .eq("client_metric_id", cm.id)
                    .order("recorded_at", { ascending: false })
                    .limit(1)
                    .maybeSingle()
                    .then(({ data: entry }) => {
                      if (entry) {
                        setMetricEntries((prev) => ({
                          ...prev,
                          [tile.tile_key]: entry,
                        }));
                      }
                    });
                }
              });
          }
        });
      });

    // Fetch active goal
    supabase
      .from("fitness_goals")
      .select("*")
      .eq("client_id", profile.id)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }) => setGoal(data));

    // Fetch badges
    supabase
      .from("client_badges")
      .select("*, badge:badge_definitions(name, icon, description)")
      .eq("client_id", profile.id)
      .order("earned_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setBadges(data || []));
  }, [profile?.id]);

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading">Progress</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track your journey</p>
      </div>

      {/* Active Goal */}
      {goal && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Goal
            </p>
          </div>
          <h3 className="text-base font-bold font-heading">{goal.title}</h3>
          {goal.target_value && goal.current_value !== null && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{goal.current_value} {goal.unit}</span>
                <span>{goal.target_value} {goal.unit}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, ((goal.current_value || 0) / goal.target_value) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metric Tiles */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Body Metrics
        </p>
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((tile) => {
            const entry = metricEntries[tile.tile_key];
            return (
              <div
                key={tile.id}
                className="rounded-2xl border border-border bg-card p-4 space-y-1"
              >
                <p className="text-xs font-medium text-muted-foreground">{tile.label}</p>
                <p className="text-2xl font-bold font-heading">
                  {entry?.value != null ? Number(entry.value).toFixed(1) : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {tile.unit || tile.metric_definition?.unit || ""}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Badges */}
      {badges.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-accent" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Badges Earned
            </p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {badges.map((b) => (
              <div
                key={b.id}
                className="flex-shrink-0 w-20 flex flex-col items-center gap-1 text-center"
              >
                <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center text-2xl">
                  {b.badge?.icon || "🏆"}
                </div>
                <p className="text-[10px] font-medium text-muted-foreground leading-tight">
                  {b.badge?.name}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
