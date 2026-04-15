import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  UtensilsCrossed,
  Sparkles,
  ScanBarcode,
  Camera,
  PenLine,
  ChefHat,
  Shuffle,
  ChevronRight,
  Flame,
  Zap,
  Moon,
} from "lucide-react";
import { useMealEngineState } from "@/hooks/useMealEngineState";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// --- Phase config ---
const PHASE_CONFIG: Record<string, { icon: React.ReactNode; label: string; message: string; color: string }> = {
  fasting_active: {
    icon: <Clock className="h-5 w-5" />,
    label: "Fasting",
    message: "Stay in your fast — you're building metabolic power.",
    color: "text-amber-400",
  },
  break_fast_triggered: {
    icon: <UtensilsCrossed className="h-5 w-5" />,
    label: "Break Fast",
    message: "Break your fast correctly — protein first, slow entry.",
    color: "text-emerald-400",
  },
  eating_window_open: {
    icon: <Flame className="h-5 w-5" />,
    label: "Fueling",
    message: "Fuel your body — hit your protein and stay in range.",
    color: "text-sky-400",
  },
  eating_window_closing: {
    icon: <Moon className="h-5 w-5" />,
    label: "Closing",
    message: "Close your window strong — one final quality meal.",
    color: "text-violet-400",
  },
  idle: {
    icon: <Zap className="h-5 w-5" />,
    label: "Ready",
    message: "Start your fasting cycle to activate your engine.",
    color: "text-muted-foreground",
  },
};

// --- Macro bar color ---
function getMacroBarColor(current: number, target: number): string {
  if (target <= 0) return "bg-muted";
  const ratio = current / target;
  if (ratio > 1.1) return "bg-destructive";
  if (ratio > 0.85) return "bg-emerald-500";
  if (ratio > 0.6) return "bg-amber-500";
  return "bg-muted-foreground/30";
}

function getMacroStatusLabel(current: number, target: number): string {
  if (target <= 0) return "";
  const ratio = current / target;
  if (ratio > 1.1) return "Over";
  if (ratio > 0.85) return "On Track";
  if (ratio > 0.6) return "Close";
  return `${Math.round(target - current)}g left`;
}

interface CoachPick {
  id: string;
  name: string;
  calories?: number;
  protein?: number;
  image_url?: string;
  score?: number;
  pick_label?: string;
  macro_feedback?: string;
  macro_profile?: string;
}

export function MetabolicControlDashboard() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();
  const engine = useMealEngineState();
  const phase = PHASE_CONFIG[engine.fasting_state] || PHASE_CONFIG.idle;

  // --- Fasting timer state ---
  const [elapsed, setElapsed] = useState("");
  const [remaining, setRemaining] = useState("");

  // Fetch today's logged macros
  const { data: todayMacros } = useQuery({
    queryKey: ["metabolic-today-macros", clientId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("client_meal_selections")
        .select("recipe_id, serving_multiplier, recipes(calories, protein, carbs, fats)")
        .eq("client_id", clientId!)
        .eq("meal_date", today);
      let calories = 0, protein = 0, carbs = 0, fats = 0;
      (data || []).forEach((sel: any) => {
        const m = sel.serving_multiplier || 1;
        const r = sel.recipes;
        if (r) {
          calories += (r.calories || 0) * m;
          protein += (r.protein || 0) * m;
          carbs += (r.carbs || 0) * m;
          fats += (r.fats || 0) * m;
        }
      });
      return { calories: Math.round(calories), protein: Math.round(protein), carbs: Math.round(carbs), fats: Math.round(fats) };
    },
    enabled: !!clientId,
    refetchInterval: 30000,
  });

  // Fetch coach picks (top 3 from meal-filter)
  const { data: coachPicks } = useQuery({
    queryKey: ["metabolic-coach-picks", clientId, engine.fasting_state, engine.eating_phase, engine.training_state],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("meal-filter", {
        body: {
          client_id: clientId,
          fasting_state: engine.fasting_state,
          eating_phase: engine.eating_phase,
          training_state: engine.training_state,
          keto_type: engine.keto_type,
          goal: engine.goal,
          limit: 3,
          coach_picks_only: true,
        },
      });
      return (data?.coach_picks || data?.meals?.slice(0, 3) || []) as CoachPick[];
    },
    enabled: !!clientId && engine.fasting_state !== "fasting_active" && !engine.isLoading,
    staleTime: 60000,
  });

  // Timer tick
  useEffect(() => {
    if (engine.fasting_state !== "fasting_active" && engine.fasting_state !== "eating_window_open" && engine.fasting_state !== "eating_window_closing") {
      setElapsed("");
      setRemaining("");
      return;
    }

    const tick = () => {
      const now = new Date();

      if (engine.fasting_state === "fasting_active") {
        // Show elapsed fasting time
        const start = engine.macroTargets ? null : null; // We need fast start from feature settings
        // Use a simpler approach: fetch from useMealEngineState raw data isn't available here
        // We'll display the phase message instead
      }

      if (engine.eatingWindowEndsAt) {
        const end = new Date(engine.eatingWindowEndsAt);
        const diff = end.getTime() - now.getTime();
        if (diff > 0) {
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          setRemaining(`${h}h ${m}m left`);
        } else {
          setRemaining("Window closed");
        }
      }
    };

    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [engine.fasting_state, engine.eatingWindowEndsAt]);

  const targets = engine.macroTargets || { calories: 0, protein: 0, carbs: 0, fats: 0 };
  const current = todayMacros || { calories: 0, protein: 0, carbs: 0, fats: 0 };

  const macros = [
    { key: "protein", label: "Protein", current: current.protein, target: targets.protein || 0, unit: "g", emoji: "🥩" },
    { key: "fats", label: "Fat", current: current.fats, target: targets.fats || 0, unit: "g", emoji: "🥑" },
    { key: "carbs", label: "Carbs", current: current.carbs, target: targets.carbs || 0, unit: "g", emoji: "🍚" },
  ];

  // Hide the fasting phase card when idle (no active fast or eating window)
  const showFastingPhase = engine.fasting_state !== "idle";

  return (
    <div className="space-y-3">
      {/* ── PRIMARY ACTION CARD ── */}
      {showFastingPhase && (
        <Card className="border-border/60 overflow-hidden">
          <CardContent className="p-0">
            <div className="relative px-4 py-4 bg-gradient-to-r from-card via-card to-muted/30">
              <div className="flex items-start gap-3">
                <div className={cn("mt-0.5 p-2 rounded-xl bg-muted/50", phase.color)}>
                  {phase.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                      {phase.label}
                    </Badge>
                    {remaining && engine.fasting_state !== "fasting_active" && (
                      <span className="text-[10px] font-semibold text-muted-foreground">{remaining}</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold mt-1.5 leading-snug text-foreground">
                    {phase.message}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── MACRO TRACKER ── */}
      {targets.protein !== null && targets.protein !== undefined && (targets.protein > 0 || targets.fats! > 0) && (
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Macro Tracker
              </p>
              <span className="text-xs font-semibold text-muted-foreground">
                {current.calories} / {targets.calories || 0} cal
              </span>
            </div>

            {macros.map((m) => {
              const pct = m.target > 0 ? Math.min((m.current / m.target) * 100, 110) : 0;
              const barColor = getMacroBarColor(m.current, m.target);
              const status = getMacroStatusLabel(m.current, m.target);

              return (
                <div key={m.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{m.emoji}</span>
                      <span className="text-xs font-semibold">{m.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {m.current}{m.unit} / {m.target}{m.unit}
                      </span>
                      {status && (
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                          pct > 110 ? "bg-destructive/10 text-destructive" :
                          pct > 85 ? "bg-emerald-500/10 text-emerald-600" :
                          pct > 60 ? "bg-amber-500/10 text-amber-600" :
                          "text-muted-foreground"
                        )}>
                          {status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", barColor)}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── COACH PICKS ── */}
      {engine.fasting_state !== "fasting_active" && coachPicks && coachPicks.length > 0 && (
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Coach Picks
                </p>
              </div>
              <button
                onClick={() => navigate("/client/log-meal")}
                className="text-xs font-semibold text-primary"
              >
                See all
              </button>
            </div>

            <div className="space-y-2">
              {coachPicks.map((pick, idx) => {
                const labels = ["Best Match", "Alternative", "Quick Option"];
                return (
                  <button
                    key={pick.id}
                    onClick={() => navigate(`/client/log-meal?recipe=${pick.id}`)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                  >
                    {pick.image_url ? (
                      <img src={pick.image_url} alt={pick.name} className="w-11 h-11 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{pick.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {pick.calories || 0} cal · {pick.protein || 0}g protein
                        </span>
                        {pick.macro_feedback && (
                          <span className="text-[10px] font-medium text-emerald-600 truncate">
                            {pick.macro_feedback}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] shrink-0">
                      {pick.pick_label || labels[idx] || "Pick"}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── QUICK ACTION BUTTONS ── */}
      {(engine.fasting_state === "eating_window_open" || engine.fasting_state === "eating_window_closing" || engine.fasting_state === "break_fast_triggered") && (
        <div className="grid grid-cols-5 gap-2">
          {[
            { icon: <Shuffle className="h-4 w-4" />, label: "Can't Decide", onClick: () => navigate("/client/log-meal?auto=1") },
            { icon: <ScanBarcode className="h-4 w-4" />, label: "Scan Food", onClick: () => navigate("/client/log-meal?mode=scan") },
            { icon: <Camera className="h-4 w-4" />, label: "Snap Meal", onClick: () => navigate("/client/log-meal?mode=snap") },
            { icon: <PenLine className="h-4 w-4" />, label: "Type Meal", onClick: () => navigate("/client/log-meal?mode=manual") },
            { icon: <ChefHat className="h-4 w-4" />, label: "Create Meal", onClick: () => navigate("/client/log-meal?mode=ai") },
          ].map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              <div className="text-foreground">{action.icon}</div>
              <span className="text-[10px] font-semibold text-muted-foreground leading-tight text-center">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
