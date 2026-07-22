import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Scale, TrendingUp, AlertTriangle, Target, Bell } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  basePaceLbs: number;
  startWeight?: number;
  goalWeight?: number;
}

/**
 * Client-facing explainer for the Smart Weight Tracker.
 * Explains debt/credit with a worked 7-day example scaled to the client's base pace.
 */
export function SmartPaceHowItWorksSheet({
  open,
  onOpenChange,
  basePaceLbs,
  startWeight,
  goalWeight,
}: Props) {
  const base = basePaceLbs > 0 ? basePaceLbs : 0.6;
  const fmt = (n: number) => n.toFixed(1);

  // Scaled sample week — mirrors the walkthrough in chat.
  const days = [
    { day: "Mon", weighIn: startWeight ?? 300, actual: 0, target: base, note: "Start", debt: 0, credit: 0 },
    { day: "Tue", weighIn: (startWeight ?? 300) - base * 0.83, actual: base * 0.83, target: base, note: "Slight miss", debt: base * 0.17, credit: 0 },
    { day: "Wed", weighIn: null, actual: base * 0.33, target: base * 1.17, note: "Behind", debt: base, credit: 0 },
    { day: "Thu", weighIn: null, actual: 0, target: base * 2, note: "Missed weigh-in", debt: base * 3, credit: 0 },
    { day: "Fri", weighIn: null, actual: base * 3, target: base * 3, note: "Big catch-up", debt: 0, credit: 0 },
    { day: "Sat", weighIn: null, actual: base * 1.67, target: base, note: "Over-performed", debt: 0, credit: base * 0.67 },
    { day: "Sun", weighIn: null, actual: base * 0.33, target: base * 0.33, note: "Easy day", debt: 0, credit: base * 0.67 },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl border-t border-border bg-background">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle className="text-xl font-heading">How Smart Pace works</SheetTitle>
              <SheetDescription className="text-xs">
                Daily accountability — not a static progress bar.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-5 space-y-5 text-sm">
          {/* Core math */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">The core math</h3>
            <p className="mt-2 text-foreground">
              We calculate one number when your goal is set:
            </p>
            <div className="mt-2 rounded-xl bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
              Daily Pace = (Start − Goal) ÷ Days to target
            </div>
            {startWeight && goalWeight ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Yours: <span className="font-semibold text-foreground">{fmt(startWeight)} → {fmt(goalWeight)} lb</span> at{" "}
                <span className="font-semibold text-destructive">{fmt(base)} lb/day</span>.
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Your base pace: <span className="font-semibold text-destructive">{fmt(base)} lb/day</span>.
              </p>
            )}
          </section>

          {/* Debt / Credit */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Debt vs. Credit</h3>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <Row
                icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
                title="Under your target → Debt"
                body="The shortfall gets added to Debt. Tomorrow's target goes up."
              />
              <Row
                icon={<TrendingUp className="h-4 w-4 text-sky-400" />}
                title="Over your target → Credit"
                body="The surplus banks as Credit. It pays down Debt first, then lowers tomorrow's target."
              />
              <Row
                icon={<Target className="h-4 w-4 text-emerald-400" />}
                title="Missed weigh-in"
                body={`We charge the full ${fmt(base)} lb to Debt overnight. No weigh-in = no credit.`}
              />
            </div>
            <div className="mt-3 rounded-xl bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
              Tomorrow's Target = {fmt(base)} + Debt − Credit
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Target is capped at 3× base ({fmt(base * 3)} lb/day) so the app never demands something unsafe.
            </p>
          </section>

          {/* Worked example */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">7-day example</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Based on your {fmt(base)} lb/day pace.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-1.5 pr-2">Day</th>
                    <th className="py-1.5 pr-2">Lost</th>
                    <th className="py-1.5 pr-2">Target</th>
                    <th className="py-1.5 pr-2">Debt</th>
                    <th className="py-1.5">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {days.map((d) => (
                    <tr key={d.day}>
                      <td className="py-1.5 pr-2 font-semibold text-foreground">{d.day}</td>
                      <td className="py-1.5 pr-2 text-foreground">{fmt(d.actual)}</td>
                      <td className="py-1.5 pr-2 text-foreground">{fmt(d.target)}</td>
                      <td className={`py-1.5 pr-2 ${d.debt > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                        {fmt(d.debt)}
                      </td>
                      <td className={`py-1.5 ${d.credit > 0 ? "text-sky-400 font-semibold" : "text-muted-foreground"}`}>
                        {fmt(d.credit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-3 space-y-1.5 text-[11px] text-muted-foreground">
              <li>• <span className="text-foreground">Tue–Wed:</span> small misses stack into Debt.</li>
              <li>• <span className="text-foreground">Thu:</span> no weigh-in — full pace charged to Debt.</li>
              <li>• <span className="text-foreground">Fri:</span> one strong weigh-in wipes the slate.</li>
              <li>• <span className="text-foreground">Sat:</span> extra loss banks as Credit → easy Sunday.</li>
            </ul>
          </section>

          {/* Alerts */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Bell className="h-3.5 w-3.5" /> When we alert you
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-foreground">
              <li>• <span className="font-semibold">2 behind days in a row</span> → catch-up plan + push notification.</li>
              <li>• <span className="font-semibold">Debt ≥ {fmt(base * 2)} lb</span> → moderate — your coach is notified.</li>
              <li>• <span className="font-semibold">Debt ≥ {fmt(base * 3)} lb</span> → severe — red flag on coach's dashboard.</li>
            </ul>
          </section>

          <p className="pb-safe pt-1 text-center text-[11px] text-muted-foreground">
            84 small winnable days beats one big 12-week judgment.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted/30 px-3 py-2">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}