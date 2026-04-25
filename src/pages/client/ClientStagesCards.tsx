import { useMemo, useRef, useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  ENRICHED_STAGES,
  getStageForElapsedHours,
  getStageProgress,
} from "@/lib/fastingStagesEnriched";
import { AnimatedStageIcon } from "@/components/stages/AnimatedStageIcon";
import { useActiveFastElapsed } from "@/hooks/useActiveFastElapsed";
import { cn } from "@/lib/utils";

export default function ClientStagesCards() {
  const navigate = useNavigate();
  const { isFasting, elapsedHours } = useActiveFastElapsed();
  const currentStage = isFasting ? getStageForElapsedHours(elapsedHours) : ENRICHED_STAGES[0];
  const initialIndex = useMemo(
    () => Math.max(0, ENRICHED_STAGES.findIndex((s) => s.id === currentStage.id)),
    [currentStage.id]
  );
  const [index, setIndex] = useState(initialIndex);
  const startX = useRef<number | null>(null);

  const stage = ENRICHED_STAGES[index];
  const isCurrent = stage.id === currentStage.id && isFasting;
  const progress = isCurrent ? getStageProgress(elapsedHours, stage) : 0;

  const go = (delta: number) =>
    setIndex((i) => Math.min(ENRICHED_STAGES.length - 1, Math.max(0, i + delta)));

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    startX.current = null;
  };

  return (
    <ClientLayout>
      <div className="min-h-full" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div
          className="relative px-5 pt-4 pb-10 text-white transition-colors duration-500"
          style={{ background: `linear-gradient(160deg, ${stage.fromColor}, ${stage.toColor})` }}
        >
          <div className="flex items-center justify-between">
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => navigate("/client/stages")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="text-xs font-medium opacity-90">
              {index + 1} / {ENRICHED_STAGES.length}
            </div>
            <div className="w-10" />
          </div>

          <div className="flex items-end gap-4 mt-6">
            <AnimatedStageIcon stage={stage} size="xl" active={isCurrent} />
            <div className="flex-1 min-w-0 pb-1">
              <p className="text-xs uppercase tracking-widest opacity-80">{stage.label}</p>
              <h1 className="text-3xl font-bold leading-tight">{stage.friendlyTitle}</h1>
              <p className="text-sm opacity-90 mt-1">{stage.rangeLabel}</p>
            </div>
          </div>

          {isCurrent && (
            <div className="mt-5">
              <div className="flex justify-between text-[11px] uppercase tracking-wider opacity-90 mb-1">
                <span>You're in this stage</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/25 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-5 -mt-6 pb-6 bg-background rounded-t-3xl relative z-10 space-y-5 pt-6">
          <p className="text-base leading-relaxed text-foreground">{stage.description}</p>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              What's happening
            </h3>
            {stage.benefits.map((b, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-card animate-fade-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span
                  className="mt-1 h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: stage.accent }}
                />
                <p className="text-sm">{b}</p>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Your journey
            </h3>
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
              {ENRICHED_STAGES.map((s, i) => {
                const reached = isFasting && elapsedHours >= s.minHours;
                const isActive = i === index;
                return (
                  <button
                    key={s.id}
                    onClick={() => setIndex(i)}
                    className={cn(
                      "flex flex-col items-center gap-1 min-w-[58px] py-2 px-1 rounded-xl transition-all",
                      isActive ? "bg-muted scale-105" : "opacity-70 hover:opacity-100"
                    )}
                  >
                    <AnimatedStageIcon stage={s} size="sm" active={isActive} />
                    <span
                      className="text-[9px] font-semibold leading-tight text-center"
                      style={{ color: reached ? s.accent : undefined }}
                    >
                      {s.rangeLabel.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="fixed bottom-20 left-0 right-0 flex justify-between px-5 pointer-events-none">
          <Button
            size="icon"
            variant="secondary"
            className="h-12 w-12 rounded-full shadow-lg pointer-events-auto disabled:opacity-30"
            onClick={() => go(-1)}
            disabled={index === 0}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-12 w-12 rounded-full shadow-lg pointer-events-auto disabled:opacity-30"
            onClick={() => go(1)}
            disabled={index === ENRICHED_STAGES.length - 1}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </ClientLayout>
  );
}