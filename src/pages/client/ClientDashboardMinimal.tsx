import { ClientLayout } from "@/components/ClientLayout";
import { useNavigate } from "react-router-dom";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { FastingProtocolCard } from "./ClientDashboard";
import { SmartPaceBanner } from "@/components/smart-pace/SmartPaceBanner";
import { MyProgressSection } from "@/components/MyProgressSection";
import { StartHereDemoGallery } from "@/components/start-here/StartHereDemoGallery";
import { DailyRingsCard } from "@/components/rings/DailyRingsCard";

/**
 * TEMPORARY — while we design the new "Start Here" empty state,
 * the lion fasting timer + Smart Pace tracker are hidden so we can
 * iterate on themes in isolation. Flip this back to `false` to restore
 * the production dashboard.
 */
const SHOW_START_HERE_DEMOS = true;

/**
 * Minimal client dashboard — Fasting + Smart Pace + Health tracking tiles.
 * Workouts, meals, habits, etc. are intentionally hidden.
 */
export default function ClientDashboardMinimal() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();

  if (SHOW_START_HERE_DEMOS) {
    return (
      <ClientLayout>
        <div className="p-4 space-y-6 pb-24">
          <DailyRingsCard />
          <StartHereDemoGallery />
          {clientId && <MyProgressSection clientId={clientId} />}
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="p-4 space-y-4 pb-24">
        {/* Daily Rings — Zero-style 4-ring tracker (mocked completion for now) */}
        <DailyRingsCard />

        {/* Fasting timer / protocol */}
        <FastingProtocolCard clientId={clientId} navigate={navigate} />

        {/* Smart Pace banner if enabled (no-ops to null otherwise) */}
        <SmartPaceBanner />

        {/* Health tracking — AI Snapshot + Manual + 5 tiles
            (Body Weight, Steps, Sleep, Caloric Burn, Caloric Intake) */}
        {clientId && <MyProgressSection clientId={clientId} />}
      </div>
    </ClientLayout>
  );
}