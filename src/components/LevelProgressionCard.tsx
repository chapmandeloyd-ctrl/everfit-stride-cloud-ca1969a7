import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, CheckCircle2, Circle, Star, ArrowUp, Zap, Lock, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useLevelProgression } from "@/hooks/useLevelProgression";
import { useEngineMode } from "@/hooks/useEngineMode";
import { getLevelRange, getLevelDefinition, LEVEL_DEFINITIONS } from "@/lib/levelProgression";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Max level in the system
const MAX_LEVEL = 15;

// Extended level definitions for the 15-level system display
function getExtendedLevelName(level: number): string {
  if (level <= 7) return getLevelDefinition(level).name;
  const extended: Record<number, string> = {
    8: "Precision",
    9: "Elite Foundation",
    10: "Command",
    11: "Authority",
    12: "Specialist",
    13: "Grand Master",
    14: "Legend",
    15: "KSOM Elite",
  };
  return extended[level] || "Elite";
}

function getExtendedLevelRange(level: number, engine: string): string {
  if (level <= 7) return getLevelRange(level, engine as any);
  // Extended ranges for metabolic
  const extendedRanges: Record<number, string> = {
    8: "18–20h fasting window",
    9: "20–22h fasting window",
    10: "22–24h fasting window",
    11: "24h (OMAD)",
    12: "36h extended",
    13: "48h extended",
    14: "72h extended",
    15: "120h extended",
  };
  return extendedRanges[level] || "Advanced protocol";
}

function getExtendedLevelDescription(level: number): string {
  if (level <= 7) return getLevelDefinition(level).description;
  const descriptions: Record<number, string> = {
    8: "Precision timing and advanced metabolic control.",
    9: "Elite-level consistency with deep adaptation.",
    10: "Full metabolic command and body awareness.",
    11: "Single-meal mastery with complete control.",
    12: "Strategic extended fasting for deep reset.",
    13: "Advanced cellular renewal protocols.",
    14: "Deep autophagy and immune system reset.",
    15: "Extended regeneration — deep cellular reset",
  };
  return descriptions[level] || "Advanced execution.";
}

// Get the fasting hours display for a level
function getLevelHoursDisplay(level: number): string {
  const hoursMap: Record<number, string> = {
    1: "12-14h",
    2: "14-16h",
    3: "15-16h",
    4: "16h",
    5: "16-17h",
    6: "17-18h",
    7: "16-18h",
    8: "18-20h",
    9: "20-22h",
    10: "22-24h",
    11: "24h",
    12: "36h",
    13: "48h",
    14: "72h",
    15: "120h",
  };
  return hoursMap[level] || `${level}h`;
}

export function LevelProgressionCard() {
  const { progression, isLoading, advanceLevel, isAdvancing } = useLevelProgression();
  const { engineMode } = useEngineMode();
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const navigate = useNavigate();

  if (isLoading || !progression) return null;

  const currentLevel = progression.currentLevel;
  const nextLevel = Math.min(currentLevel + 1, MAX_LEVEL);
  const isMaxLevel = currentLevel >= MAX_LEVEL;

  const handleAdvance = () => {
    advanceLevel(undefined, {
      onSuccess: () => toast.success(`Advanced to Level ${currentLevel + 1}!`),
      onError: () => toast.error("Failed to advance level"),
    });
  };

  return (
    <div className="space-y-5">
      {/* Level Up Banner */}
      {progression.isEligible && (
        <div className="bg-gradient-to-r from-amber-500/20 to-primary/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold text-foreground">Level Up Available!</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            onClick={handleAdvance}
            disabled={isAdvancing}
          >
            {isAdvancing ? "Advancing..." : `Advance to Level ${currentLevel + 1}`}
          </Button>
        </div>
      )}

      {/* ── WHERE YOU ARE ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-xs font-bold tracking-widest uppercase text-amber-600 dark:text-amber-400">
            Where You Are
          </span>
          <div className="flex-1 h-px bg-amber-500/20" />
        </div>

        <Card className="border-0 overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <Zap className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-xs font-bold tracking-widest uppercase text-amber-600 dark:text-amber-400">
                  Current Level
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-5xl font-black tracking-tight text-foreground leading-none">
                Lv.{currentLevel}
              </h2>
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-foreground/90">
                Level {currentLevel} — {getExtendedLevelName(currentLevel)}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {getExtendedLevelDescription(currentLevel)}
              </p>
            </div>

            {/* Choose Protocol CTA */}
            <button
              onClick={() => navigate("/client/choose-protocol")}
              className="flex items-center justify-between w-full pt-2 group"
            >
              <span className="text-sm font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Choose a Protocol
              </span>
              <ChevronRight className="h-5 w-5 text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* ── YOUR NEXT LEVEL ── */}
      {!isMaxLevel && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">
              Your Next Level
            </span>
            <div className="flex-1 h-px bg-emerald-500/20" />
          </div>

          <Card className="border-2 border-emerald-400/30 overflow-hidden bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/30 shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                    <Zap className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">
                    Next Level
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] border-emerald-400/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                  LV. {nextLevel}
                </Badge>
              </div>

              <div>
                <h2 className="text-5xl font-black tracking-tight text-foreground leading-none">
                  {getLevelHoursDisplay(nextLevel)}
                </h2>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {getExtendedLevelName(nextLevel)}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wide text-foreground/80">
                    Progress to Unlock
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {progression.completionPct}%
                  </span>
                </div>
                <Progress
                  value={progression.completionPct}
                  className="h-2.5 bg-muted/60 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-green-400"
                />
              </div>

              {/* Motivational text */}
              <p className="text-xs text-muted-foreground">
                {progression.completionPct >= 80
                  ? "Almost there — keep pushing!"
                  : progression.completionPct >= 50
                  ? "You're making great progress."
                  : "You're close to peak fat-burning state"}
              </p>

              {/* Criteria checklist */}
              {progression.criteria.length > 0 && (
                <Collapsible open={criteriaOpen} onOpenChange={setCriteriaOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors pt-1">
                    <span className="font-semibold">Advancement criteria</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${criteriaOpen ? "rotate-180" : ""}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 space-y-1.5">
                    {progression.criteria.map((c) => (
                      <div key={c.label} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {c.met ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />
                          )}
                          <span className={c.met ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
                        </div>
                        <span className={`font-mono text-[10px] ${c.met ? "text-emerald-400" : "text-muted-foreground"}`}>
                          {c.current} / {c.required}
                        </span>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── THE DESTINATION ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-purple-500" />
          <span className="text-xs font-bold tracking-widest uppercase text-purple-600 dark:text-purple-400">
            The Destination
          </span>
          <div className="flex-1 h-px bg-purple-500/20" />
        </div>

        <Card className={`border-2 border-purple-400/30 overflow-hidden bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950/40 dark:to-fuchsia-950/30 shadow-sm ${isMaxLevel ? "ring-2 ring-purple-400/40" : ""}`}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
                  <Star className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-xs font-bold tracking-widest uppercase text-purple-600 dark:text-purple-400">
                  The Destination
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] border-purple-400/40 text-purple-600 dark:text-purple-400 bg-purple-500/10">
                Level {MAX_LEVEL}
              </Badge>
            </div>

            <div>
              <h2 className="text-5xl font-black tracking-tight text-purple-600 dark:text-purple-400 leading-none">
                {getLevelHoursDisplay(MAX_LEVEL)}
              </h2>
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-foreground/90">
                Level {MAX_LEVEL} — {getExtendedLevelName(MAX_LEVEL)}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {getLevelHoursDisplay(MAX_LEVEL)}. The highest level in the system.
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              The pinnacle of the KSOM system. Stay consistent.
            </p>

            {/* Lock indicator for non-max users */}
            {!isMaxLevel && (
              <div className="flex items-center gap-2 pt-1">
                <Lock className="h-3.5 w-3.5 text-purple-400/60" />
                <span className="text-[10px] text-purple-400/60 font-semibold uppercase tracking-wide">
                  Unlocking builds metabolic control
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
