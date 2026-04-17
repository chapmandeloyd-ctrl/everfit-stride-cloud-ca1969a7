import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, Scale, Heart, RotateCcw, TrendingDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { SmartPaceGoal } from "@/lib/smartPaceEngine";
import { processWeighIn } from "@/lib/smartPaceEngine";

interface Props {
  clientId: string;
  goal: SmartPaceGoal;
  onChanged?: () => void;
}

/**
 * Admin-only control panel rendered inside /client/pace when impersonating.
 * Provides: log weight, forgive day, reset debt, adjust pace.
 */
export function SmartPaceAdminPanel({ clientId, goal, onChanged }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [openAction, setOpenAction] = useState<null | "weight" | "forgive" | "reset" | "pace">(null);
  const [weight, setWeight] = useState("");
  const [pace, setPace] = useState(String(goal.daily_pace_lbs));
  const [reason, setReason] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const logAction = async (
    action_type: "log_weight" | "forgive_day" | "reset_debt" | "adjust_pace",
    payload: Record<string, unknown>,
    reasonText?: string
  ) => {
    await supabase.from("smart_pace_admin_actions").insert({
      goal_id: goal.id,
      client_id: clientId,
      admin_id: user!.id,
      action_type,
      action_date: today,
      payload,
      reason: reasonText || null,
    });
  };

  // -------- Log Weight --------
  const logWeightMut = useMutation({
    mutationFn: async () => {
      const w = parseFloat(weight);
      if (!w || w < 50 || w > 800) throw new Error("Enter a valid weight (50–800 lb)");

      const result = processWeighIn({
        goal,
        weighInLbs: w,
        weighInDate: today,
        source: "admin_override",
        previousWeightLbs: goal.last_weigh_in_value,
      });

      // Upsert daily log
      await supabase.from("smart_pace_daily_log").upsert(
        {
          goal_id: goal.id,
          client_id: clientId,
          log_date: today,
          target_loss_lbs: result.targetLossLbs,
          actual_loss_lbs: result.actualLossLbs,
          weight_recorded: w,
          weight_source: "admin_override",
          status: result.status,
          debt_delta: result.debtDelta,
          credit_delta: result.creditDelta,
          notes: reason || "Admin-logged weigh-in",
        },
        { onConflict: "goal_id,log_date" }
      );

      // Update goal totals
      await supabase
        .from("smart_pace_goals")
        .update({
          current_debt_lbs: result.newDebtLbs,
          current_credit_lbs: result.newCreditLbs,
          last_weigh_in_date: today,
          last_weigh_in_value: w,
          consecutive_behind_days: result.consecutiveBehindDays,
          consecutive_missed_days: 0,
        })
        .eq("id", goal.id);

      await logAction("log_weight", { weight: w, status: result.status }, reason);
      return result;
    },
    onSuccess: (result) => {
      toast({ title: "Weight logged", description: result.message });
      qc.invalidateQueries({ queryKey: ["smart-pace"] });
      qc.invalidateQueries({ queryKey: ["smart-pace-log"] });
      setOpenAction(null);
      setWeight("");
      setReason("");
      onChanged?.();
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  // -------- Forgive Day --------
  const forgiveMut = useMutation({
    mutationFn: async () => {
      await supabase.from("smart_pace_daily_log").upsert(
        {
          goal_id: goal.id,
          client_id: clientId,
          log_date: today,
          target_loss_lbs: 0,
          actual_loss_lbs: null,
          weight_recorded: null,
          weight_source: "forgiven",
          status: "forgiven",
          debt_delta: 0,
          credit_delta: 0,
          notes: reason || "Admin forgave this day",
        },
        { onConflict: "goal_id,log_date" }
      );
      await supabase
        .from("smart_pace_goals")
        .update({ consecutive_behind_days: 0, consecutive_missed_days: 0 })
        .eq("id", goal.id);
      await logAction("forgive_day", { date: today }, reason);
    },
    onSuccess: () => {
      toast({ title: "Day forgiven", description: "Streak preserved." });
      qc.invalidateQueries({ queryKey: ["smart-pace"] });
      qc.invalidateQueries({ queryKey: ["smart-pace-log"] });
      setOpenAction(null);
      setReason("");
      onChanged?.();
    },
  });

  // -------- Reset Debt --------
  const resetMut = useMutation({
    mutationFn: async () => {
      await supabase
        .from("smart_pace_goals")
        .update({
          current_debt_lbs: 0,
          consecutive_behind_days: 0,
          consecutive_missed_days: 0,
        })
        .eq("id", goal.id);
      await logAction("reset_debt", { previous_debt: goal.current_debt_lbs }, reason);
    },
    onSuccess: () => {
      toast({ title: "Debt reset", description: "Catch-up debt cleared to zero." });
      qc.invalidateQueries({ queryKey: ["smart-pace"] });
      setOpenAction(null);
      setReason("");
      onChanged?.();
    },
  });

  // -------- Adjust Pace --------
  const paceMut = useMutation({
    mutationFn: async () => {
      const p = parseFloat(pace);
      if (!p || p < 0.1 || p > 5) throw new Error("Pace must be 0.1–5.0 lb/day");
      await supabase
        .from("smart_pace_goals")
        .update({ daily_pace_lbs: p })
        .eq("id", goal.id);
      await logAction("adjust_pace", { previous_pace: goal.daily_pace_lbs, new_pace: p }, reason);
    },
    onSuccess: () => {
      toast({ title: "Pace updated", description: `New daily pace: ${pace} lb/day` });
      qc.invalidateQueries({ queryKey: ["smart-pace"] });
      setOpenAction(null);
      setReason("");
      onChanged?.();
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <Card className="border-2 border-orange-500/40 bg-orange-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-5 w-5 text-orange-500" />
          <h3 className="font-heading font-bold text-sm">Admin Override Panel</h3>
          <Badge className="bg-orange-500 text-white text-[10px] uppercase">Trainer</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          These actions are audited. Use only when a real scale weigh-in isn't possible.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="justify-start" onClick={() => setOpenAction("weight")}>
            <Scale className="h-4 w-4 mr-2" /> Log weight
          </Button>
          <Button variant="outline" size="sm" className="justify-start" onClick={() => setOpenAction("forgive")}>
            <Heart className="h-4 w-4 mr-2" /> Forgive day
          </Button>
          <Button variant="outline" size="sm" className="justify-start" onClick={() => setOpenAction("reset")}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reset debt
          </Button>
          <Button variant="outline" size="sm" className="justify-start" onClick={() => setOpenAction("pace")}>
            <TrendingDown className="h-4 w-4 mr-2" /> Adjust pace
          </Button>
        </div>
      </Card>

      {/* Log Weight Dialog */}
      <Dialog open={openAction === "weight"} onOpenChange={(o) => !o && setOpenAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log weight for client</DialogTitle>
            <DialogDescription>Recorded as admin override (audited).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Weight (lb)</Label>
              <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. scale battery dead" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAction(null)}>Cancel</Button>
            <Button onClick={() => logWeightMut.mutate()} disabled={logWeightMut.isPending}>
              {logWeightMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Log weight
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forgive Dialog */}
      <Dialog open={openAction === "forgive"} onOpenChange={(o) => !o && setOpenAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forgive today</DialogTitle>
            <DialogDescription>No debt added. Streak preserved.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason (optional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. sick day" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAction(null)}>Cancel</Button>
            <Button onClick={() => forgiveMut.mutate()} disabled={forgiveMut.isPending}>
              {forgiveMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Forgive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Debt Dialog */}
      <Dialog open={openAction === "reset"} onOpenChange={(o) => !o && setOpenAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset catch-up debt</DialogTitle>
            <DialogDescription>
              Wipes <strong>{goal.current_debt_lbs.toFixed(1)} lb</strong> of accumulated debt to zero.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason (optional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. vacation reset" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAction(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => resetMut.mutate()} disabled={resetMut.isPending}>
              {resetMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Reset to zero
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Pace Dialog */}
      <Dialog open={openAction === "pace"} onOpenChange={(o) => !o && setOpenAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust daily pace</DialogTitle>
            <DialogDescription>Current: {goal.daily_pace_lbs} lb/day</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>New pace (lb/day)</Label>
              <Input type="number" step="0.1" min="0.1" max="5" value={pace} onChange={(e) => setPace(e.target.value)} />
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. plateau, slow it down" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAction(null)}>Cancel</Button>
            <Button onClick={() => paceMut.mutate()} disabled={paceMut.isPending}>
              {paceMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Update pace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
