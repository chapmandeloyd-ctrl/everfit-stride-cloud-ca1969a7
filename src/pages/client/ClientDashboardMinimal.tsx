import { ClientLayout } from "@/components/ClientLayout";
import { useNavigate } from "react-router-dom";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { FastingProtocolCard } from "./ClientDashboard";
import { SmartPaceBanner } from "@/components/smart-pace/SmartPaceBanner";
import { MyProgressSection } from "@/components/MyProgressSection";

/**
 * Minimal client dashboard — Fasting + Smart Pace + Health tracking tiles.
 * Workouts, meals, habits, etc. are intentionally hidden.
 */
export default function ClientDashboardMinimal() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();

  return (
    <ClientLayout>
      <div className="p-4 space-y-4 pb-24">
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