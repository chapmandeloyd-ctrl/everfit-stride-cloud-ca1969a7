import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Target, Loader2, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Props {
  clientId: string;
  trainerId: string;
}

/**
 * Trainer-side card to enable Smart Pace + create/edit the active goal.
 * Lives inside the Progress tab of ClientCommandCenter.
 */
export function SmartPaceTrainerCard({ clientId, trainerId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: settings } = useQuery({
    queryKey: ["smart-pace-settings", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("smart_pace_enabled")
        .eq("client_id", clientId)
        .maybeSingle();
      return data;
    },
  });

  const { data: goal } = useQuery({
    queryKey: ["smart-pace-trainer-goal", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("smart_pace_goals")
        .select("*")
        .eq("client_id", clientId)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
  });

  const enabled = !!settings?.smart_pace_enabled;

  // Form state
  const [startWeight, setStartWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [pace, setPace] = useState("2.5");
  const [direction, setDirection] = useState<"lose" | "gain" | "maintain">("lose");

  useEffect(() => {
    if (goal) {
      setStartWeight(String(goal.start_weight ?? ""));
      setGoalWeight(String(goal.goal_weight));
      setPace(String(goal.daily_pace_lbs));
      setDirection(goal.goal_direction as any);
    }
  }, [goal]);

  const toggleMut = useMutation({
    mutationFn: async (val: boolean) => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({ smart_pace_enabled: val })
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smart-pace-settings", clientId] });
      qc.invalidateQueries({ queryKey: ["smart-pace"] });
      toast({ title: "Smart Pace updated" });
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const sw = parseFloat(startWeight);
      const gw = parseFloat(goalWeight);
      const p = parseFloat(pace);
      if (!gw || !p) throw new Error("Goal weight and pace required");

      if (goal) {
        const { error } = await supabase
          .from("smart_pace_goals")
          .update({
            start_weight: sw || null,
            goal_weight: gw,
            daily_pace_lbs: p,
            goal_direction: direction,
          })
          .eq("id", goal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("smart_pace_goals").insert({
          client_id: clientId,
          trainer_id: trainerId,
          start_weight: sw || null,
          goal_weight: gw,
          daily_pace_lbs: p,
          goal_direction: direction,
          last_weigh_in_value: sw || null,
          last_weigh_in_date: new Date().toISOString().slice(0, 10),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smart-pace-trainer-goal", clientId] });
      qc.invalidateQueries({ queryKey: ["smart-pace"] });
      toast({ title: goal ? "Goal updated" : "Goal created" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Smart Pace Tracker
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Real-pace weight tracking with debt/credit. Replaces legacy GoalCard.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => toggleMut.mutate(v)}
          disabled={toggleMut.isPending}
        />
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Start weight (lb)</Label>
              <Input type="number" step="0.1" value={startWeight} onChange={(e) => setStartWeight(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Goal weight (lb)</Label>
              <Input type="number" step="0.1" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Daily pace (lb/day)</Label>
              <Input type="number" step="0.1" min="0.1" max="5" value={pace} onChange={(e) => setPace(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Direction</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={direction}
                onChange={(e) => setDirection(e.target.value as any)}
              >
                <option value="lose">Lose</option>
                <option value="gain">Gain</option>
                <option value="maintain">Maintain</option>
              </select>
            </div>
          </div>

          {goal && (
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Stat label="Debt" value={`${Number(goal.current_debt_lbs).toFixed(1)}`} unit="lb" />
              <Stat label="Credit" value={`${Number(goal.current_credit_lbs).toFixed(1)}`} unit="lb" />
              <Stat label="Behind" value={String(goal.consecutive_behind_days)} unit="days" />
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="flex-1">
              {saveMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {goal ? "Update goal" : "Create goal"}
            </Button>
            {goal && (
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.setItem("impersonatedClientId", clientId);
                  navigate("/client/pace");
                }}
              >
                Preview <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-md border border-border p-2 text-center">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-bold text-sm">
        {value} <span className="text-[10px] font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}
