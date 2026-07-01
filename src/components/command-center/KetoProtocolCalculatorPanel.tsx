import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Goal = "cut" | "maintain" | "bulk";
type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";

interface Props { clientId: string; trainerId: string }

const ACTIVITY_MULT: Record<Activity, number> = {
  sedentary: 13, light: 14.5, moderate: 16, active: 17.5, very_active: 19,
};
const GOAL_ADJUST: Record<Goal, number> = { cut: -0.20, maintain: 0, bulk: 0.10 };
const ACTIVITY_LABEL: Record<Activity, string> = {
  sedentary: "Sedentary (desk job)",
  light: "Light (1–3 days/wk)",
  moderate: "Moderate (3–5 days/wk)",
  active: "Active (6–7 days/wk)",
  very_active: "Very Active (2x/day)",
};
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function KetoProtocolCalculatorPanel({ clientId, trainerId }: Props) {
  const storageKey = `keto-protocol-${clientId}`;

  const { data: assignment } = useQuery({
    queryKey: ["keto-assignment", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_keto_assignments")
        .select("keto_type_id, assigned_at, keto_types(abbreviation, name, protein_pct, carbs_pct, fat_pct, carb_limit_grams, color)")
        .eq("client_id", clientId)
        .maybeSingle();
      return data;
    },
  });

  const { data: weightLbs } = useQuery({
    queryKey: ["latest-weight", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_metric_entries" as any)
        .select("value, client_metrics!inner(metric_definitions!inner(name))")
        .eq("client_id", clientId)
        .eq("client_metrics.metric_definitions.name", "Weight")
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as any)?.value ?? null;
    },
  });

  const { data: paceGoal } = useQuery({
    queryKey: ["pace-goal", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("smart_pace_goals")
        .select("goal_type")
        .eq("client_id", clientId)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
  });

  const [weight, setWeight] = useState<string>("");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [activity, setActivity] = useState<Activity>("moderate");
  const [startDate, setStartDate] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setWeight(String(s.weight ?? ""));
        setGoal(s.goal ?? "maintain");
        setActivity(s.activity ?? "moderate");
        setStartDate(s.startDate ?? "");
        return;
      } catch {}
    }
    if (weightLbs && !weight) setWeight(String(weightLbs));
    if (assignment?.assigned_at && !startDate) {
      setStartDate(new Date(assignment.assigned_at).toISOString().slice(0, 10));
    }
    if (paceGoal?.goal_type) {
      const g = paceGoal.goal_type.toLowerCase();
      if (g.includes("loss") || g.includes("cut")) setGoal("cut");
      else if (g.includes("gain") || g.includes("bulk")) setGoal("bulk");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment, weightLbs, paceGoal]);

  const kt = assignment?.keto_types as any;

  const plan = useMemo(() => {
    const w = parseFloat(weight);
    if (!w || !kt) return null;
    const tdee = Math.round(w * ACTIVITY_MULT[activity]);
    const target = Math.round(tdee * (1 + GOAL_ADJUST[goal]));
    const proteinFloor = Math.round(w * 0.9);

    const isCKD = kt.abbreviation === "CKD";
    const days = DAYS.map((d, i) => {
      const isRefeed = isCKD && (i === 5 || i === 6); // Sat/Sun
      const cal = isRefeed ? Math.round(target * 1.15) : target;
      const proteinG = Math.max(proteinFloor, Math.round((cal * (kt.protein_pct / 100)) / 4));
      const carbG = isRefeed ? Math.round((cal * 0.45) / 4) : Math.round((cal * (kt.carbs_pct / 100)) / 4);
      const fatG = Math.round((cal - proteinG * 4 - carbG * 4) / 9);
      const fastWindow = isRefeed ? "14:10 (refeed)" : "16:8";
      const eatStart = isRefeed ? "10:00 AM" : "12:00 PM";
      const eatEnd = "8:00 PM";
      return { day: d, isRefeed, cal, proteinG, carbG, fatG, fastWindow, eatStart, eatEnd };
    });
    return { tdee, target, proteinFloor, days };
  }, [weight, goal, activity, kt]);

  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify({ weight, goal, activity, startDate, savedAt: new Date().toISOString() }));
    toast.success("Protocol saved for this client");
  };

  const handleReset = () => {
    localStorage.removeItem(storageKey);
    setWeight(weightLbs ? String(weightLbs) : "");
    setGoal("maintain");
    setActivity("moderate");
    toast.info("Reset to defaults");
  };

  if (!assignment) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Assign a keto type to this client before generating a protocol.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5" style={{ color: kt?.color }} />
              <CardTitle>Protocol Calculator</CardTitle>
              <Badge variant="outline" style={{ borderColor: kt?.color, color: kt?.color }}>
                {kt?.abbreviation} · {kt?.name}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RefreshCw className="h-4 w-4 mr-1" /> Reset
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!plan}>
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Weight (lbs)</Label>
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="180" />
            </div>
            <div>
              <Label>Goal</Label>
              <Select value={goal} onValueChange={(v) => setGoal(v as Goal)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cut">Cut (-20%)</SelectItem>
                  <SelectItem value="maintain">Maintain</SelectItem>
                  <SelectItem value="bulk">Bulk (+10%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Activity</Label>
              <Select value={activity} onValueChange={(v) => setActivity(v as Activity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACTIVITY_LABEL) as Activity[]).map(k => (
                    <SelectItem key={k} value={k}>{ACTIVITY_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>

          {plan && (
            <>
              <Separator />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Stat label="TDEE" value={`${plan.tdee} kcal`} />
                <Stat label="Daily Target" value={`${plan.target} kcal`} />
                <Stat label="Protein Floor" value={`${plan.proteinFloor} g`} />
                <Stat label="Carb Ceiling" value={`${kt.carb_limit_grams} g`} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {plan && (
        <Card>
          <CardHeader><CardTitle className="text-base">Weekly Plan</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
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
                      <td className="p-3">{d.fastWindow}</td>
                      <td className="p-3 text-muted-foreground">{d.eatStart} – {d.eatEnd}</td>
                      <td className="p-3 text-right">{d.cal}</td>
                      <td className="p-3 text-right">{d.proteinG}g</td>
                      <td className="p-3 text-right">{d.carbG}g</td>
                      <td className="p-3 text-right">{d.fatG}g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}