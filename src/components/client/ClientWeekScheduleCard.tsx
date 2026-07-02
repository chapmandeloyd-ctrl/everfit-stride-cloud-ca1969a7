import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronRight, Flame, Utensils } from "lucide-react";
import { useClientComputedPlan } from "@/hooks/useClientComputedPlan";
import { ProtocolPreviewDialog } from "@/components/protocol/ProtocolPreviewDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";

/**
 * Compact 7-day / extended-fast schedule strip for /client/program.
 * Reuses the same computePlan output the trainer saw when assigning.
 * "View Full Schedule" opens the same detailed sheet as trainer preview.
 */
export function ClientWeekScheduleCard() {
  const { plan, dayIndex, protocolName, ketoName, ketoAccent, stage } = useClientComputedPlan();
  const [openFull, setOpenFull] = useState(false);

  if (!plan) return null;

  const accent = ketoAccent || "hsl(var(--primary))";

  const dayLabel = (d: (typeof plan.days)[number]) => {
    if (d.adFast) return "Fast";
    if (d.isRefeed) return "Refeed";
    // low-cal day: fastWindow starts with "Low-cal"
    if (d.fastWindow.toLowerCase().startsWith("low-cal")) return "Low-cal";
    return d.fastWindow;
  };

  const dayColor = (d: (typeof plan.days)[number]) => {
    if (d.adFast) return "hsl(var(--primary))"; // red = fast day
    if (d.isRefeed) return "hsl(217 91% 60%)"; // blue = refeed
    if (d.fastWindow.toLowerCase().startsWith("low-cal")) return "hsl(48 96% 53%)"; // yellow
    return "hsl(142 71% 45%)"; // green = eat day
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] font-bold text-primary focus:outline-none"
              aria-label={`Stage ${stage.number} — ${stage.label}. Tap for details.`}
            >
              <span>Stage {stage.number} · {stage.label}</span>
              <Info className="h-3 w-3 opacity-70" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-72 text-xs space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">
                Stage {stage.number} of 3 · {stage.label}
              </span>
              <span className="text-[10px] text-muted-foreground">Day {stage.dayInProtocol}</span>
            </div>
            <p className="text-muted-foreground leading-snug">{stage.description}</p>
            <div className="pt-1 border-t border-border/60 text-[10px] text-muted-foreground">
              {stage.daysUntilNext !== null
                ? `Next stage in ${stage.daysUntilNext} day${stage.daysUntilNext === 1 ? "" : "s"}.`
                : "You've reached the final stage — keep the momentum going."}
            </div>
          </PopoverContent>
        </Popover>
        <Badge
          variant="outline"
          className="text-[9px] uppercase tracking-wider border-border/60"
        >
          {plan.extended ? "Extended Fast" : `${plan.days.length}-Day Cycle`}
        </Badge>
      </div>

      <Card className="overflow-hidden border-border/60 bg-card">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
            />
            <p className="text-xs text-muted-foreground truncate">
              {protocolName ?? "Your protocol"}
              {ketoName ? ` · ${ketoName}` : ""}
            </p>
          </div>

          {/* Day chips */}
          <div className="grid grid-cols-7 gap-1">
            {plan.days.slice(0, 7).map((d, i) => {
              const active = i === dayIndex;
              const color = dayColor(d);
              return (
                <div
                  key={`${d.day}-${i}`}
                  className={`rounded-md border p-1.5 text-center transition ${
                    active
                      ? "border-primary/50 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]"
                      : "border-border/50 bg-muted/20"
                  }`}
                >
                  <div
                    className="mx-auto h-1.5 w-1.5 rounded-full mb-1"
                    style={{ background: color, boxShadow: `0 0 4px ${color}` }}
                  />
                  <p className="text-[9px] font-bold text-foreground leading-none">
                    {d.day.replace(/\s.*/, "")}
                  </p>
                  <p className="text-[8px] text-muted-foreground mt-0.5 truncate leading-none">
                    {dayLabel(d)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <LegendDot color="hsl(142 71% 45%)" label="Eat" />
            <LegendDot color="hsl(48 96% 53%)" label="Low-cal" />
            <LegendDot color="hsl(var(--primary))" label="Fast" />
            <LegendDot color="hsl(217 91% 60%)" label="Refeed" />
          </div>

          <Button
            variant="outline"
            className="w-full border-primary/30 hover:border-primary/60 hover:bg-primary/5"
            onClick={() => setOpenFull(true)}
          >
            <Calendar className="h-4 w-4 mr-2 text-primary" />
            View Full Schedule
            <ChevronRight className="h-4 w-4 ml-auto" />
          </Button>

          {/* Today mini-summary */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Today · {plan.days[dayIndex]?.day}
            </p>
            {plan.days[dayIndex]?.adFast ? (
              <div className="flex items-center gap-2">
                <Flame className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-semibold">{plan.days[dayIndex].fastWindow}</p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Utensils className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-semibold">
                  {plan.days[dayIndex]?.eatStart} – {plan.days[dayIndex]?.eatEnd}
                  <span className="text-muted-foreground font-normal ml-2">
                    · {plan.days[dayIndex]?.cal} kcal
                  </span>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ProtocolPreviewDialog
        open={openFull}
        onOpenChange={setOpenFull}
        plan={plan}
        title="Your Full Schedule"
        subtitle={
          protocolName && ketoName
            ? `${protocolName} · ${ketoName}`
            : protocolName ?? undefined
        }
      />
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}