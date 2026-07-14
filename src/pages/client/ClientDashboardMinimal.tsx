import { ClientLayout } from "@/components/ClientLayout";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BookOpen, Droplet, Footprints } from "lucide-react";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { FastingProtocolCard } from "./ClientDashboard";
import { SmartPaceCollapsible } from "@/components/smart-pace/SmartPaceCollapsible";
import { HealthDashboardCollapsible } from "@/components/health/HealthDashboardCollapsible";
import { DailyRingsPinnedHeader } from "@/components/rings/DailyRingsCard";
import { WaterTrackerCard } from "@/components/client/WaterTrackerCard";
import { StepTrackerCard } from "@/components/client/StepTrackerCard";
import { DailyJournalCard } from "@/components/daily-journal/DailyJournalCard";
import { LiveScheduleHost } from "@/components/client/LiveScheduleHost";
import { CollapsibleTile } from "@/components/client/CollapsibleTile";
import { supabase } from "@/integrations/supabase/client";

/**
 * Minimal client dashboard — Fasting + Smart Pace + Health tracking tiles.
 * Workouts, meals, habits, etc. are intentionally hidden.
 */
const SHOW_WEIGHT_TRACKER = true;

export default function ClientDashboardMinimal() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();
  const today = format(new Date(), "yyyy-MM-dd");

  // Water summary — total oz today vs goal
  const { data: waterSummary } = useQuery({
    queryKey: ["tile-water-summary", clientId, today],
    enabled: !!clientId,
    staleTime: 30_000,
    queryFn: async () => {
      const [{ data: goalRow }, { data: logs }] = await Promise.all([
        supabase
          .from("water_goal_settings")
          .select("daily_goal_oz, unit")
          .eq("client_id", clientId!)
          .maybeSingle(),
        supabase
          .from("water_log_entries")
          .select("amount_oz, logged_at")
          .eq("client_id", clientId!)
          .gte("logged_at", `${today}T00:00:00`)
          .lte("logged_at", `${today}T23:59:59`),
      ]);
      const goalOz = Number(goalRow?.daily_goal_oz ?? 64);
      const totalOz = (logs ?? []).reduce((s, r: any) => s + Number(r.amount_oz ?? 0), 0);
      const unit = (goalRow?.unit as string) ?? "fl_oz";
      return { goalOz, totalOz, unit };
    },
  });

  // Steps summary — today's steps from health_data
  const { data: stepsSummary } = useQuery({
    queryKey: ["tile-steps-summary", clientId, today],
    enabled: !!clientId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("health_data")
        .select("value, recorded_at")
        .eq("client_id", clientId!)
        .eq("data_type", "steps")
        .gte("recorded_at", `${today}T00:00:00`)
        .lte("recorded_at", `${today}T23:59:59`);
      const steps = (data ?? []).reduce((s, r: any) => s + Number(r.value ?? 0), 0);
      return { steps, goal: 10000 };
    },
  });

  // Journal summary — did they log today?
  const { data: journalSummary } = useQuery({
    queryKey: ["tile-journal-summary", clientId, today],
    enabled: !!clientId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_journal_entries")
        .select("mood, note")
        .eq("client_id", clientId!)
        .eq("entry_date", today)
        .maybeSingle();
      return data;
    },
  });

  const fmtOz = (oz: number) =>
    waterSummary?.unit === "liter"
      ? `${(oz / 33.814).toFixed(1)} L`
      : `${Math.round(oz)} fl oz`;

  const waterPct = waterSummary?.goalOz
    ? Math.round((waterSummary.totalOz / waterSummary.goalOz) * 100)
    : 0;
  const stepsPct = stepsSummary?.goal
    ? Math.round((stepsSummary.steps / stepsSummary.goal) * 100)
    : 0;

  return (
    <ClientLayout>
      <div className="p-4 space-y-4 pb-24">
        {/* Pinned weekday strip — always visible at top */}
        <DailyRingsPinnedHeader />

        {/* Smart Weight Tracker — collapsible, above fasting */}
        {SHOW_WEIGHT_TRACKER && clientId && (
          <div className="space-y-3">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Smart Weight Tracker
              </h2>
              <p className="text-muted-foreground">
                Your real-pace coach. Adjusts daily targets based on every weigh-in
                so you always know exactly what to lose today to stay on track.
              </p>
            </div>
            <SmartPaceCollapsible />
          </div>
        )}

        {/* Fasting timer / protocol */}
        <FastingProtocolCard clientId={clientId} navigate={navigate} />
        <LiveScheduleHost />

        {/* Daily Journal — mood, body, meals */}
        {clientId && (
          <CollapsibleTile
            icon={BookOpen}
            title="Daily Journal"
            iconTone="success"
            storageKey="daily-journal"
            statusPill={
              journalSummary
                ? { label: "Logged", tone: "success" }
                : { label: "Open", tone: "warning" }
            }
            summary={
              journalSummary?.note
                ? `${journalSummary.mood ?? "🙂"} ${journalSummary.note}`
                : journalSummary?.mood
                ? `${journalSummary.mood} · logged today`
                : "How was your day?"
            }
          >
            <DailyJournalCard />
          </CollapsibleTile>
        )}

        {/* Daily Water Tracker */}
        {clientId && (
          <CollapsibleTile
            icon={Droplet}
            title="Daily Water Goal"
            iconTone="info"
            storageKey="daily-water"
            statusPill={
              waterPct >= 100
                ? { label: "Done", tone: "success" }
                : waterPct > 0
                ? { label: `${waterPct}%`, tone: "info" }
                : undefined
            }
            summary={
              waterSummary
                ? `${fmtOz(waterSummary.totalOz)} / ${fmtOz(waterSummary.goalOz)} · ${waterPct}%`
                : "Tap to log water"
            }
          >
            <WaterTrackerCard />
          </CollapsibleTile>
        )}

        {/* Daily Step Tracker (Apple Health snapshot) */}
        {clientId && (
          <CollapsibleTile
            icon={Footprints}
            title="Daily Step Goal"
            iconTone="success"
            storageKey="daily-steps"
            statusPill={
              stepsPct >= 100
                ? { label: "Done", tone: "success" }
                : stepsPct > 0
                ? { label: `${stepsPct}%`, tone: "success" }
                : undefined
            }
            summary={
              stepsSummary
                ? `${stepsSummary.steps.toLocaleString()} / ${stepsSummary.goal.toLocaleString()} steps · ${stepsPct}%`
                : "0 / 10,000 steps"
            }
          >
            <StepTrackerCard />
          </CollapsibleTile>
        )}

        {/* Health Dashboard — collapsible */}
        {SHOW_WEIGHT_TRACKER && clientId && (
          <HealthDashboardCollapsible clientId={clientId} />
        )}
      </div>
    </ClientLayout>
  );
}