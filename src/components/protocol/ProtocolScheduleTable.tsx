import { Badge } from "@/components/ui/badge";
import type { ComputedPlan } from "@/lib/protocolPlan";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface Props {
  plan: ComputedPlan;
  compact?: boolean;
}

export function ProtocolScheduleTable({ plan, compact }: Props) {
  return (
    <div className="relative overflow-x-auto overflow-y-auto max-h-[70vh] overscroll-contain [scrollbar-gutter:stable]">
      <table className={`w-full border-separate border-spacing-0 ${compact ? "text-xs" : "text-sm"}`}>
        <thead>
          <tr className="text-left">
            <th className="sticky top-0 left-0 z-30 bg-muted p-3 border-b border-border">Day</th>
            <th className="sticky top-0 z-20 bg-muted p-3 border-b border-border">Fast</th>
            <th className="sticky top-0 z-20 bg-muted p-3 border-b border-border min-w-[200px]">Eating Window</th>
            <th className="sticky top-0 z-20 bg-muted p-3 border-b border-border text-right">Cal</th>
            <th className="sticky top-0 z-20 bg-muted p-3 border-b border-border text-right">P</th>
            <th className="sticky top-0 z-20 bg-muted p-3 border-b border-border text-right">C</th>
            <th className="sticky top-0 z-20 bg-muted p-3 border-b border-border text-right">F</th>
          </tr>
        </thead>
        <tbody>
          {plan.days.map((d) => {
            const rowBg = d.isRefeed ? "bg-primary/5" : "bg-background";
            return (
            <tr key={d.day} className={rowBg}>
              <td className={`sticky left-0 z-10 ${rowBg} p-3 font-medium border-b border-border shadow-[1px_0_0_hsl(var(--border))]`}>
                {d.day}
                {d.isRefeed && (
                  <Badge
                    className="ml-2 border-primary/40 bg-primary/10 text-primary"
                    variant="outline"
                    title={`Refeed day · ${d.cal} kcal · ${d.proteinG}g protein · keep carbs ≤ ${d.carbG}g from clean sources (berries, squash, rice)`}
                  >
                    Refeed
                  </Badge>
                )}
              </td>
              <td className="p-3 border-b border-border whitespace-nowrap">
                {d.fastWindow}
                {d.omad && <Badge className="ml-2" variant="secondary">OMAD</Badge>}
              </td>
              <td className="p-3 border-b border-border text-muted-foreground min-w-[200px]">
                {d.adFast ? (
                  <span className="italic">No eating window</span>
                ) : d.isRefeed ? (
                  <span>
                    {d.eatStart} – {d.eatEnd}
                    <span className="block text-[11px] text-primary/80 mt-0.5">
                      Low-carb refeed · prioritize lean protein + clean carbs, no sugars or seed oils
                    </span>
                  </span>
                ) : d.tight ? (
                  <span>
                    Break fast: <span className="text-foreground font-medium">{d.eatStart}</span>
                    <span className="mx-1">·</span>
                    Last meal by: <span className="text-foreground font-medium">{d.eatEnd}</span>
                  </span>
                ) : (
                  <>{d.eatStart} – {d.eatEnd}</>
                )}
              </td>
              <td className="p-3 border-b border-border text-right tabular-nums">{d.cal}</td>
              <td className="p-3 border-b border-border text-right tabular-nums">{d.proteinG}g</td>
              <td className="p-3 border-b border-border text-right tabular-nums">{d.carbG}g</td>
              <td className="p-3 border-b border-border text-right tabular-nums">{d.fatG}g</td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ScheduleTotals({ plan }: { plan: ComputedPlan }) {
  const t = plan.totals;
  const hasFastOrRefeed = t.fastingDays > 0 || t.refeedDays > 0;
  // Recurring daily protocol: derive from the first eat day.
  const sample = plan.days.find((d) => !d.adFast && !d.isRefeed) ?? plan.days[0];
  const fastWin = sample?.fastWindow ?? "—";
  const eatWin =
    sample && sample.eatStart && sample.eatEnd
      ? `${sample.eatStart} – ${sample.eatEnd}`
      : "—";
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
      <Totals label="Avg Calories" value={`${t.avgCal} kcal`} />
      <Totals label="Total Fast Hours" value={`${t.totalFastHours}h`} />
      {hasFastOrRefeed ? (
        <>
          <Totals label="Fasting Days" value={`${t.fastingDays}`} />
          <Totals
            label={plan.extended && plan.needsRefeed ? "Refeed Day" : "Refeed Days"}
            value={`${t.refeedDays}`}
          />
        </>
      ) : (
        <>
          <Totals
            label="Daily Fast"
            value={fastWin}
            info="The overnight fasting window you repeat every day on this protocol (e.g. 16h for 16:8). Switch to a multi-day protocol like 5:2, ADF, or Eat-Stop-Eat and this tile is replaced by 'Fasting Days' since fasts vary day-to-day."
          />
          <Totals
            label="Eating Window"
            value={eatWin}
            info="The daily window when you eat (break-fast → last meal). Only shown for recurring daily protocols. Multi-day protocols hide this because eating hours change on fast vs. eat vs. refeed days — see the day-by-day rows above."
          />
        </>
      )}
    </div>
  );
}

function Totals({ label, value, info }: { label: string; value: string; info?: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {label}
        {info && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`About ${label}`}
                  className="inline-flex items-center justify-center text-muted-foreground/70 hover:text-foreground focus:outline-none focus:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px] text-xs leading-snug">
                {info}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}