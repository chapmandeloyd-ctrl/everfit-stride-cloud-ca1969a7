import { ClientLayout } from "@/components/ClientLayout";
import { useNavigate } from "react-router-dom";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { FastingProtocolCard } from "./ClientDashboard";
import { SmartPaceCollapsible } from "@/components/smart-pace/SmartPaceCollapsible";
import { HealthDashboardCollapsible } from "@/components/health/HealthDashboardCollapsible";
import { DailyRingsPinnedHeader } from "@/components/rings/DailyRingsCard";
import { WaterTrackerCard } from "@/components/client/WaterTrackerCard";
import { StepTrackerCard } from "@/components/client/StepTrackerCard";

/**
 * Minimal client dashboard — Fasting + Smart Pace + Health tracking tiles.
 * Workouts, meals, habits, etc. are intentionally hidden.
 */
const SHOW_WEIGHT_TRACKER = true;

export default function ClientDashboardMinimal() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();

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

        {/* Daily Water Tracker */}
        {clientId && <WaterTrackerCard />}

        {/* Daily Step Tracker (Apple Health snapshot) */}
        {clientId && <StepTrackerCard />}

        {/* Health Dashboard — collapsible */}
        {SHOW_WEIGHT_TRACKER && clientId && (
          <HealthDashboardCollapsible clientId={clientId} />
        )}
      </div>
    </ClientLayout>
  );
}