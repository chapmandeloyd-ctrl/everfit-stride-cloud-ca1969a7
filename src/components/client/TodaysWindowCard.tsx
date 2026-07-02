import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Utensils, Flame, Info, ArrowRight } from "lucide-react";
import { useClientComputedPlan } from "@/hooks/useClientComputedPlan";

/**
 * Compact "Today's Window" card rendered directly below the lion FastingProtocolCard.
 * Read-only, presentation-only. Never modifies the lion card.
 */
export function TodaysWindowCard() {
  const { plan, dayIndex, ketoAccent } = useClientComputedPlan();
  if (!plan) return null;
  const today = plan.days[dayIndex];
  if (!today) return null;
  const tomorrow = plan.days.length > 1 ? plan.days[(dayIndex + 1) % plan.days.length] : null;
  const accent = ketoAccent || "hsl(var(--primary))";
  const isFastDay = today.adFast;
  const isRefeed = today.isRefeed;

  const tomorrowSummary = tomorrow
    ? tomorrow.adFast
      ? `${tomorrow.fastWindow}`
      : tomorrow.isRefeed
      ? `Refeed · ${tomorrow.cal} kcal, ${tomorrow.carbG}g clean carbs`
      : tomorrow.fastWindow.toLowerCase().startsWith("low-cal")
      ? `Low-cal day · ~${tomorrow.cal} kcal`
      : `Eat window ${tomorrow.eatStart} – ${tomorrow.eatEnd}`
    : null;

  return (
    <Card className="overflow-hidden border-border/60 bg-card">
      <CardContent className="p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
            />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold truncate">
              Today's Window
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {today.omad && <Badge variant="outline" className="text-[9px] px-1.5 py-0">OMAD</Badge>}
            {today.tight && !today.omad && <Badge variant="outline" className="text-[9px] px-1.5 py-0">Tight</Badge>}
            {isRefeed && (
              <Badge className="text-[9px] px-1.5 py-0 bg-primary/15 text-primary border border-primary/30">
                REFEED
              </Badge>
            )}
            {isFastDay && (
              <Badge className="text-[9px] px-1.5 py-0 bg-primary/15 text-primary border border-primary/30">
                FAST DAY
              </Badge>
            )}
          </div>
        </div>

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

        {tomorrow && tomorrowSummary && (
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2">
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-[11px] text-foreground/80 leading-snug min-w-0 truncate">
              <span className="text-muted-foreground uppercase tracking-wider text-[9px] font-semibold mr-1.5">
                Tomorrow
              </span>
              {tomorrowSummary}
            </p>
          </div>
        )}
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
