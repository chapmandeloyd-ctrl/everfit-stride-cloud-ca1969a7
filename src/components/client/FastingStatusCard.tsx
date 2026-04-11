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
  const bgClass = endedEarly
    ? "bg-amber-500/14 border-amber-500/30"
    : "bg-emerald-500/14 border-emerald-500/30";
  const badgeClass = endedEarly
    ? "bg-amber-500/18 text-amber-950 dark:text-amber-50 ring-1 ring-amber-500/25"
    : "bg-emerald-500/18 text-emerald-950 dark:text-emerald-50 ring-1 ring-emerald-500/25";
  const ringClass = endedEarly
    ? "text-amber-600 dark:text-amber-300"
    : "text-emerald-600 dark:text-emerald-300";

  return (
    <div className="space-y-2 mt-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Fasting Status
      </h2>
      <div className={`relative overflow-hidden rounded-xl border p-3 backdrop-blur-xl ${bgClass}`}>
        <div className="absolute inset-0 bg-card/20" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          {/* Progress ring */}
          <div className="relative h-12 w-12 flex-shrink-0">
            <svg viewBox="0 0 36 36" className={`h-12 w-12 -rotate-90 ${ringClass}`}>
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke="currentColor" strokeWidth="3" opacity={0.18}
              />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${completionPct} ${100 - completionPct}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 m-auto flex h-7 w-7 items-center justify-center rounded-full bg-background/85 text-[10px] font-black text-foreground shadow-sm">
              {completionPct}%
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
              {endedEarly ? "Partial" : "Completed"}
            </span>
            <p className="mt-1 text-sm font-bold text-foreground">
              {hours}h {minutes}m fasted
            </p>
            <p className="text-[10px] text-foreground/70">
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
