import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  ENRICHED_STAGES,
  getStageForElapsedHours,
  getStageProgress,
} from "@/lib/fastingStagesEnriched";
import { AnimatedStageIcon } from "@/components/stages/AnimatedStageIcon";
import { useActiveFastElapsed } from "@/hooks/useActiveFastElapsed";
import { cn } from "@/lib/utils";

export default function ClientStagesTimeline() {
  const navigate = useNavigate();
  const { isFasting, elapsedHours } = useActiveFastElapsed();
  const currentStage = isFasting ? getStageForElapsedHours(elapsedHours) : null;
  const [openId, setOpenId] = useState<string | null>(currentStage?.id ?? null);

  return (
    <ClientLayout>
      <div className="max-w-2xl mx-auto px-4 py-4 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <Button size="icon" variant="ghost" onClick={() => navigate("/client/stages")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Your Journey</h1>
            <p className="text-xs text-muted-foreground">
              Tap any stage to explore what's happening in your body.
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-[34px] top-4 bottom-4 w-px bg-gradient-to-b from-border via-border to-transparent" />

          <div className="space-y-3">
            {ENRICHED_STAGES.map((stage) => {
              const reached = isFasting && elapsedHours >= stage.minHours;
              const isCurrent = currentStage?.id === stage.id;
              const progress = isCurrent ? getStageProgress(elapsedHours, stage) : reached ? 1 : 0;
              const isOpen = openId === stage.id;

              return (
                <div key={stage.id} className="relative pl-[80px]">
                  <div className="absolute left-0 top-1">
                    <AnimatedStageIcon
                      stage={stage}
                      size="md"
                      active={isCurrent}
                      className={cn(!reached && !isCurrent && "opacity-60 grayscale-[0.3]")}
                    />
                  </div>

                  <button
                    onClick={() => setOpenId(isOpen ? null : stage.id)}
                    className={cn(
                      "w-full text-left rounded-2xl border bg-card transition-all overflow-hidden",
                      isCurrent
                        ? "border-transparent shadow-md"
                        : "border-border hover:border-foreground/20"
                    )}
                    style={
                      isCurrent
                        ? {
                            background: `linear-gradient(135deg, ${stage.fromColor}15, ${stage.toColor}10)`,
                            borderColor: `${stage.accent}55`,
                          }
                        : undefined
                    }
                  >
                    <div className="px-4 py-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm leading-tight">
                            {stage.friendlyTitle}
                          </h3>
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: `${stage.accent}22`, color: stage.accent }}
                          >
                            {stage.rangeLabel}
                          </span>
                          {isCurrent && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white animate-pulse"
                              style={{ backgroundColor: stage.accent }}
                            >
                              NOW
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{stage.summary}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5 italic">
                          {stage.label}
                        </p>
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform",
                          isOpen && "rotate-180"
                        )}
                      />
                    </div>

                    {(reached || isCurrent) && (
                      <div className="h-1 bg-muted/40 mx-4 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${progress * 100}%`,
                            background: `linear-gradient(90deg, ${stage.fromColor}, ${stage.toColor})`,
                          }}
                        />
                      </div>
                    )}

                    {isOpen && (
                      <div className="px-4 py-3 border-t border-border/40 space-y-2 animate-fade-in">
                        <p className="text-sm leading-relaxed">{stage.description}</p>
                        <div className="space-y-1 pt-1">
                          {stage.benefits.map((b, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span
                                className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: stage.accent }}
                              />
                              <p className="text-xs text-muted-foreground leading-relaxed">{b}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-center text-muted-foreground py-6">
          Estimates only. Individual results may vary.
        </p>
      </div>
    </ClientLayout>
  );
}