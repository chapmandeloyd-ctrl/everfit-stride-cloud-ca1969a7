import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MyProgressSection } from "@/components/MyProgressSection";

interface Props {
  clientId: string;
}

interface MetricSnapshot {
  value: number;
  date: string;
}

/**
 * Collapsible wrapper for the Health Dashboard.
 * Front of card = at-a-glance: steps · sleep · calories.
 * Tap to expand → full MyProgressSection (AI Snapshot, Manual Tracking, all tiles).
 */
export function HealthDashboardCollapsible({ clientId }: Props) {
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();

  const { data: metrics } = useQuery({
    queryKey: ["health-activity-metrics", clientId],
    enabled: !!clientId && !loading && !!user,
    queryFn: async (): Promise<Record<string, MetricSnapshot>> => {
      if (!clientId) return {};
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return {};
      const response = await supabase.functions.invoke("read-health-stats", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { client_id: clientId, mode: "metric_summary" },
      });
      if (response.error) throw response.error;
      return (response.data?.metrics ?? {}) as Record<string, MetricSnapshot>;
    },
    refetchOnMount: "always",
    staleTime: 0,
  });

  const stepsRaw = metrics?.["Steps"]?.value;
  const sleepRaw = metrics?.["Sleep"]?.value;
  const calRaw = metrics?.["Caloric Intake"]?.value;

  const steps =
    stepsRaw !== undefined && stepsRaw !== null
      ? Number(stepsRaw).toLocaleString()
      : "--";
  const sleep =
    sleepRaw !== undefined && sleepRaw !== null
      ? `${Number(sleepRaw).toFixed(1)}h`
      : "--";
  const calories =
    calRaw !== undefined && calRaw !== null
      ? `${Math.round(Number(calRaw)).toLocaleString()} cal`
      : "-- cal";

  return (
    <div className="space-y-3">
      {/* Section heading + description (matches Smart Weight Tracker treatment) */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Health Dashboard</h2>
        <p className="text-muted-foreground">
          Track your weight, steps, sleep, calories, and workouts in one place.
        </p>
      </div>

      {open ? (
        <div className="space-y-2">
          <MyProgressSection clientId={clientId} />
          <button
            onClick={() => setOpen(false)}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-muted/40 hover:bg-muted/60 ring-1 ring-border py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition"
          >
            <ChevronUp className="h-3.5 w-3.5" />
            Hide details
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition hover:bg-muted/40 active:scale-[0.995]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
            <Heart className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wide text-foreground">
              Health Dashboard
            </span>
            <p className="text-sm text-muted-foreground truncate">
              {steps} steps · {sleep} sleep · {calories}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
