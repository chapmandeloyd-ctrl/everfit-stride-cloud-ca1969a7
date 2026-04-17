import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, UtensilsCrossed } from "lucide-react";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format, subDays, addDays, parseISO } from "date-fns";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { getDietStylePreset } from "@/lib/dietStyles";

function getCutLevelMeta(adjustment?: number | null) {
  const pct = Math.round((adjustment ?? 0) * 100);
  if (pct <= -75) return { label: "Maximum Cut", tone: "destructive" as const };
  if (pct <= -65) return { label: "Extreme Deficit", tone: "destructive" as const };
  if (pct <= -45) return { label: "Aggressive Cut", tone: "warning" as const };
  if (pct <= -25) return { label: "Heavy Cut", tone: "warning" as const };
  if (pct <= -10) return { label: "Moderate Cut", tone: "success" as const };
  if (pct < 0) return { label: "Light Cut", tone: "success" as const };
  if (pct === 0) return { label: "Maintain", tone: "neutral" as const };
  if (pct <= 10) return { label: "Lean Bulk", tone: "info" as const };
  if (pct <= 20) return { label: "Surplus", tone: "info" as const };
  return { label: "Aggressive Bulk", tone: "info" as const };
}

export default function ClientNutrition() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();
  const [viewDate, setViewDate] = useState(new Date());
  const dateStr = format(viewDate, "yyyy-MM-dd");
  const isToday = dateStr === format(new Date(), "yyyy-MM-dd");

  // Fetch nutrition logs for the selected date
  const { data: dayLogs } = useQuery({
    queryKey: ["nutrition-logs-day", clientId, dateStr],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("client_id", clientId)
        .eq("log_date", dateStr)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch macro targets
  const { data: macroTargets } = useQuery({
    queryKey: ["client-macro-targets", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("client_macro_targets")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch assigned keto type (if any)
  const { data: ketoAssignment } = useQuery({
    queryKey: ["client-keto-assignment", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("client_keto_assignments")
        .select("keto_type:keto_types(*)")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
  const ketoType: any = (ketoAssignment as any)?.keto_type ?? null;

  const totals = {
    calories: dayLogs?.reduce((s, l) => s + (l.calories || 0), 0) || 0,
    protein: dayLogs?.reduce((s, l) => s + (Number(l.protein) || 0), 0) || 0,
    carbs: dayLogs?.reduce((s, l) => s + (Number(l.carbs) || 0), 0) || 0,
    fats: dayLogs?.reduce((s, l) => s + (Number(l.fats) || 0), 0) || 0,
  };

  const goals = {
    calories: Number(macroTargets?.target_calories ?? 0),
    protein: Number(macroTargets?.target_protein ?? 0),
    carbs: Number(macroTargets?.target_carbs ?? 0),
    fats: Number(macroTargets?.target_fats ?? 0),
  };

  const pctOfGoal = goals.calories > 0 ? Math.round((totals.calories / goals.calories) * 100) : 0;

  // Macro distribution (actual % of total calories)
  const totalMacroCals = totals.protein * 4 + totals.carbs * 4 + totals.fats * 9;
  const goalMacroCals = goals.protein * 4 + goals.carbs * 4 + goals.fats * 9;
  const actualDist = {
    protein: totalMacroCals > 0 ? Math.round((totals.protein * 4 / totalMacroCals) * 100) : 0,
    carbs: totalMacroCals > 0 ? Math.round((totals.carbs * 4 / totalMacroCals) * 100) : 0,
    fats: totalMacroCals > 0 ? Math.round((totals.fats * 9 / totalMacroCals) * 100) : 0,
  };
  const goalDist = {
    protein: goalMacroCals > 0 ? Math.round((goals.protein * 4 / goalMacroCals) * 100) : 0,
    carbs: goalMacroCals > 0 ? Math.round((goals.carbs * 4 / goalMacroCals) * 100) : 0,
    fats: goalMacroCals > 0 ? Math.round((goals.fats * 9 / goalMacroCals) * 100) : 0,
  };

  const macroColors = {
    protein: "hsl(217 91% 60%)",
    carbs: "hsl(142 71% 45%)",
    fats: "hsl(38 92% 50%)",
  };

  const cutMeta = getCutLevelMeta((macroTargets as any)?.deficit_pct);
  const deficitPct = typeof (macroTargets as any)?.deficit_pct === "number"
    ? Math.round((macroTargets as any).deficit_pct * 100)
    : null;
  const savedTdee = Number((macroTargets as any)?.tdee ?? 0);
  const toneClasses = {
    destructive: "border-primary/20 text-primary",
    warning: "border-primary/20 text-primary",
    success: "border-border text-foreground",
    info: "border-border text-foreground",
    neutral: "border-border text-muted-foreground",
  };

  const donutData = goals.calories > 0
    ? [
        { value: Math.min(totals.protein * 4, goals.protein * 4), color: macroColors.protein },
        { value: Math.min(totals.carbs * 4, goals.carbs * 4), color: macroColors.carbs },
        { value: Math.min(totals.fats * 9, goals.fats * 9), color: macroColors.fats },
        { value: Math.max(goals.calories - totals.calories, 0), color: "hsl(var(--muted))" },
      ]
    : [{ value: 1, color: "hsl(var(--muted))" }];

  return (
    <ClientLayout>
      <div className="flex flex-col min-h-screen">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Nutrition</h1>
          </div>
          <Button variant="ghost" size="sm" className="text-primary font-semibold px-2" onClick={() => navigate("/client/log-meal")}>
            <Plus className="h-4 w-4 mr-1" /> Log meal
          </Button>
        </div>

        <Tabs defaultValue="summary" className="flex-1">
          <TabsList className="grid w-full grid-cols-2 rounded-none border-b bg-transparent p-0 h-auto">
            <TabsTrigger
              value="summary"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-lg font-semibold text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Summary
            </TabsTrigger>
            <TabsTrigger
              value="journal"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-lg font-semibold text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Journal
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="px-4 pt-4 space-y-8 pb-8 mt-0">
            {/* Deficit status pill — pinned at very top */}
            {macroTargets && deficitPct !== null ? (
              <div className="flex justify-center">
                <div className={`inline-flex max-w-full flex-nowrap items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 ${toneClasses[cutMeta.tone]}`}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                  <span className="shrink-0 whitespace-nowrap text-sm font-semibold">{cutMeta.label}</span>
                  <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">({deficitPct > 0 ? `+${deficitPct}` : deficitPct}% {deficitPct === 0 ? "change" : deficitPct < 0 ? "deficit" : "surplus"})</span>
                  {savedTdee > 0 && (
                    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">· TDEE {savedTdee.toLocaleString()} Cal</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <button
                  onClick={() => navigate("/client/macro-setup")}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Complete macro setup to see your deficit
                </button>
              </div>
            )}

            {/* Date nav */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setViewDate(subDays(viewDate, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Daily View</p>
                <p className="text-2xl font-medium leading-tight">{isToday ? "Today" : format(viewDate, "MMM d, yyyy")}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewDate(addDays(viewDate, 1))} disabled={isToday}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Donut chart */}
            <div className="flex justify-center">
              <div className="relative w-56 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={72}
                      outerRadius={100}
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {donutData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4">
                  <span className="text-3xl font-bold leading-none">{pctOfGoal}%</span>
                  <span className="text-[10px] text-muted-foreground">of daily goals</span>
                  <button
                    onClick={() => navigate("/client/macro-setup?mode=edit")}
                    className="mt-1 inline-flex max-w-full items-center rounded-full border border-primary bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 whitespace-nowrap"
                  >
                    Edit Macros
                  </button>
                </div>
              </div>
            </div>

            {/* Consumed summary */}
            <div className="text-center space-y-2">
              <p className="text-base font-semibold">You have consumed</p>
              <div className="space-y-0.5">
                <p className="text-3xl font-bold leading-none text-primary">{totals.calories} <span className="text-2xl font-medium">Cal</span></p>
                <p className="text-xs text-muted-foreground">/ {goals.calories.toLocaleString()} Cal goal</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border px-4 py-1.5 h-auto text-sm font-semibold text-primary shadow-none"
                onClick={() => navigate("/client/macro-setup?mode=deficit")}
              >
                Adjust Cut Level
              </Button>
            </div>

            {/* Macro table */}
            <Card>
              <CardContent className="p-0">
                <div className="grid grid-cols-4 gap-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2 border-b">
                  <span>Macro</span>
                  <span className="text-center">Consumed</span>
                  <span className="text-center font-bold">Remaining</span>
                  <span className="text-right">Goal</span>
                </div>
                {[
                  { name: "Protein", consumed: totals.protein, goal: goals.protein, color: macroColors.protein },
                  { name: "Carbs", consumed: totals.carbs, goal: goals.carbs, color: macroColors.carbs },
                  { name: "Fat", consumed: totals.fats, goal: goals.fats, color: macroColors.fats },
                ].map((m) => (
                  <div key={m.name} className="grid grid-cols-4 gap-0 px-4 py-3 border-b last:border-b-0 items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                      <span className="text-sm font-medium">{m.name}</span>
                    </div>
                    <span className="text-sm text-center">{Math.round(m.consumed)} g</span>
                    <span className="text-sm text-center font-bold">{Math.max(Math.round(m.goal - m.consumed), 0)} g</span>
                    <span className="text-sm text-right text-muted-foreground">{Math.round(m.goal)} g</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Macro distribution card */}
            <Card>
              <CardContent className="p-0">
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-bold">Macro distribution</p>
                </div>
                <div className="grid grid-cols-3 gap-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2 border-b">
                  <span>Macro</span>
                  <span className="text-right">Actual</span>
                  <span className="text-right">Goal</span>
                </div>
                {[
                  { name: "Protein", actual: actualDist.protein, goal: goalDist.protein, color: macroColors.protein },
                  { name: "Carbs", actual: actualDist.carbs, goal: goalDist.carbs, color: macroColors.carbs },
                  { name: "Fat", actual: actualDist.fats, goal: goalDist.fats, color: macroColors.fats },
                ].map((m) => (
                  <div key={m.name} className="grid grid-cols-3 gap-0 px-4 py-3 border-b last:border-b-0 items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                      <span className="text-sm font-medium">{m.name}</span>
                    </div>
                    <span className="text-sm text-right font-bold">{m.actual}%</span>
                    <span className="text-sm text-right text-muted-foreground">{m.goal}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Assigned keto type card */}
            {ketoType && (
              <Card>
                <CardContent className="p-0">
                  <div className="flex items-start gap-3 px-4 py-3 border-b">
                    <span
                      className="shrink-0 inline-flex items-center justify-center rounded-md px-2 py-1 text-[10px] font-bold tracking-wider"
                      style={{ backgroundColor: `${ketoType.color || "#f59e0b"}20`, color: ketoType.color || "#f59e0b" }}
                    >
                      {ketoType.abbreviation}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{ketoType.name}</p>
                      {ketoType.subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5">{ketoType.subtitle}</p>
                      )}
                    </div>
                  </div>
                  {[
                    { name: "Protein", target: ketoType.protein_pct, today: actualDist.protein, color: macroColors.protein },
                    { name: "Carbs", target: ketoType.carbs_pct, today: actualDist.carbs, color: macroColors.carbs },
                    { name: "Fat", target: ketoType.fat_pct, today: actualDist.fats, color: macroColors.fats },
                  ].map((m) => (
                    <div key={m.name} className="grid grid-cols-3 gap-0 px-4 py-3 border-b last:border-b-0 items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                        <span className="text-sm font-medium">{m.name}</span>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Target</p>
                        <p className="text-sm font-bold">{m.target}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Today</p>
                        <p className="text-sm font-bold">{totalMacroCals > 0 ? `${m.today}%` : "—"}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

          </TabsContent>

          {/* Journal Tab */}
          <TabsContent value="journal" className="px-4 mt-3 space-y-4 pb-8">
            {/* Date nav */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setViewDate(subDays(viewDate, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <p className="font-semibold">Daily View</p>
                <p className="text-xs text-muted-foreground">{isToday ? "Today" : format(viewDate, "MMM d, yyyy")}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewDate(addDays(viewDate, 1))} disabled={isToday}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <h3 className="font-bold flex items-center gap-2">
              Your meals <span className="text-sm text-muted-foreground font-normal">🍴 {dayLogs?.length || 0}</span>
            </h3>

            {dayLogs && dayLogs.length > 0 ? (
              <div className="space-y-3">
                {dayLogs.map((log) => (
                  <div key={log.id}>
                    <p className="text-xs text-muted-foreground mb-1">{format(parseISO(log.created_at), "h:mm a")}</p>
                    <Card>
                      <CardContent className="p-3">
                        <p className="font-semibold text-sm">{log.meal_name}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span>🔥 {log.calories || 0} Cal</span>
                          {log.protein && <><span className="text-muted-foreground">|</span><span><span className="font-bold" style={{ color: "#6366f1" }}>P</span> {log.protein} g</span></>}
                          {log.carbs && <><span><span className="font-bold" style={{ color: "#22c55e" }}>C</span> {log.carbs} g</span></>}
                          {log.fats && <><span><span className="font-bold" style={{ color: "#eab308" }}>F</span> {log.fats} g</span></>}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <UtensilsCrossed className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No meals logged for this day</p>
                  <Button className="mt-3" size="sm" onClick={() => navigate("/client/log-meal")}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Log Meal
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
}
