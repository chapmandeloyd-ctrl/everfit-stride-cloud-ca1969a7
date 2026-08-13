import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { formatRemaining, juiceProgress, modeMeta, type JuiceFastSession } from "@/lib/juiceFast";
import { currentJuiceStage, relevantJuiceStages } from "@/lib/juiceStages";

interface Props {
  session: JuiceFastSession;
  centerImageSrc: string;
  compact?: boolean;
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

/**
 * Day-based version of the lion ring. Same visual language as the live
 * FastingTimer: multi-colored stage arc segments across the WHOLE fast,
 * stage markers on the band, and a tappable stage pill. Purely presentational.
 */
export function JuiceFastHero({ session, centerImageSrc, compact = true }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [stageSheetOpen, setStageSheetOpen] = useState(false);
  const [sheetStageHour, setSheetStageHour] = useState<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { pct, dayNumber, remainingMs, elapsedHours } = juiceProgress(session, now);
  const meta = modeMeta(session.mode);
  const totalHours = session.planned_days * 24;

  const stages = relevantJuiceStages(session.mode, totalHours);
  const currentStage = currentJuiceStage(session.mode, elapsedHours, totalHours);
  const nextStage = stages.find((s) => s.hour > elapsedHours) ?? null;
  const nextStageDay = nextStage ? Math.floor(nextStage.hour / 24) + 1 : null;
  const hoursToNext = nextStage ? Math.max(0, Math.ceil(nextStage.hour - elapsedHours)) : 0;
  const sheetStage = stages.find((s) => s.hour === sheetStageHour) ?? currentStage;

  function openStageSheet(hour: number | null) {
    setSheetStageHour(hour);
    setStageSheetOpen(true);
  }

  const size = compact ? 236 : 300;
  const bandWidth = compact ? 32 : 40;
  const radius = (size - bandWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Colored arc segments for the elapsed portion
  const progressAngle = pct * 360;
  const arcSegments: { startAngle: number; endAngle: number; color: string }[] = [];
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const next = stages[i + 1];
    const startAngle = (stage.hour / totalHours) * 360;
    const endAngle = next ? (next.hour / totalHours) * 360 : 360;
    if (progressAngle <= startAngle) break;
    const segEnd = Math.min(endAngle, progressAngle);
    if (segEnd - startAngle < 0.3) continue;
    arcSegments.push({ startAngle, endAngle: segEnd, color: stage.color });
  }

  function stagePos(hour: number) {
    const angle = (Math.min(hour / totalHours, 1) * 360 - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  }

  const indicatorRad = (pct * 360 - 90) * (Math.PI / 180);
  const indicatorX = cx + radius * Math.cos(indicatorRad);
  const indicatorY = cy + radius * Math.sin(indicatorRad);

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "font-bold tabular-nums tracking-tight text-white drop-shadow-lg",
            compact ? "text-[2.25rem] leading-none" : "text-4xl leading-none",
          )}
        >
          {formatRemaining(remainingMs)}
        </span>
        <span className={cn("mt-1 font-bold uppercase tracking-wider text-emerald-400", compact ? "text-[9px]" : "text-[10px]")}>
          {remainingMs > 0 ? `Juice fast remaining (${Math.round(pct * 100)}%)` : "Juice fast complete"}
        </span>
      </div>

      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <img
          src={centerImageSrc}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 select-none object-contain opacity-90"
        />
        <svg width={size} height={size} className="relative z-10">
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="black" strokeWidth={bandWidth} opacity={0.85} />

          {arcSegments.map((seg, i) => (
            <path
              key={i}
              d={describeArc(cx, cy, radius, seg.startAngle - 90, seg.endAngle - 90)}
              fill="none"
              stroke={seg.color}
              strokeWidth={bandWidth}
              strokeLinecap="butt"
              className="transition-all duration-1000 ease-linear"
              style={{ filter: `drop-shadow(0 0 8px ${seg.color}66)` }}
            />
          ))}

          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="white" strokeWidth={1.5} opacity={0.7} />
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="transparent" strokeDasharray={circumference} />

          {pct > 0.005 && pct < 1 && (
            <circle
              cx={indicatorX}
              cy={indicatorY}
              r={bandWidth * 0.22}
              fill="white"
              style={{ filter: `drop-shadow(0 0 6px ${currentStage.color})` }}
            />
          )}
        </svg>

        {/* Stage markers around the ring */}
        {stages.map((stage) => {
          const pos = stagePos(stage.hour);
          const reached = elapsedHours >= stage.hour;
          const isCurrent = currentStage.hour === stage.hour;
          return (
            <div
              key={stage.hour}
              className={cn(
                "absolute z-20 flex items-center justify-center rounded-full transition-all duration-500",
                isCurrent
                  ? "h-5 w-5 -ml-2.5 -mt-2.5 scale-110"
                  : reached
                    ? "h-4 w-4 -ml-2 -mt-2 bg-card/90"
                    : "h-3.5 w-3.5 -ml-[7px] -mt-[7px] bg-muted/60 opacity-40",
              )}
              style={{
                left: pos.x,
                top: pos.y,
                ...(isCurrent
                  ? { backgroundColor: `${stage.color}25`, boxShadow: `0 0 0 2px ${stage.color}55` }
                  : reached
                    ? { boxShadow: `0 0 0 1px ${stage.color}40` }
                    : {}),
              }}
              title={`${stage.label} (day ${Math.floor(stage.hour / 24) + 1}) – ${stage.description}`}
            >
              <span className={cn("text-[8px]", !reached && "grayscale")}>{stage.icon}</span>
            </div>
          );
        })}
      </div>

      {/* Stage pill — tap for benefits */}
      <button
        type="button"
        onClick={() => openStageSheet(currentStage.hour)}
        aria-label={`View benefits of ${currentStage.label} stage`}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border bg-black/40 px-3 py-1.5 backdrop-blur-sm transition-transform hover:brightness-110 active:scale-95"
        style={{ borderColor: `${currentStage.color}66`, boxShadow: `0 0 12px ${currentStage.color}40` }}
      >
        <span className="text-sm">{currentStage.icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: currentStage.color }}>
          {currentStage.label}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-white/50">Tap ⓘ</span>
      </button>

      {/* Next-stage preview */}
      {nextStage ? (
        <button
          type="button"
          onClick={() => openStageSheet(nextStage.hour)}
          aria-label={`Preview next stage: ${nextStage.label}`}
          className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 backdrop-blur-sm transition-transform hover:brightness-125 active:scale-95"
        >
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">Next</span>
          <span className="text-xs grayscale-[0.4]">{nextStage.icon}</span>
          <span className="truncate text-[10px] font-bold uppercase tracking-wider" style={{ color: `${nextStage.color}cc` }}>
            {nextStage.label}
          </span>
          <span className="text-white/20">·</span>
          <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-wider text-white/45">
            {hoursToNext <= 24 ? `in ${hoursToNext}h` : `day ${nextStageDay}`}
          </span>
        </button>
      ) : (
        <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-white/35">
          Final stage — ride it out
        </p>
      )}

      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 backdrop-blur-sm">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">
          Day {dayNumber} of {session.planned_days}
        </span>
        <span className="text-white/25">·</span>
        <span className={cn("text-[10px] font-bold uppercase tracking-wider", meta.accent)}>{meta.label}</span>
      </div>

      <p className="mt-1 text-center text-xs font-medium text-white/50">
        {Math.floor(elapsedHours)}h in · {currentStage.description}
      </p>

      <Sheet
        open={stageSheetOpen}
        onOpenChange={(open) => {
          setStageSheetOpen(open);
          if (!open) setSheetStageHour(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-2xl border-t-0 bg-background"
          style={{ boxShadow: `0 -8px 40px ${sheetStage.color}55` }}
        >
          <SheetHeader className="text-left">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                style={{ backgroundColor: `${sheetStage.color}20`, boxShadow: `0 0 0 2px ${sheetStage.color}55` }}
              >
                {sheetStage.icon}
              </div>
              <div className="flex-1">
                <SheetTitle style={{ color: sheetStage.color }}>
                  {sheetStage.label}
                  {sheetStage.hour !== currentStage.hour && (
                    <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Upcoming
                    </span>
                  )}
                </SheetTitle>
                <SheetDescription>
                  Day {Math.floor(sheetStage.hour / 24) + 1}+ • {meta.label} • {sheetStage.description}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="mt-5">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {sheetStage.hour !== currentStage.hour ? "What changes when you reach this stage" : "What's happening in your body"}
            </h4>
            <ul className="space-y-2.5">
              {sheetStage.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: sheetStage.color }} />
                  <p className="text-sm leading-relaxed text-foreground/90">{b}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-5">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Full stage map</h4>
            <ul className="space-y-1.5">
              {stages.map((s) => (
                <li
                  key={s.hour}
                  className={cn(
                    "text-xs",
                    s.hour === sheetStage.hour ? "font-semibold" : "opacity-60",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSheetStageHour(s.hour)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/40",
                      s.hour === sheetStage.hour && "bg-muted/60",
                    )}
                  >
                    <span>{s.icon}</span>
                    <span style={{ color: s.color }}>{s.label}</span>
                    {s.hour === currentStage.hour && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Now</span>
                    )}
                    <span className="ml-auto text-[10px] text-muted-foreground">Day {Math.floor(s.hour / 24) + 1}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-6 rounded-lg bg-muted/40 px-3 py-2 text-[11px] italic text-muted-foreground">
            Stages are guides, not guarantees — hydration, electrolytes and sleep move you through them faster.
          </p>
        </SheetContent>
      </Sheet>
    </div>
  );
}
