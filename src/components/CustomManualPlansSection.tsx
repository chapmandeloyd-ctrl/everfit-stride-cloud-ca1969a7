import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Minus, Plus, Hourglass, UtensilsCrossed, Clock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useToast } from "@/hooks/use-toast";
import {
  CUSTOM_MANUAL_PLANS,
  type CustomManualPlan,
} from "@/lib/customManualPlans";

function formatHour(h: number): string {
  const hr = ((h % 24) + 24) % 24;
  const period = hr >= 12 ? "PM" : "AM";
  const display = hr % 12 === 0 ? 12 : hr % 12;
  return `${display}:00 ${period}`;
}

export function CustomManualPlansSection() {
  const [active, setActive] = useState<CustomManualPlan | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold">Custom Manual Plans</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        Set your own window. Some plans have locked durations.
      </p>

      <div className="space-y-3">
        {CUSTOM_MANUAL_PLANS.map((plan) => (
          <Card
            key={plan.id}
            className="cursor-pointer overflow-hidden bg-card border-border transition-all hover:border-primary/40 active:scale-[0.99]"
            onClick={() => setActive(plan)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {!plan.manual && !plan.goalMode && (
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      {plan.fastHours}hr fasting
                    </p>
                  )}
                  <h3 className={`text-xl font-black tracking-tight ${plan.accent}`}>
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{plan.tagline}</p>
                </div>
                {(plan.lockedEat || plan.lockedFast) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary shrink-0">
                    <Lock className="h-3 w-3" /> Locked
                  </span>
                )}
              </div>
              {!plan.manual && (
                <div className="mt-3 flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Hourglass className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold">{plan.fastHours}h</span>
                    <span className="text-muted-foreground">fast</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UtensilsCrossed className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-semibold">{plan.eatHours}h</span>
                    <span className="text-muted-foreground">eat</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <PlanSheet plan={active} onClose={() => setActive(null)} />
    </div>
  );
}

function PlanSheet({ plan, onClose }: { plan: CustomManualPlan | null; onClose: () => void }) {
  const clientId = useEffectiveClientId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [eatHours, setEatHours] = useState<number>(plan?.eatHours ?? 0);
  const [fastHours, setFastHours] = useState<number>(plan?.fastHours ?? 0);
  const [openHour, setOpenHour] = useState<number>(plan?.defaultOpenHour ?? 8);

  // Reset state when plan changes
  useMemo(() => {
    if (plan) {
      setEatHours(plan.eatHours);
      setFastHours(plan.fastHours);
      setOpenHour(plan.defaultOpenHour);
    }
  }, [plan?.id]);

  const start = useMutation({
    mutationFn: async (mode: "fast" | "eat") => {
      if (!clientId || !plan) throw new Error("Missing client or plan");
      const now = new Date();
      const updates: Record<string, any> = {};

      if (mode === "fast") {
        updates.active_fast_start_at = now.toISOString();
        updates.active_fast_target_hours = plan.goalMode ? fastHours : plan.fastHours;
        updates.eating_window_ends_at = null;
      } else {
        const ends = new Date(now.getTime() + eatHours * 3600 * 1000);
        updates.eating_window_ends_at = ends.toISOString();
        updates.eating_window_hours = eatHours;
        updates.active_fast_start_at = null;
        updates.active_fast_target_hours = null;
      }

      const { error } = await supabase
        .from("client_feature_settings")
        .update(updates)
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: (_d, mode) => {
      queryClient.invalidateQueries({ queryKey: ["meal-engine-state"] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
      queryClient.invalidateQueries({ queryKey: ["client-feature-settings"] });
      toast({
        title: mode === "fast" ? "Fast started" : "Eating window opened",
        description: plan?.name,
      });
      onClose();
    },
    onError: (e: any) => {
      toast({ title: "Couldn't start plan", description: e.message, variant: "destructive" });
    },
  });

  if (!plan) return null;

  const closeHour = (openHour + eatHours) % 24;
  const eatLocked = plan.lockedEat;
  const fastLocked = plan.lockedFast;
  const eatMin = plan.eatRange?.[0] ?? eatHours;
  const eatMax = plan.eatRange?.[1] ?? eatHours;
  const fastMin = plan.fastRange?.[0] ?? fastHours;
  const fastMax = plan.fastRange?.[1] ?? fastHours;

  return (
    <Sheet open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto bg-background border-border">
        <SheetHeader className="text-left">
          <SheetTitle className={`text-2xl font-black ${plan.accent}`}>{plan.name}</SheetTitle>
          <p className="text-sm text-muted-foreground">{plan.description}</p>
          {!plan.manual && !plan.goalMode && (
            <p className="text-xs font-semibold text-foreground mt-1">
              {plan.fastHours}hr fasting — {eatHours}hr eating
            </p>
          )}
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {plan.goalMode ? (
            <>
              <Stepper
                label="Set Fasting Duration"
                value={fastHours}
                onChange={setFastHours}
                min={fastMin}
                max={fastMax}
                suffix="h"
                disabled={false}
              />
              <Stepper
                label="Set Eating Duration"
                value={eatHours}
                onChange={setEatHours}
                min={eatMin}
                max={eatMax}
                suffix="h"
                disabled={false}
              />
            </>
          ) : plan.manual ? (
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                Open your eating window or start fasting whenever you choose.
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-4">
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Eating Window {eatLocked && <Lock className="inline h-3 w-3 ml-1" />}
                  </p>
                  <p className="text-3xl font-black mt-1">{eatHours}h</p>
                </div>

                {!eatLocked && (
                  <Stepper
                    label="Adjust Duration"
                    value={eatHours}
                    onChange={setEatHours}
                    min={eatMin}
                    max={eatMax}
                    suffix="h"
                    disabled={false}
                  />
                )}

                <div className="grid grid-cols-2 gap-3 text-center pt-2 border-t border-border">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Opens at
                    </p>
                    <p className="text-lg font-black mt-1">{formatHour(openHour)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Closes at
                    </p>
                    <p className="text-lg font-black mt-1 text-muted-foreground">
                      {formatHour(closeHour)}
                    </p>
                  </div>
                </div>

                <Stepper
                  label="Window Start Hour"
                  value={openHour}
                  onChange={(v) => setOpenHour(((v % 24) + 24) % 24)}
                  min={0}
                  max={23}
                  suffix=""
                  formatValue={(v) => formatHour(v)}
                />
              </CardContent>
            </Card>
          )}

          {plan.manual ? (
            <div className="space-y-2 pt-2">
              <p className="text-center text-sm font-semibold text-muted-foreground">
                Choose what you want to start with
              </p>
              <Button
                className="w-full h-12 text-base font-bold"
                onClick={() => start.mutate("eat")}
                disabled={start.isPending}
              >
                Open Eating Window
              </Button>
              <p className="text-center text-xs text-muted-foreground">or</p>
              <Button
                variant="secondary"
                className="w-full h-12 text-base font-bold"
                onClick={() => start.mutate("fast")}
                disabled={start.isPending}
              >
                Start Fasting
              </Button>
            </div>
          ) : (
            <Button
              className="w-full h-12 text-base font-bold"
              onClick={() => start.mutate("fast")}
              disabled={start.isPending}
            >
              {start.isPending ? "Starting..." : "Start Plan"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
  disabled,
  formatValue,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix: string;
  disabled?: boolean;
  formatValue?: (v: number) => string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center justify-between gap-3 bg-muted/30 rounded-full p-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-background h-9 w-9"
          disabled={disabled || value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-xl font-black">
          {formatValue ? formatValue(value) : `${value}${suffix}`}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-background h-9 w-9"
          disabled={disabled || value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}