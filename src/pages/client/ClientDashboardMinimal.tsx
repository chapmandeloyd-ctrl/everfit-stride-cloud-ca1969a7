import { ClientLayout } from "@/components/ClientLayout";
import { useNavigate } from "react-router-dom";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { FastingProtocolCard } from "./ClientDashboard";
import { SmartPaceBanner } from "@/components/smart-pace/SmartPaceBanner";
import { MyProgressSection } from "@/components/MyProgressSection";
import { DailyRingsPinnedHeader } from "@/components/rings/DailyRingsCard";

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

        {/* Fasting timer / protocol */}
        <FastingProtocolCard clientId={clientId} navigate={navigate} />

        {/* KSOM Smart Weight Tracker — Smart Pace banner + Health Dashboard */}
        {SHOW_WEIGHT_TRACKER && clientId && (
          <>
            <SmartPaceBanner clientId={clientId} />
            <MyProgressSection clientId={clientId} />
          </>
        )}
      </div>
    </ClientLayout>
  );
}