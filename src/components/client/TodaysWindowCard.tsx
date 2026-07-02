import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Clock, Utensils, Flame, Info, ChevronRight, Calendar } from "lucide-react";
import { useClientComputedPlan } from "@/hooks/useClientComputedPlan";
import { useNavigate } from "react-router-dom";

type DayState = "eat" | "fast" | "refeed" | "lowcal";
const STATE_COLOR: Record<DayState, string> = {
  eat: "#22c55e",
  fast: "#ef4444",
  refeed: "#3b82f6",
  lowcal: "#eab308",
};
const STATE_LABEL: Record<DayState, string> = {
  eat: "Eat",
  fast: "Fast",
  refeed: "Refeed",
  lowcal: "Low-cal",
};

function dayState(d: any): DayState {
  if (d.isRefeed) return "refeed";
  if (d.adFast) return "fast";
  if (typeof d.fastWindow === "string" && d.fastWindow.toLowerCase().startsWith("low-cal")) return "lowcal";
  return "eat";
}

function shortDayLabel(d: any, state: DayState): string {
  if (state === "refeed") return "Refeed";
  if (state === "fast") {
    const m = /(\d+)\s*h/i.exec(d.fastWindow || "");
    return m ? `${m[1]}h` : "Fast";
  }
  if (state === "lowcal") return "Low-cal";
  // Eat day → protocol ratio like "16:8"
  const m = /^(\d+):(\d+)/.exec(d.fastWindow || "");
  return m ? `${m[1]}:${m[2]}` : "Eat";
}

/**
 * Compact "Today's Window" card rendered directly below the lion FastingProtocolCard.
 * Combines the stage header, 7-day cycle strip, today's window, and macros into a
 * single dense card. Read-only, presentation-only. Never modifies the lion card.
 */
export function TodaysWindowCard() {
  const { plan, dayIndex, ketoAccent, protocolName, ketoName, stage } = useClientComputedPlan();
  const navigate = useNavigate();
  if (!plan) return null;
  const today = plan.days[dayIndex];
  if (!today) return null;
  const accent = ketoAccent || "hsl(var(--primary))";
  const isFastDay = today.adFast;
  const isRefeed = today.isRefeed;

  // Weekday labels — only meaningful for 7-day cycles. Otherwise fall back to Day N.
  const isWeekCycle = plan.days.length === 7;
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayWeekday = new Date().getDay();
  const dayLabel = (i: number) => {
    if (isWeekCycle) {
      const offset = i - dayIndex;
      return WEEKDAYS[(todayWeekday + offset + 7) % 7];
    }
    return `D${i + 1}`;
  };

  const states = plan.days.map(dayState);
  const presentStates: DayState[] = (["eat", "fast", "refeed", "lowcal"] as DayState[])
    .filter((s) => states.includes(s));

  return (
    <Card className="overflow-hidden border-border/60 bg-card">
      <CardContent className="p-3 sm:p-4 space-y-3">
        {/* Stage header + cycle chip */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-[11px] uppercase tracking-widest font-bold text-primary truncate">
              Stage {stage.number} · {stage.label}
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="What does this stage mean?"
                  className="inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground hover:text-primary transition-colors"
                >
                  <Info className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="start" className="w-64 text-xs leading-snug">
                <p className="font-semibold mb-1">Stage {stage.number} · {stage.label}</p>
                <p className="text-muted-foreground">{stage.description}</p>
                {stage.daysUntilNext != null && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Day {stage.dayInProtocol} · {stage.daysUntilNext} days to next stage
                  </p>
                )}
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {today.omad && <Badge variant="outline" className="text-[9px] px-1.5 py-0">OMAD</Badge>}
            {today.tight && !today.omad && <Badge variant="outline" className="text-[9px] px-1.5 py-0">Tight</Badge>}
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase tracking-wider">
              {plan.days.length}-Day Cycle
            </Badge>
          </div>
        </div>

        {/* Protocol + keto subtitle */}
        {(protocolName || ketoName) && (
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
            />
            <p className="text-xs text-foreground/85 truncate">
              <span className="font-semibold">{protocolName ?? ""}</span>
              {protocolName && ketoName ? <span className="text-muted-foreground"> · </span> : null}
              <span className="text-muted-foreground">{ketoName ?? ""}</span>
            </p>
          </div>
        )}

        {/* 7-tile day strip */}
        <div
          className={`grid gap-1.5 ${plan.days.length === 7 ? "grid-cols-7" : plan.days.length <= 4 ? "grid-cols-4" : "grid-cols-7"}`}
        >
          {plan.days.map((d, i) => {
            const st = states[i];
            const isToday = i === dayIndex;
            const dotColor = STATE_COLOR[st];
            return (
              <div
                key={i}
                className="rounded-lg border p-1.5 text-center min-w-0"
                style={{
                  borderColor: isToday ? accent : "hsl(var(--border) / 0.6)",
                  background: isToday ? `${accent}12` : "hsl(var(--muted) / 0.2)",
                  boxShadow: isToday ? `0 0 0 1px ${accent}55, 0 0 12px ${accent}33` : undefined,
                }}
              >
                <div className="flex items-center justify-center gap-1">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: dotColor, boxShadow: `0 0 4px ${dotColor}` }}
                  />
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: isToday ? accent : undefined }}
                  >
                    {dayLabel(i)}
                  </p>
                </div>
                <p className="text-[10px] font-semibold tabular-nums mt-0.5 truncate">
                  {shortDayLabel(d, st)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Legend — only dots present this cycle */}
        {presentStates.length > 0 && (
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 pt-0.5">
            {presentStates.map((s) => (
              <div key={s} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: STATE_COLOR[s] }}
                />
                {STATE_LABEL[s]}
              </div>
            ))}
          </div>
        )}

        {isFastDay ? (
          <div className="rounded-lg border border-border/60 p-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">{today.fastWindow}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Water + electrolytes. No calories today.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <WindowTile
              icon={<Utensils className="h-3.5 w-3.5" />}
              label="Break fast"
              value={today.eatStart}
            />
            <WindowTile
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Last meal by"
              value={today.eatEnd}
            />
          </div>
        )}

        {!isFastDay && (
          <div className="grid grid-cols-2 min-[380px]:grid-cols-4 gap-2 pt-1">
            <MacroTile label="Cal" value={today.cal} />
            <MacroTile label="Protein" value={`${today.proteinG}g`} accent />
            <MacroTile label="Carbs" value={`${today.carbG}g`} />
            <MacroTile label="Fat" value={`${today.fatG}g`} />
          </div>
        )}

        {isRefeed && (
          <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 p-2">
            <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-foreground/80 leading-snug">
              Refeed day — prioritize clean carbs & lean protein. Avoid sugar and seed oils.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate("/client/program")}
          className="w-full mt-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-[11px] uppercase tracking-widest font-semibold transition-colors hover:bg-muted/40"
          style={{ borderColor: accent, color: accent }}
        >
          <Calendar className="h-3.5 w-3.5" />
          View Full Schedule
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </CardContent>
    </Card>
  );
}

function WindowTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-2.5 bg-muted/20 min-w-0">
      <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
        <span className="shrink-0">{icon}</span>
        <p className="text-[10px] uppercase tracking-wider font-medium truncate">{label}</p>
      </div>
      <p className="text-sm font-bold mt-1 tabular-nums truncate">{value || "—"}</p>
    </div>
  );
}

function MacroTile({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-md border p-1.5 text-center ${accent ? "border-primary/30 bg-primary/5" : "border-border/60 bg-muted/20"}`}>
      <p className="text-sm font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
