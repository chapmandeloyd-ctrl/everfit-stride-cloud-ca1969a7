import { ClientLayout } from "@/components/ClientLayout";
import { useNavigate } from "react-router-dom";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { FastingProtocolCard } from "./ClientDashboard";
// Weight tracker UI temporarily hidden — see SHOW_WEIGHT_TRACKER below.
// import { SmartPaceBanner } from "@/components/smart-pace/SmartPaceBanner";
// import { MyProgressSection } from "@/components/MyProgressSection";
import { DailyRingsPinnedHeader } from "@/components/rings/DailyRingsCard";

/**
 * Minimal client dashboard — Fasting + Smart Pace + Health tracking tiles.
 * Workouts, meals, habits, etc. are intentionally hidden.
 */
// TEMP: hide ALL weight-tracking UI on the client home dashboard.
// This covers both the Smart Pace banner (start/goal weight, debt/credit)
// and the Health Dashboard section. Flip back to true to restore.
const SHOW_WEIGHT_TRACKER = false;

export default function ClientDashboardMinimal() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();

  return (
    <ClientLayout>
      <div className="p-4 space-y-4 pb-24">
        {/* Pinned weekday strip — always visible at top */}
        <DailyRingsPinnedHeader />

        {/* Fasting timer / protocol */}
        <FastingProtocolCard clientId={clientId} navigate={navigate} />

        {/* Smart Pace banner + Health Dashboard — hidden for now.
            Flip SHOW_WEIGHT_TRACKER back to true to restore. */}
        {SHOW_WEIGHT_TRACKER && clientId && null}
      </div>
    </ClientLayout>
  );
}