import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CupSoda, ChevronRight } from "lucide-react";
import { StartJuiceFastSheet } from "./StartJuiceFastSheet";
import { useJuiceFast } from "@/hooks/useJuiceFast";
import { useAuth } from "@/hooks/useAuth";
import { JUICE_MODES, juiceProgress } from "@/lib/juiceFast";

/** Entry point on the Fasting Plans page. */
export function JuiceFastSection() {
  const { session, startFast } = useJuiceFast();
  const { userRole } = useAuth();
  const [open, setOpen] = useState(false);

  const active = session ? juiceProgress(session) : null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <CupSoda className="h-5 w-5 text-emerald-400" />
        <h2 className="text-lg font-bold">Juice Fast</h2>
        <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-400">
          Multi-day
        </Badge>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        A day-based reset instead of a daily eating window. Pick juice only or juice plus light snacks, choose your
        length, and the dashboard tracks you day by day.
      </p>

      {session && active ? (
        <Card className="border-emerald-500/30">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-bold">Juice fast in progress</p>
              <p className="text-xs text-muted-foreground">
                Day {active.dayNumber} of {session.planned_days} · {Math.round(active.pct * 100)}% complete
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {JUICE_MODES.map((m) => (
            <Card key={m.id} className="border-border">
              <CardContent className="p-4">
                <p className={`text-sm font-bold ${m.accent}`}>{m.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.description}</p>
              </CardContent>
            </Card>
          ))}
          <Button className="w-full" size="lg" onClick={() => setOpen(true)}>
            Start a juice fast
          </Button>
        </div>
      )}

      <StartJuiceFastSheet
        open={open}
        onOpenChange={setOpen}
        isTrainer={userRole === "trainer"}
        starting={startFast.isPending}
        onStart={(input) => startFast.mutate(input, { onSuccess: () => setOpen(false) })}
      />
    </section>
  );
}