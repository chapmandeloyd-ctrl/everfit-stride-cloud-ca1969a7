import { Link } from "react-router-dom";
import { ClientLayout } from "@/components/ClientLayout";
import { Card } from "@/components/ui/card";
import { ChevronRight, Layers, Rocket } from "lucide-react";
import { ENRICHED_STAGES, getStageForElapsedHours } from "@/lib/fastingStagesEnriched";
import { AnimatedStageIcon } from "@/components/stages/AnimatedStageIcon";
import { useActiveFastElapsed } from "@/hooks/useActiveFastElapsed";

export default function ClientStages() {
  const { isFasting, elapsedHours } = useActiveFastElapsed();
  const current = isFasting ? getStageForElapsedHours(elapsedHours) : ENRICHED_STAGES[0];

  return (
    <ClientLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Fasting Stages</h1>
          <p className="text-sm text-muted-foreground">
            12 metabolic stages your body moves through as you fast. Pick a view to explore.
          </p>
        </header>

        {/* Live "current stage" hero */}
        <Card
          className="overflow-hidden border-0 p-5 text-white relative"
          style={{
            background: `linear-gradient(135deg, ${current.fromColor}, ${current.toColor})`,
          }}
        >
          <div className="flex items-center gap-4 relative z-10">
            <AnimatedStageIcon stage={current} size="lg" active />
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wider opacity-80">
                {isFasting ? "You are here" : "Preview"}
              </p>
              <h2 className="text-xl font-bold leading-tight">{current.friendlyTitle}</h2>
              <p className="text-sm opacity-90 mt-0.5">
                {current.label} · {current.rangeLabel}
              </p>
            </div>
          </div>
          <p className="text-sm opacity-95 mt-4 relative z-10">{current.summary}</p>
        </Card>

        {/* View pickers */}
        <div className="grid gap-3">
          <Link to="/client/stages/cards">
            <Card className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow active:scale-[0.99]">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Rocket className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Demo A · Swipeable Cards</p>
                <p className="text-xs text-muted-foreground">
                  Full-screen, gradient hero per stage. Swipe through your journey.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Card>
          </Link>

          <Link to="/client/stages/timeline">
            <Card className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow active:scale-[0.99]">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent/30 to-accent/5 flex items-center justify-center">
                <Layers className="h-6 w-6 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Demo B · Animated Timeline</p>
                <p className="text-xs text-muted-foreground">
                  Vertical timeline with live progress and tap-to-expand details.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Card>
          </Link>
        </div>

        <p className="text-[11px] text-center text-muted-foreground pt-4">
          Estimates only. Individual results may vary.
        </p>
      </div>
    </ClientLayout>
  );
}