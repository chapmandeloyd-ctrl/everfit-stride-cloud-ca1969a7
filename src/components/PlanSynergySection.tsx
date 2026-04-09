import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, Heart, BookOpen, Clock, MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { usePlanSynergy } from "@/hooks/usePlanSynergy";
import { useMemo } from "react";

interface PlanSynergySectionProps {
  protocolType: "program" | "quick_plan" | null;
  protocolId: string | null;
  ketoTypeId: string | null;
}

interface StructuredSynergy {
  keto_synergy: string;
  how_it_works?: string;
  the_science?: string;
  adaptation_timeline?: { phase: number; title: string; period: string; detail: string }[];
  built_for?: string[];
  coach_notes?: string[];
  eat_this?: string[];
  avoid_this?: string[];
  coach_warning?: string;
  // Legacy fields
  benefits?: string[];
  execution?: string[];
  timeline?: { period: string; detail: string }[];
}

function parseStructuredSynergy(raw: string): StructuredSynergy | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.keto_synergy) return parsed;
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

  const isNewFormat = !!structured.how_it_works;

  return (
    <div className="space-y-4">
      {/* KETO SYNERGY */}
      <Card className="overflow-hidden border-primary/25 relative">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-orange-500 to-red-500" />
        <CardContent className="p-4 pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Protocol + Keto Synergy
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            {structured.keto_synergy}
          </p>
        </CardContent>
      </Card>

      {/* HOW IT WORKS */}
      {structured.how_it_works && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              How It Works
            </h4>
            <p className="text-sm leading-relaxed text-foreground">
              {structured.how_it_works}
            </p>
          </CardContent>
        </Card>
      )}

      {/* THE SCIENCE */}
      {structured.the_science && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              The Science
            </h4>
            <p className="text-sm leading-relaxed text-foreground">
              {structured.the_science}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ADAPTATION TIMELINE */}
      {structured.adaptation_timeline && structured.adaptation_timeline.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Adaptation Timeline
            </h4>
            <div className="space-y-5">
              {structured.adaptation_timeline.map((phase, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-destructive/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-destructive">{phase.phase || i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-foreground">{phase.title}</span>
                      <span className="text-[10px] font-semibold text-destructive bg-destructive/10 rounded-full px-2 py-0.5">
                        {phase.period}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{phase.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* BUILT FOR */}
      {structured.built_for && structured.built_for.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Built For
            </h4>
            <ul className="space-y-2.5">
              {structured.built_for.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* COACH NOTES */}
      {structured.coach_notes && structured.coach_notes.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Coach Notes
            </h4>
            <div className="space-y-3">
              {structured.coach_notes.map((note, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center text-xs font-bold text-destructive">
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed pt-0.5">{note}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* EAT THIS / AVOID THIS */}
      {(structured.eat_this?.length || structured.avoid_this?.length) && (
        <div className="grid grid-cols-2 gap-3">
          {structured.eat_this && structured.eat_this.length > 0 && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Heart className="h-3.5 w-3.5 text-green-500" />
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Eat This
                  </h4>
                </div>
                <ul className="space-y-2">
                  {structured.eat_this.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {structured.avoid_this && structured.avoid_this.length > 0 && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Avoid
                  </h4>
                </div>
                <ul className="space-y-2">
                  {structured.avoid_this.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                      <span className="text-destructive mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
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

      {/* LEGACY FORMAT FALLBACK — benefits/execution/timeline */}
      {!isNewFormat && structured.benefits && structured.benefits.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2">
              What This Does For You
            </h4>
            <ul className="space-y-1.5">
              {structured.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
