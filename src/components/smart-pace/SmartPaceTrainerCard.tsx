import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Target, Loader2, ChevronRight, CalendarIcon } from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { SmartPaceAdminPanel } from "./SmartPaceAdminPanel";
import type { SmartPaceGoal } from "@/lib/smartPaceEngine";
import { useImpersonation } from "@/hooks/useImpersonation";

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
  const { setImpersonatedClientId } = useImpersonation();
  const draftKey = `smart-pace-draft:${clientId}`;

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

  const { data: goal, isLoading: goalLoading } = useQuery({
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
  const [direction, setDirection] = useState<"lose" | "gain" | "maintain">("lose");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [draftHydrated, setDraftHydrated] = useState(false);

  useEffect(() => {
    if (goalLoading) return;

    const restoreFromDraft = () => {
      try {
        const raw = sessionStorage.getItem(draftKey);
        if (!raw) return false;

        const draft = JSON.parse(raw) as {
          sourceGoalId: string | null;
          startWeight: string;
          goalWeight: string;
          direction: "lose" | "gain" | "maintain";
          startDate: string;
          targetDate: string | null;
        };

        if (draft.sourceGoalId !== (goal?.id ?? null)) return false;

        setStartWeight(draft.startWeight);
        setGoalWeight(draft.goalWeight);
        setDirection(draft.direction);
        setStartDate(parseISO(draft.startDate));
        setTargetDate(draft.targetDate ? parseISO(draft.targetDate) : undefined);
        return true;
      } catch {
        sessionStorage.removeItem(draftKey);
        return false;
      }
    };

    if (!restoreFromDraft()) {
      if (goal) {
        setStartWeight(String(goal.start_weight ?? ""));
        setGoalWeight(String(goal.goal_weight));
        setDirection(goal.goal_direction as "lose" | "gain" | "maintain");
        setStartDate(goal.start_date ? parseISO(goal.start_date) : new Date());
        setTargetDate(goal.target_date ? parseISO(goal.target_date) : undefined);
      } else {
        setStartWeight("");
        setGoalWeight("");
        setDirection("lose");
        setStartDate(new Date());
        setTargetDate(undefined);
      }
    }

    setDraftHydrated(true);
  }, [draftKey, goal, goalLoading]);

  useEffect(() => {
    if (!draftHydrated) return;

    sessionStorage.setItem(
      draftKey,
      JSON.stringify({
        sourceGoalId: goal?.id ?? null,
        startWeight,
        goalWeight,
        direction,
        startDate: startDate.toISOString(),
        targetDate: targetDate?.toISOString() ?? null,
      })
    );
  }, [draftHydrated, draftKey, direction, goal?.id, goalWeight, startDate, startWeight, targetDate]);

  // Auto-derived avg/day from start/target dates and weights
  const derivedPace = useMemo(() => {
    const sw = parseFloat(startWeight);
    const gw = parseFloat(goalWeight);
    if (!sw || !gw || !targetDate) return null;
    const days = differenceInCalendarDays(targetDate, startDate);
    if (days <= 0) return null;
    const delta = Math.abs(sw - gw);
    return delta / days;
  }, [startWeight, goalWeight, startDate, targetDate]);

  const totalDays = targetDate ? differenceInCalendarDays(targetDate, startDate) : null;

  const toggleMut = useMutation({
    mutationFn: async (val: boolean) => {
      // Non-destructive: only flip the feature flag. Goal data is preserved
      // so re-enabling the tracker brings the client right back where they were.
      const { error } = await supabase
        .from("client_feature_settings")
        .update({ smart_pace_enabled: val })
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: (_data, val) => {
      qc.invalidateQueries({ queryKey: ["smart-pace-settings", clientId] });
      qc.invalidateQueries({ queryKey: ["smart-pace-trainer-goal", clientId] });
      qc.invalidateQueries({ queryKey: ["smart-pace"] });
      toast({ title: val ? "Smart Pace enabled" : "Smart Pace disabled — data preserved" });
    },
    onError: (e: Error) => toast({ title: "Toggle failed", description: e.message, variant: "destructive" }),
  });

  const resetMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("smart_pace_goals")
        .delete()
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      setStartWeight("");
      setGoalWeight("");
      setDirection("lose");
      setStartDate(new Date());
      setTargetDate(undefined);
      sessionStorage.removeItem(draftKey);
      qc.invalidateQueries({ queryKey: ["smart-pace-trainer-goal", clientId] });
      qc.invalidateQueries({ queryKey: ["smart-pace"] });
      toast({ title: "Goal reset — start fresh" });
    },
    onError: (e: Error) => toast({ title: "Reset failed", description: e.message, variant: "destructive" }),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const sw = parseFloat(startWeight);
      const gw = parseFloat(goalWeight);
      if (!gw) throw new Error("Goal weight required");
      if (!targetDate) throw new Error("Target date required");
      if (!derivedPace || derivedPace <= 0) throw new Error("Invalid date range or weights");

      const startDateStr = format(startDate, "yyyy-MM-dd");
      const targetDateStr = format(targetDate, "yyyy-MM-dd");

      if (goal) {
        const { error } = await supabase
          .from("smart_pace_goals")
          .update({
            start_weight: sw || null,
            goal_weight: gw,
            daily_pace_lbs: derivedPace,
            goal_direction: direction,
            start_date: startDateStr,
            target_date: targetDateStr,
          })
          .eq("id", goal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("smart_pace_goals").insert({
          client_id: clientId,
          trainer_id: trainerId,
          start_weight: sw || null,
          goal_weight: gw,
          daily_pace_lbs: derivedPace,
          goal_direction: direction,
          start_date: startDateStr,
          target_date: targetDateStr,
          last_weigh_in_value: sw || null,
          last_weigh_in_date: startDateStr,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      sessionStorage.removeItem(draftKey);
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
              <Label className="text-xs">Start date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full h-10 justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "PP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => d && setStartDate(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs">Target date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal",
                      !targetDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {targetDate ? format(targetDate, "PP") : "Pick target date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={targetDate}
                    onSelect={setTargetDate}
                    disabled={(d) => d <= startDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="col-span-2">
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

          {/* Derived avg/day preview */}
          <div className="rounded-md border border-border bg-muted/30 p-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Total days</p>
              <p className="font-bold text-sm">{totalDays ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Total change</p>
              <p className="font-bold text-sm">
                {startWeight && goalWeight
                  ? `${Math.abs(parseFloat(startWeight) - parseFloat(goalWeight)).toFixed(1)} lb`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Avg / day</p>
              <p className="font-bold text-sm text-primary">
                {derivedPace ? `${derivedPace.toFixed(2)} lb` : "—"}
              </p>
            </div>
          </div>

          {goal && (
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Stat label="Debt" value={`${Number(goal.current_debt_lbs).toFixed(1)}`} unit="lb" />
              <Stat label="Credit" value={`${Number(goal.current_credit_lbs).toFixed(1)}`} unit="lb" />
              <Stat label="Behind" value={String(goal.consecutive_behind_days)} unit="days" />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="flex-1 min-w-[140px]">
              {saveMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {goal ? "Update goal" : "Create goal"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setImpersonatedClientId(clientId);
                navigate("/client/pace", { state: { returnTo: `/clients/${clientId}` } });
              }}
            >
              Preview Tracker <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setImpersonatedClientId(clientId);
                navigate("/client/dashboard", { state: { returnTo: `/clients/${clientId}` } });
              }}
            >
              Preview Dashboard <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/smart-pace-preview")}
            >
              All states demo
            </Button>
            {goal && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm("Delete this goal and start fresh? This cannot be undone.")) {
                    resetMut.mutate();
                  }
                }}
                disabled={resetMut.isPending}
              >
                {resetMut.isPending ? "Resetting..." : "Reset goal"}
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            <strong>Toggle OFF</strong> just hides the tracker from the client — goal data is preserved. Use <strong>Reset goal</strong> to wipe and start over. <strong>Preview</strong> buttons are read-only.
          </p>

          {goal && (
            <>
              <Separator />
              <SmartPaceAdminPanel
                clientId={clientId}
                goal={goal as unknown as SmartPaceGoal}
                onChanged={() => {
                  qc.invalidateQueries({ queryKey: ["smart-pace-trainer-goal", clientId] });
                }}
              />
            </>
          )}
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
