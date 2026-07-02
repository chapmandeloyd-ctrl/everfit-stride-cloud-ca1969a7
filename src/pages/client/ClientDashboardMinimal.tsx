import { ClientLayout } from "@/components/ClientLayout";
import { useNavigate } from "react-router-dom";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { FastingProtocolCard } from "./ClientDashboard";
import { SmartPaceCollapsible } from "@/components/smart-pace/SmartPaceCollapsible";
import { HealthDashboardCollapsible } from "@/components/health/HealthDashboardCollapsible";
import { DailyRingsPinnedHeader } from "@/components/rings/DailyRingsCard";
import { WaterTrackerCard } from "@/components/client/WaterTrackerCard";
import { StepTrackerCard } from "@/components/client/StepTrackerCard";
import { DailyJournalCard } from "@/components/daily-journal/DailyJournalCard";
import { LiveScheduleHost } from "@/components/client/LiveScheduleHost";
import { openLiveSchedule } from "@/lib/liveScheduleBus";
import { CalendarDays, ChevronRight, Sparkles } from "lucide-react";

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
        {clientId && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => openLiveSchedule()}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/5 py-3 text-xs uppercase tracking-widest font-bold text-primary hover:bg-primary/10 transition-colors"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Open Live Schedule to Start
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/client/program")}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2.5 text-[11px] uppercase tracking-widest font-bold text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Why your plan works
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <LiveScheduleHost />

        {/* Daily Journal — mood, body, meals */}
        {clientId && <DailyJournalCard />}

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