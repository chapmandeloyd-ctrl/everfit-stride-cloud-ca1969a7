import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Flame, Clock, Activity, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useSmartPace } from "@/hooks/useSmartPace";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

/**
 * Catch-Up Takeover Modal.
 * Renders full-screen when a Smart Pace prescription exists and is unacknowledged.
 * Generates the prescription on first trigger using the AI gateway.
 */
export function SmartPaceCatchUpModal() {
  const clientId = useEffectiveClientId();
  const { data: pace } = useSmartPace();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dismissedThisSession, setDismissedThisSession] = useState(false);

  // Look for an active (unacknowledged) prescription for today
  const { data: prescription } = useQuery({
    queryKey: ["smart-pace-prescription", clientId, pace?.goal?.id],
    enabled: !!clientId && !!pace?.goal?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("smart_pace_prescriptions")
        .select("*")
        .eq("goal_id", pace!.goal!.id)
        .eq("acknowledged", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 15_000,
  });

  // Auto-create a prescription when behind triggers (handled server-side normally,
  // but we also create one client-side as a fallback so the modal always appears).
  const generateMut = useMutation({
    mutationFn: async () => {
      if (!pace?.goal || !clientId) return null;
      const goal = pace.goal;
      const debt = pace.debtLbs;
      const severity =
        debt >= goal.daily_pace_lbs * 3
          ? "severe"
          : debt >= goal.daily_pace_lbs * 2
          ? "moderate"
          : "mild";

      const actions = buildCatchUpActions(severity, debt, Number(goal.daily_pace_lbs));
      const title = severity === "severe" ? "Major catch-up needed" : severity === "moderate" ? "Catch-up plan" : "Get back on pace";
      const message = `You're ${debt.toFixed(1)} lb behind. Here's your AI plan to catch up safely.`;

      const { data, error } = await supabase
        .from("smart_pace_prescriptions")
        .insert({
          goal_id: goal.id,
          client_id: clientId,
          prescription_date: new Date().toISOString().slice(0, 10),
          generated_by: "engine",
          severity,
          title,
          message,
          actions,
          target_makeup_lbs: debt,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["smart-pace-prescription"] }),
  });

  // Acknowledge
  const ackMut = useMutation({
    mutationFn: async () => {
      if (!prescription) return;
      const { error } = await supabase
        .from("smart_pace_prescriptions")
        .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
        .eq("id", prescription.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Locked in", description: "Your catch-up plan is active for today." });
      qc.invalidateQueries({ queryKey: ["smart-pace-prescription"] });
    },
  });

  // Auto-trigger generation when conditions are met but no prescription exists yet
  useEffect(() => {
    if (
      pace?.enabled &&
      pace.goal &&
      pace.status === "behind" &&
      (pace.consecutiveBehindDays(pace.goal) >= 2 || pace.debtLbs >= pace.goal.daily_pace_lbs * 2) &&
      !prescription &&
      !generateMut.isPending &&
      !generateMut.isSuccess &&
      !dismissedThisSession
    ) {
      generateMut.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pace?.status, pace?.debtLbs, prescription, dismissedThisSession]);

  if (!pace?.enabled || !pace.goal) return null;
  if (!prescription || dismissedThisSession) return null;

  const sev = (prescription.severity ?? "mild") as "mild" | "moderate" | "severe";
  const sevTone =
    sev === "severe"
      ? "bg-destructive/10 border-destructive/40 text-destructive"
      : sev === "moderate"
      ? "bg-orange-500/10 border-orange-500/40 text-orange-600 dark:text-orange-400"
      : "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400";

  const actions = (prescription.actions as CatchUpAction[]) ?? [];

  return (
    <Dialog open onOpenChange={(o) => !o && setDismissedThisSession(true)}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className={cn("p-5 border-b-2", sevTone)}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <Badge className="bg-foreground text-background uppercase text-[10px]">
              {sev} catch-up
            </Badge>
          </div>
          <DialogHeader className="text-left">
            <DialogTitle className="font-heading font-bold text-2xl">
              {prescription.title}
            </DialogTitle>
            <DialogDescription className="text-sm opacity-90">
              {prescription.message}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs uppercase font-semibold tracking-wide text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Today's prescription
          </p>
          {actions.map((a, i) => (
            <ActionRow key={i} action={a} />
          ))}

          {prescription.target_makeup_lbs != null && (
            <Card className="p-3 bg-muted/40 border-dashed text-center">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Target make-up
              </p>
              <p className="font-heading font-bold text-2xl">
                {Number(prescription.target_makeup_lbs).toFixed(1)} <span className="text-sm font-normal">lb</span>
              </p>
            </Card>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20 flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissedThisSession(true)}
          >
            Later
          </Button>
          <Button
            className="flex-1"
            onClick={() => ackMut.mutate()}
            disabled={ackMut.isPending}
          >
            {ackMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Lock in plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CatchUpAction {
  type: "fast_extension" | "calorie_cut" | "cardio_addon" | "carb_cut";
  label: string;
  detail: string;
  value?: number;
  unit?: string;
}

function ActionRow({ action }: { action: CatchUpAction }) {
  const Icon =
    action.type === "fast_extension" ? Clock : action.type === "cardio_addon" ? Activity : Flame;
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border">
      <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{action.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{action.detail}</p>
      </div>
      {action.value && (
        <Badge variant="secondary" className="text-xs shrink-0">
          +{action.value}
          {action.unit ?? ""}
        </Badge>
      )}
    </div>
  );
}

function buildCatchUpActions(
  severity: "mild" | "moderate" | "severe",
  debt: number,
  basePace: number
): CatchUpAction[] {
  const actions: CatchUpAction[] = [];
  if (severity === "mild") {
    actions.push({
      type: "fast_extension",
      label: "Extend fast by 2 hours",
      detail: "Push your eating window 2h later today.",
      value: 2,
      unit: "h",
    });
    actions.push({
      type: "cardio_addon",
      label: "Add 20 min easy cardio",
      detail: "Walk, bike, or swim — keep it Zone 2.",
      value: 20,
      unit: "m",
    });
  } else if (severity === "moderate") {
    actions.push({
      type: "fast_extension",
      label: "Extend fast by 4 hours",
      detail: "Tighten window — break fast at 2pm instead of 12pm.",
      value: 4,
      unit: "h",
    });
    actions.push({
      type: "calorie_cut",
      label: "Cut 250 cal today",
      detail: "Skip starches at dinner; protein + veg only.",
      value: 250,
      unit: "cal",
    });
    actions.push({
      type: "cardio_addon",
      label: "Add 30 min cardio",
      detail: "Aim for 5–6 RPE for the full block.",
      value: 30,
      unit: "m",
    });
  } else {
    actions.push({
      type: "fast_extension",
      label: "Extend fast by 6 hours",
      detail: "OMAD or one small refuel only.",
      value: 6,
      unit: "h",
    });
    actions.push({
      type: "calorie_cut",
      label: "Cut 500 cal today",
      detail: "Liquid protein + greens; no carbs.",
      value: 500,
      unit: "cal",
    });
    actions.push({
      type: "cardio_addon",
      label: "Add 45 min cardio",
      detail: "Split AM/PM if needed — Zone 2.",
      value: 45,
      unit: "m",
    });
  }
  return actions;
}
