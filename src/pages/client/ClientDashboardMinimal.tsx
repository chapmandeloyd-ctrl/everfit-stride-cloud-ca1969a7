import { ClientLayout } from "@/components/ClientLayout";
import { useNavigate } from "react-router-dom";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { FastingProtocolCard } from "./ClientDashboard";
import { SmartPaceBanner } from "@/components/smart-pace/SmartPaceBanner";
import { MyProgressSection } from "@/components/MyProgressSection";
import { useClientFeatureSettings } from "@/hooks/useClientFeatureSettings";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ChevronRight } from "lucide-react";

/**
 * Minimal client dashboard — Fasting + Smart Pace + Health tracking tiles.
 * Workouts, meals, habits, etc. are intentionally hidden.
 */
export default function ClientDashboardMinimal() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();
  const { settings } = useClientFeatureSettings();

  return (
    <ClientLayout>
      <div className="p-4 space-y-4 pb-24">
        {/* Fasting timer / protocol */}
        <FastingProtocolCard clientId={clientId} navigate={navigate} />

        {/* Smart Pace banner if enabled (no-ops to null otherwise) */}
        <SmartPaceBanner />

        {/* Restore Recovery — visible when feature enabled */}
        {settings?.restore_enabled && (
          <Card
            className="overflow-hidden border-primary/20 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/client/vibes")}
          >
            <CardContent className="px-5 py-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold">Restore</h3>
                <p className="text-xs text-muted-foreground">Soundscapes, breathing & guided recovery</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        )}

        {/* Health tracking — AI Snapshot + Manual + 5 tiles
            (Body Weight, Steps, Sleep, Caloric Burn, Caloric Intake) */}
        {clientId && <MyProgressSection clientId={clientId} />}
      </div>
    </ClientLayout>
  );
}