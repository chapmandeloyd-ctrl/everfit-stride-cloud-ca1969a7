import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, Zap, Target, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePlanSynergy } from "@/hooks/usePlanSynergy";
import { useMemo } from "react";

interface PlanSynergySectionProps {
  protocolType: "program" | "quick_plan" | null;
  protocolId: string | null;
  ketoTypeId: string | null;
}

interface StructuredSynergy {
  keto_synergy: string;
  benefits: string[];
  execution: string[];
  timeline: { period: string; detail: string }[];
  coach_warning: string;
}

function parseStructuredSynergy(raw: string): StructuredSynergy | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.keto_synergy && parsed.benefits) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function PlanSynergySection({ protocolType, protocolId, ketoTypeId }: PlanSynergySectionProps) {
  const { data: synergy, isLoading } = usePlanSynergy(protocolType, protocolId, ketoTypeId);

  const structured = useMemo(() => {
    if (!synergy?.synergy_text) return null;
    return parseStructuredSynergy(synergy.synergy_text);
  }, [synergy?.synergy_text]);

  if (!protocolId || !ketoTypeId || !protocolType) return null;

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5 flex items-center justify-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Building your performance blueprint...</span>
        </CardContent>
      </Card>
    );
  }

  if (!synergy?.synergy_text) return null;

  // Fallback: if old plain-text format, render as before
  if (!structured) {
    return (
      <Card className="overflow-hidden border-primary/25 relative">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-orange-500 to-red-500" />
        <CardContent className="p-5 pt-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Protocol + Keto Synergy
            </h3>
          </div>
          <p className="text-[15px] leading-relaxed text-foreground">{synergy.synergy_text}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-primary/25 relative">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-orange-500 to-red-500" />
      <CardContent className="p-4 pt-5 space-y-4">

        {/* KETO SYNERGY */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Keto Synergy
            </h3>
          </div>
          <p className="text-sm leading-snug text-foreground font-medium">
            {structured.keto_synergy}
          </p>
        </div>

        {/* WHAT THIS DOES FOR YOU */}
        {structured.benefits?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-green-500" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
                What This Does For You
              </h4>
            </div>
            <ul className="space-y-1.5">
              {structured.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* HOW TO EXECUTE */}
        {structured.execution?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-500" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                How To Execute
              </h4>
            </div>
            <ul className="space-y-1.5">
              {structured.execution.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-blue-500 font-bold text-xs mt-0.5">→</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* TIMELINE */}
        {structured.timeline?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                What To Expect
              </h4>
            </div>
            <div className="space-y-2">
              {structured.timeline.map((t, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-[11px] font-bold text-purple-500 bg-purple-500/10 rounded px-1.5 py-0.5 whitespace-nowrap mt-0.5">
                    {t.period}
                  </span>
                  <span className="text-sm text-foreground">{t.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COACH WARNING */}
        {structured.coach_warning && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-destructive block mb-0.5">
                Coach Warning
              </span>
              <p className="text-sm font-semibold text-foreground">{structured.coach_warning}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
