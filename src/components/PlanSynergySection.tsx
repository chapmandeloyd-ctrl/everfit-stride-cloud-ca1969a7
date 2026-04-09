import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles, Loader2, AlertTriangle, CheckCircle2, Heart,
  Clock, MessageSquare, Cog, FlaskConical, ShieldAlert
} from "lucide-react";
import { usePlanSynergy } from "@/hooks/usePlanSynergy";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

  // Fetch keto type color for dynamic theming
  const { data: ketoType } = useQuery({
    queryKey: ["synergy-keto-color", ketoTypeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("keto_types")
        .select("color")
        .eq("id", ketoTypeId!)
        .single();
      return data;
    },
    enabled: !!ketoTypeId,
  });

  const themeColor = ketoType?.color || "#ef4444";

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

  // Fallback for non-JSON content
  if (!structured) {
    return (
      <Card className="overflow-hidden relative" style={{ borderColor: `${themeColor}40` }}>
        <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: themeColor }} />
        <CardContent className="p-5 pl-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ backgroundColor: `${themeColor}15` }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: themeColor }} />
            </div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: themeColor }}>
              Protocol + Keto Synergy
            </h3>
          </div>
          <p className="text-[15px] leading-relaxed text-foreground">{synergy.synergy_text}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── KETO SYNERGY ── */}
      <Card className="overflow-hidden relative" style={{ borderColor: `${themeColor}40` }}>
        <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: themeColor }} />
        <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: `linear-gradient(90deg, ${themeColor}, hsl(var(--primary)), ${themeColor})` }} />
        <CardContent className="p-4 pl-5 pt-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ backgroundColor: `${themeColor}15` }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: themeColor }} />
            </div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: themeColor }}>
              Protocol + Keto Synergy
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            {structured.keto_synergy}
          </p>
        </CardContent>
      </Card>

      {/* ── HOW IT WORKS ── */}
      {structured.how_it_works && (
        <Card className="overflow-hidden relative border-border/50">
          <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: `${themeColor}60` }} />
          <CardContent className="p-4 pl-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${themeColor}12` }}>
                <Cog className="h-3.5 w-3.5" style={{ color: themeColor }} />
              </div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                How It Works
              </h4>
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              {structured.how_it_works}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── THE SCIENCE ── */}
      {structured.the_science && (
        <Card className="overflow-hidden relative border-border/50">
          <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: `${themeColor}60` }} />
          <CardContent className="p-4 pl-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${themeColor}12` }}>
                <FlaskConical className="h-3.5 w-3.5" style={{ color: themeColor }} />
              </div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                The Science
              </h4>
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              {structured.the_science}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── ADAPTATION TIMELINE ── */}
      {structured.adaptation_timeline && structured.adaptation_timeline.length > 0 && (
        <Card className="overflow-hidden relative border-border/50">
          <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: `${themeColor}60` }} />
          <CardContent className="p-4 pl-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${themeColor}12` }}>
                <Clock className="h-3.5 w-3.5" style={{ color: themeColor }} />
              </div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Adaptation Timeline
              </h4>
            </div>
            <div className="space-y-5">
              {structured.adaptation_timeline.map((phase, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${themeColor}15` }}
                  >
                    <span className="text-xs font-bold" style={{ color: themeColor }}>
                      {phase.phase || i + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-foreground">{phase.title}</span>
                      <span
                        className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                        style={{ color: themeColor, backgroundColor: `${themeColor}15` }}
                      >
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

      {/* ── BUILT FOR ── */}
      {structured.built_for && structured.built_for.length > 0 && (
        <Card className="overflow-hidden relative border-border/50">
          <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500/60" />
          <CardContent className="p-4 pl-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Built For
              </h4>
            </div>
            <ul className="space-y-2.5">
              {structured.built_for.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── COACH NOTES ── */}
      {structured.coach_notes && structured.coach_notes.length > 0 && (
        <Card className="overflow-hidden relative border-border/50">
          <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: `${themeColor}60` }} />
          <CardContent className="p-4 pl-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${themeColor}12` }}>
                <MessageSquare className="h-3.5 w-3.5" style={{ color: themeColor }} />
              </div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Coach Notes
              </h4>
            </div>
            <div className="space-y-3">
              {structured.coach_notes.map((note, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span
                    className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed pt-0.5">{note}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── EAT THIS / AVOID THIS ── */}
      {(structured.eat_this?.length || structured.avoid_this?.length) && (
        <div className="grid grid-cols-2 gap-3">
          {structured.eat_this && structured.eat_this.length > 0 && (
            <Card className="overflow-hidden relative border-border/50">
              <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500/60" />
              <CardContent className="p-4 pl-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <Heart className="h-3.5 w-3.5 text-emerald-500" />
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Eat This
                  </h4>
                </div>
                <ul className="space-y-2">
                  {structured.eat_this.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                      <span className="text-emerald-500 mt-0.5 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {structured.avoid_this && structured.avoid_this.length > 0 && (
            <Card className="overflow-hidden relative border-border/50">
              <div className="absolute inset-y-0 left-0 w-1 bg-destructive/60" />
              <CardContent className="p-4 pl-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-destructive">
                    Avoid
                  </h4>
                </div>
                <ul className="space-y-2">
                  {structured.avoid_this.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                      <span className="text-destructive mt-0.5 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── COACH WARNING ── */}
      {structured.coach_warning && (
        <div className="bg-destructive/10 border border-destructive/25 rounded-lg p-4 flex items-start gap-3 relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1 bg-destructive" />
          <div className="h-7 w-7 rounded-full bg-destructive/15 flex items-center justify-center shrink-0 ml-1">
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-destructive block mb-1">
              Coach Warning
            </span>
            <p className="text-sm font-semibold text-foreground">{structured.coach_warning}</p>
          </div>
        </div>
      )}

      {/* ── LEGACY FORMAT FALLBACK ── */}
      {!structured.how_it_works && structured.benefits && structured.benefits.length > 0 && (
        <Card className="overflow-hidden relative border-border/50">
          <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500/60" />
          <CardContent className="p-4 pl-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                What This Does For You
              </h4>
            </div>
            <ul className="space-y-1.5">
              {structured.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
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
