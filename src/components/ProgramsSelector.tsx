import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ChevronRight, Lock, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_CONFIG, getDifficultyLabel, getDurationLabel } from "@/lib/fastingCategoryConfig";
import { usePlanGating } from "@/hooks/usePlanGating";
import type { PlanGatingMetadata } from "@/lib/planGating";
import { useState } from "react";
import { PlanLockedDialog } from "@/components/PlanLockedDialog";

interface FastingProtocol {
  id: string;
  name: string;
  category: string;
  description: string | null;
  duration_days: number;
  fast_target_hours: number;
  difficulty_level: string;
  engine_allowed: string[];
  min_level_required: number;
  max_level_allowed: number | null;
  plan_type: string;
  intensity_tier: string;
  is_extended_fast: boolean;
  is_youth_safe: boolean;
}

const FEATURED_NAMES = ["14-Day Weight Kickstart", "21-Day Deep Focus", "21-Day Rhythm Restore"];

export function ProgramsSelector({ navigate }: { navigate: (path: string) => void }) {
  const { evaluatePlan, isReady } = usePlanGating();
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);

  const { data: protocols } = useQuery({
    queryKey: ["fasting-protocols-featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("*")
        .in("name", FEATURED_NAMES);
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        difficulty_level: d.difficulty_level || "beginner",
      })) as FastingProtocol[];
    },
  });

  const sorted = FEATURED_NAMES.map((n) => protocols?.find((p) => p.name === n)).filter(Boolean) as FastingProtocol[];

  function getGating(protocol: FastingProtocol) {
    if (!isReady) return null;
    const meta: PlanGatingMetadata = {
      id: protocol.id,
      name: protocol.name,
      engine_allowed: protocol.engine_allowed || ["metabolic", "performance"],
      min_level_required: protocol.min_level_required || 1,
      max_level_allowed: protocol.max_level_allowed,
      plan_type: (protocol.plan_type as any) || "fasting",
      intensity_tier: (protocol.intensity_tier as any) || "low",
      is_extended_fast: protocol.is_extended_fast || false,
      is_youth_safe: protocol.is_youth_safe || false,
    };
    return evaluatePlan(meta);
  }

  const visibleProtocols = sorted.filter((p) => {
    const g = getGating(p);
    return g === null || g.isVisible;
  });

  function handleClick(protocol: FastingProtocol) {
    const g = getGating(protocol);
    if (g && !g.isAccessible) {
      setLockedMessage(g.lockMessage || "This program is currently locked.");
      return;
    }
    navigate(`/client/protocol/${protocol.id}`);
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold">Programs</h2>
          </div>
          <button
            className="text-sm font-semibold text-primary flex items-center gap-1"
            onClick={() => navigate("/client/choose-protocol")}
          >
            View All <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {visibleProtocols.map((protocol) => {
          const config = CATEGORY_CONFIG[protocol.category];
          const Icon = config?.icon || CalendarDays;
          const gating = getGating(protocol);
          const isLocked = gating && !gating.isAccessible;
          const isCoachApproved = gating?.isCoachApproved;

          return (
            <Card
              key={protocol.id}
              className={`cursor-pointer overflow-hidden transition-all ${
                isLocked ? "opacity-50 cursor-not-allowed" : "hover:shadow-md active:scale-[0.99]"
              }`}
              onClick={() => handleClick(protocol)}
            >
              <CardContent className="p-0">
                <div className="px-5 pt-4 pb-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-10 w-10 rounded-full ${config?.bgColor || "bg-primary/20"} flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${config?.color || "text-primary"}`} />
                      </div>
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${config?.color || "text-primary"}`}>
                        {config?.label || protocol.category}
                      </span>
                    </div>
                    {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                    {isCoachApproved && (
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                        <ShieldCheck className="h-3 w-3 mr-1" /> Coach Approved
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-2xl font-black tracking-tight leading-none mb-1">{protocol.name}</h3>
                  {isLocked && gating?.lockMessage && (
                    <p className="text-[10px] text-muted-foreground/70 mt-1">{gating.lockMessage}</p>
                  )}
                </div>
                <div className="mx-5 border-t" />
                <div className="px-5 py-3 flex items-center gap-5">
                  <div>
                    <span className="text-lg font-bold text-primary">{protocol.fast_target_hours}h</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Fast</span>
                  </div>
                  <div>
                    <span className="text-lg font-bold">{getDurationLabel(protocol.duration_days)}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Duration</span>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <div>
                      <span className="text-lg font-bold">{getDifficultyLabel(protocol.difficulty_level)}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Level</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PlanLockedDialog
        open={!!lockedMessage}
        onOpenChange={(open) => !open && setLockedMessage(null)}
        lockMessage={lockedMessage || ""}
        onViewRecommended={() => {
          setLockedMessage(null);
          navigate("/client/choose-protocol");
        }}
      />
    </>
  );
}
