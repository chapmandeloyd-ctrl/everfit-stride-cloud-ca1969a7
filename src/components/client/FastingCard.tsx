import { Clock, CalendarDays, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActiveFastingTimer } from "./ActiveFastingTimer";
import { getDifficultyLabel } from "@/lib/fastingCategoryConfig";

interface FastingCardProps {
  protocolName?: string;
  isCoachAssigned?: boolean;
  status?: "ready" | "active" | "completed";
  onStartFast?: () => void;
  onEndFast?: () => void;
  activeFastStartAt?: string | null;
  activeFastTargetHours?: number | null;
  backgroundImageUrl?: string | null;
  lockPin?: string | null;
  fastHours?: number;
  difficultyLevel?: string;
  ketoType?: { abbreviation: string; name: string; color: string } | null;
  todayFastedHours?: number | null;
}

export function FastingCard({
  protocolName = "Eat-Stop-Eat",
  isCoachAssigned = true,
  status = "ready",
  onStartFast,
  onEndFast,
  activeFastStartAt,
  activeFastTargetHours,
  backgroundImageUrl,
  lockPin,
  fastHours = 16,
  difficultyLevel = "beginner",
  ketoType,
  todayFastedHours,
}: FastingCardProps) {
  if (status === "active" && activeFastStartAt && activeFastTargetHours) {
    return (
      <ActiveFastingTimer
        protocolName={protocolName}
        isCoachAssigned={isCoachAssigned}
        startedAt={activeFastStartAt}
        targetHours={activeFastTargetHours}
        backgroundImageUrl={backgroundImageUrl}
        lockPin={lockPin}
        onEndFast={onEndFast || (() => {})}
      />
    );
  }

  const hasBg = !!backgroundImageUrl;
  const eatWindow = Math.max(24 - fastHours, 0);

  return (
    <div className="rounded-2xl overflow-hidden border-0 shadow-lg relative">
      {hasBg && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundImageUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/40" />
        </>
      )}
      {!hasBg && <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black" />}

      <div className="relative z-10 px-5 pt-8 pb-6 space-y-4 text-white">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-bold text-white/70 uppercase tracking-wider">
              Fasting Protocol
            </p>
            {isCoachAssigned && (
              <Badge className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/20 font-semibold">
                Coach Assigned
              </Badge>
            )}
          </div>
          <h3 className="text-lg font-black mt-0.5 text-white">{protocolName}</h3>
          {ketoType && (
            <div className="flex items-center gap-2 mt-1">
              <div
                className="h-5 w-auto px-2 rounded-full flex items-center gap-1.5 text-[10px] font-bold"
                style={{ backgroundColor: `${ketoType.color || '#ef4444'}20`, color: ketoType.color || '#ef4444' }}
              >
                {ketoType.abbreviation}
                <span className="text-white/50">·</span>
                <span className="text-white/70 font-medium">{ketoType.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Clock, value: todayFastedHours != null ? `${Math.round(todayFastedHours)}h` : `${fastHours}h`, label: todayFastedHours != null ? "Fasted" : "Fast" },
            { icon: CalendarDays, value: `${eatWindow}h`, label: "Eat Window" },
            { icon: BarChart3, value: getDifficultyLabel(difficultyLevel), label: "Level" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center border border-white/10">
              <stat.icon className="h-4 w-4 mx-auto text-white/50 mb-1" />
              <p className="text-sm font-black text-white leading-tight">{stat.value}</p>
              <p className="text-[9px] text-white/50 uppercase tracking-wider font-medium mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Action */}
        {status === "ready" && (
          <Button
            onClick={onStartFast}
            className="w-full h-12 text-base font-semibold gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-sm"
            variant="ghost"
          >
            <Clock className="h-5 w-5" />
            Start Fast
          </Button>
        )}

        <p className="text-xs text-white/50 text-center">
          Need a different plan? Message your coach.
        </p>
      </div>
    </div>
  );
}
