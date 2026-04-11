import { Card, CardContent } from "@/components/ui/card";

interface FastingStatusCardProps {
  actualHours: number;
  targetHours: number;
  completionPct: number;
  endedEarly: boolean;
}

export function FastingStatusCard({
  actualHours,
  targetHours,
  completionPct,
  endedEarly,
}: FastingStatusCardProps) {
  const hours = Math.floor(actualHours);
  const minutes = Math.round((actualHours % 1) * 60);
  const color = endedEarly ? "#f59e0b" : "#10b981";
  const bgClass = endedEarly
    ? "bg-amber-500/10 border-amber-500/30"
    : "bg-emerald-500/10 border-emerald-500/30";
  const badgeClass = endedEarly
    ? "bg-amber-500/20 text-amber-400"
    : "bg-emerald-500/20 text-emerald-400";

  return (
    <div className="space-y-2 mt-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Fasting Status
      </h2>
      <div className={`rounded-xl p-3 border backdrop-blur-xl ${bgClass}`}>
        <div className="flex items-center gap-3">
          {/* Progress ring */}
          <div className="relative h-12 w-12 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke="white" strokeWidth="3" opacity={0.1}
              />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke={color}
                strokeWidth="3"
                strokeDasharray={`${completionPct} ${100 - completionPct}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">
              {completionPct}%
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
              {endedEarly ? "Partial" : "Completed"}
            </span>
            <p className="text-sm font-bold text-white mt-1">
              {hours}h {minutes}m fasted
            </p>
            <p className="text-[10px] text-white/50">
              {endedEarly
                ? `${Math.round(actualHours)} of ${targetHours}h target`
                : `${targetHours}h target reached`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
