import { Badge } from "@/components/ui/badge";
import type { ComputedPlan } from "@/lib/protocolPlan";

interface Props {
  plan: ComputedPlan;
  compact?: boolean;
}

export function ProtocolScheduleTable({ plan, compact }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${compact ? "text-xs" : "text-sm"}`}>
        <thead className="bg-muted/40">
          <tr className="text-left">
            <th className="p-3">Day</th>
            <th className="p-3">Fast</th>
            <th className="p-3">Eating Window</th>
            <th className="p-3 text-right">Cal</th>
            <th className="p-3 text-right">P</th>
            <th className="p-3 text-right">C</th>
            <th className="p-3 text-right">F</th>
          </tr>
        </thead>
        <tbody>
          {plan.days.map((d) => (
            <tr key={d.day} className={`border-t border-border ${d.isRefeed ? "bg-primary/5" : ""}`}>
              <td className="p-3 font-medium">
                {d.day}
                {d.isRefeed && <Badge className="ml-2" variant="outline">Refeed</Badge>}
              </td>
              <td className="p-3">
                {d.fastWindow}
                {d.omad && <Badge className="ml-2" variant="secondary">OMAD</Badge>}
              </td>
              <td className="p-3 text-muted-foreground">
                {d.adFast ? (
                  <span className="italic">No eating window</span>
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
              <td className="p-3 text-right">{d.cal}</td>
              <td className="p-3 text-right">{d.proteinG}g</td>
              <td className="p-3 text-right">{d.carbG}g</td>
              <td className="p-3 text-right">{d.fatG}g</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ScheduleTotals({ plan }: { plan: ComputedPlan }) {
  const t = plan.totals;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
      <Totals label="Avg Calories" value={`${t.avgCal} kcal`} />
      <Totals label="Total Fast Hours" value={`${t.totalFastHours}h`} />
      <Totals label="Fasting Days" value={`${t.fastingDays}`} />
      <Totals label={plan.extended && plan.needsRefeed ? "Refeed Day" : "Refeed Days"} value={`${t.refeedDays}`} />
    </div>
  );
}

function Totals({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}