import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Flame, Zap, Clock, Sparkles, Plus, AlertTriangle, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface CoachingSuggestion {
  type: string;
  label: string;
  action: string;
}

interface CoachNudge {
  type: string;
  message: string;
  exceeded: string[];
  signals?: string[];
  suggestions?: CoachingSuggestion[];
}

interface MealResult {
  id: string;
  name: string;
  description?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  prep_time_minutes?: number;
  image_url?: string;
  tags?: string[];
  is_ai_generated?: boolean;
  score?: number;
  pick_label?: string | null;
  pick_slot?: number | null;
  macro_feedback?: string | null;
  suggested_multiplier?: number;
  macro_profile?: string;
}

interface MacroTargets {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
}

export default function ClientMealResults() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [meals, setMeals] = useState<MealResult[]>([]);
  const [coachPicks, setCoachPicks] = useState<MealResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [macroTargets, setMacroTargets] = useState<MacroTargets | null>(null);
  const [ketoType, setKetoType] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [hasAiSuggestions, setHasAiSuggestions] = useState(false);
  const [activeNudge, setActiveNudge] = useState<CoachNudge | null>(null);

  // Parse filters from URL
  const filters = {
    meal_types: searchParams.get("types")?.split(",").filter(Boolean) || [],
    meal_goals: searchParams.get("goals")?.split(",").filter(Boolean) || [],
    hunger_level: searchParams.get("hunger") || null,
    prep_styles: searchParams.get("prep")?.split(",").filter(Boolean) || [],
    // Engine state
    fasting_state: searchParams.get("fasting_state") || undefined,
    eating_phase: searchParams.get("eating_phase") || undefined,
    training_state: searchParams.get("training_state") || undefined,
    keto_type: searchParams.get("keto_type") || undefined,
    goal: searchParams.get("goal") || undefined,
    auto_mode: searchParams.get("auto_mode") === "true",
  };

  const handleSuggestionTap = (suggestion: CoachingSuggestion) => {
    setActiveNudge(null);
    const goalMap: Record<string, string> = {
      high_protein: "High Protein",
      low_carb: "Light & Clean",
      quick_meal: "Quick & Easy",
      break_fast: "Break My Fast",
      protein_boost: "High Protein",
    };
    const prepMap: Record<string, string> = {
      quick_meal: "Quick,Grab & Go",
    };
    const goal = goalMap[suggestion.type] || "";
    const prep = prepMap[suggestion.type] || "";
    const params = new URLSearchParams();
    if (goal) params.set("goals", goal);
    if (prep) params.set("prep", prep);
    navigate(`/client/meal-results?${params.toString()}`);
    // Re-fetch with new filters
    setTimeout(() => window.location.reload(), 100);
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchMeals();
  }, [user?.id]);

  const fetchMeals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("meal-filter", {
        body: {
          client_id: user?.id,
          ...filters,
        },
      });

      if (error) throw error;

      setMeals(data.meals || []);
      setCoachPicks(data.coach_picks || []);
      setMacroTargets(data.macro_targets);
      setKetoType(data.keto_type);
      setUsedFallback(data.used_fallback);
      setHasAiSuggestions(data.has_ai_suggestions);
    } catch (e) {
      console.error("Failed to fetch meals:", e);
      toast({
        title: "Error",
        description: "Could not load meals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const logMealMutation = useMutation({
    mutationFn: async (meal: MealResult) => {
      const { error } = await supabase.from("nutrition_logs").insert({
        client_id: user?.id,
        log_date: format(new Date(), "yyyy-MM-dd"),
        meal_name: meal.name,
        calories: meal.calories || null,
        protein: meal.protein || null,
        carbs: meal.carbs || null,
        fats: meal.fats || null,
        notes: meal.is_ai_generated ? "AI-suggested meal" : `From recipe: ${meal.name}`,
      });
      if (error) throw error;

      // Check for coaching nudge
      const { data: nudgeData } = await supabase.functions.invoke("meal-coach-nudge", {
        body: {
          client_id: user?.id,
          logged_meal: {
            name: meal.name,
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fats: meal.fats,
          },
        },
      });

      return nudgeData;
    },
    onSuccess: (nudgeData) => {
      queryClient.invalidateQueries({ queryKey: ["nutrition-logs"] });
      queryClient.invalidateQueries({ queryKey: ["nutrition-today"] });

      toast({
        title: "✅ Meal logged!",
        description: "Added to your daily nutrition log.",
      });

      // Show coaching nudge with suggestions
      if (nudgeData?.nudge) {
        setActiveNudge(nudgeData.nudge);
        setTimeout(() => {
          toast({
            title: getNudgeTitle(nudgeData.nudge.type),
            description: nudgeData.nudge.message,
            variant: nudgeData.nudge.type === "exceeded" ? "destructive" : "default",
            duration: 8000,
          });
        }, 1500);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to log meal",
        variant: "destructive",
      });
    },
  });

  return (
    <ClientLayout>
      <div className="pb-6 w-full">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Your Meals</h1>
            {ketoType && (
              <p className="text-xs text-muted-foreground">{ketoType} · Sorted by protein</p>
            )}
          </div>
        </div>

        {/* Active Filters */}
        {(filters.meal_types.length > 0 || filters.meal_goals.length > 0 || filters.hunger_level || filters.prep_styles.length > 0) && (
          <div className="px-5 pb-3 flex flex-wrap gap-1.5">
            {filters.meal_types.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
            ))}
            {filters.meal_goals.map((g) => (
              <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
            ))}
            {filters.hunger_level && (
              <Badge variant="secondary" className="text-xs">{filters.hunger_level} hunger</Badge>
            )}
            {filters.prep_styles.map((p) => (
              <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
            ))}
          </div>
        )}

        {/* Macro Targets Bar */}
        {macroTargets && (
          <div className="px-5 pb-4">
            <div className="grid grid-cols-4 gap-2">
              <MacroMini label="Cal" value={macroTargets.calories} color="text-orange-500" />
              <MacroMini label="Protein" value={macroTargets.protein} unit="g" color="text-blue-500" />
              <MacroMini label="Carbs" value={macroTargets.carbs} unit="g" color="text-green-500" />
              <MacroMini label="Fat" value={macroTargets.fats} unit="g" color="text-yellow-500" />
            </div>
          </div>
        )}

        {/* Fallback Notice */}
        {usedFallback && (
          <div className="mx-5 mb-3 rounded-xl bg-muted/50 border border-border p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              No exact matches found. Showing best keto meals for your plan.
            </p>
          </div>
        )}

        {hasAiSuggestions && (
          <div className="mx-5 mb-3 rounded-xl bg-primary/5 border border-primary/20 p-3 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              AI-generated meal suggestions based on your keto type and goals.
            </p>
          </div>
        )}

        {/* Smart Coaching Banner */}
        {activeNudge && (
          <div className="mx-5 mb-3">
            <div className={`rounded-2xl p-4 border ${
              activeNudge.type === "exceeded" ? "bg-destructive/10 border-destructive/30" :
              activeNudge.type === "warning" ? "bg-amber-500/10 border-amber-500/30" :
              "bg-primary/10 border-primary/30"
            }`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium flex-1">{activeNudge.message}</p>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setActiveNudge(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {activeNudge.suggestions && activeNudge.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {activeNudge.suggestions.map((s) => (
                    <Button
                      key={s.type}
                      variant="secondary"
                      size="sm"
                      className="rounded-xl text-xs h-8"
                      onClick={() => handleSuggestionTap(s)}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Coach Picks */}
        {!loading && coachPicks.length > 0 && (
          <div className="px-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Coach Picks For You</h2>
                <p className="text-[10px] text-muted-foreground">Scored and ranked by your coach engine</p>
              </div>
            </div>
            <div className="space-y-3">
              {coachPicks.map((pick, idx) => (
                <CoachPickCard
                  key={pick.id}
                  meal={pick}
                  rank={idx + 1}
                  onLog={() => logMealMutation.mutate(pick)}
                  isLogging={logMealMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Results */}
        {!loading && meals.length > coachPicks.length && (
          <div className="px-5 mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">All Matching Meals</h2>
          </div>
        )}
        <div className="px-5 space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))
          ) : meals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No meals available. Try adjusting your filters.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                Change Filters
              </Button>
            </div>
          ) : (
            meals
              .filter((m) => !coachPicks.some((p) => p.id === m.id))
              .map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onLog={() => logMealMutation.mutate(meal)}
                  isLogging={logMealMutation.isPending}
                />
              ))
          )}
        </div>
      </div>
    </ClientLayout>
  );
}

function getNudgeTitle(type: string): string {
  switch (type) {
    case "exceeded": return "⚠️ Macro Alert";
    case "warning": return "⚡ Heads Up";
    case "suggestion": return "💪 Coach Tip";
    case "prompt": return "🍽️ Time to Eat!";
    default: return "💡 Coach Says";
  }
}

function MacroMini({ label, value, unit, color }: { label: string; value: number | null; unit?: string; color: string }) {
  return (
    <div className="rounded-xl bg-card border border-border p-2 text-center">
      <p className={`text-sm font-bold ${color}`}>{value ?? "—"}{unit}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

const PICK_ICONS: Record<number, string> = { 1: "🏆", 2: "🔄", 3: "⚡" };
const PICK_COLORS: Record<number, string> = {
  1: "border-primary/40 bg-primary/5",
  2: "border-border bg-card",
  3: "border-border bg-card",
};

const PROFILE_LABELS: Record<string, { label: string; emoji: string; className: string }> = {
  high_protein: { label: "High Protein", emoji: "🥩", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  high_fat: { label: "High Fat", emoji: "🥑", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  balanced: { label: "Balanced", emoji: "⚖️", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  performance_carb: { label: "Performance", emoji: "⚡", className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
};

function MacroProfileBadge({ profile }: { profile?: string }) {
  const info = PROFILE_LABELS[profile || "balanced"] || PROFILE_LABELS.balanced;
  return (
    <Badge variant="outline" className={`text-[10px] shrink-0 ${info.className}`}>
      {info.emoji} {info.label}
    </Badge>
  );
}

function PortionBadge({ multiplier }: { multiplier?: number }) {
  if (!multiplier || multiplier === 1.0) return null;
  return (
    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30 shrink-0">
      {multiplier}x portion
    </Badge>
  );
}

function MacroFeedback({ feedback }: { feedback?: string | null }) {
  if (!feedback) return null;
  const isPositive = feedback.includes("Perfect") || feedback.includes("Good fit");
  const isWarning = feedback.includes("low") || feedback.includes("high") || feedback.includes("High");
  return (
    <p className={`text-[11px] mt-1.5 font-medium ${
      isPositive ? "text-emerald-400" : isWarning ? "text-amber-400" : "text-muted-foreground"
    }`}>
      {isPositive ? "✅ " : isWarning ? "⚠️ " : "💡 "}{feedback}
    </p>
  );
}

function CoachPickCard({ meal, rank, onLog, isLogging }: { meal: MealResult; rank: number; onLog: () => void; isLogging: boolean }) {
  const icon = PICK_ICONS[rank] || "🍽️";
  const colorClass = PICK_COLORS[rank] || "";
  return (
    <Card className={`rounded-2xl overflow-hidden transition-colors ${colorClass}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl mt-0.5">{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <Badge variant={rank === 1 ? "default" : "secondary"} className="text-[10px] shrink-0">
                {meal.pick_label || `Pick #${rank}`}
              </Badge>
              <MacroProfileBadge profile={meal.macro_profile} />
              <PortionBadge multiplier={meal.suggested_multiplier} />
              {meal.score != null && (
                <span className="text-[10px] text-muted-foreground font-mono">{meal.score}/120</span>
              )}
            </div>
            <h3 className="font-bold text-sm mb-0.5">{meal.name}</h3>
            {meal.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{meal.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs">
              {meal.calories != null && (
                <span className="flex items-center gap-1 text-orange-500 font-medium">
                  <Flame className="h-3 w-3" /> {meal.suggested_multiplier && meal.suggested_multiplier !== 1
                    ? Math.round(meal.calories * meal.suggested_multiplier)
                    : meal.calories}
                </span>
              )}
              {meal.protein != null && (
                <span className="text-blue-500 font-medium">P: {meal.suggested_multiplier && meal.suggested_multiplier !== 1
                  ? Math.round(meal.protein * meal.suggested_multiplier)
                  : meal.protein}g</span>
              )}
              {meal.carbs != null && (
                <span className="text-green-500 font-medium">C: {meal.suggested_multiplier && meal.suggested_multiplier !== 1
                  ? Math.round(meal.carbs * meal.suggested_multiplier)
                  : meal.carbs}g</span>
              )}
              {meal.fats != null && (
                <span className="text-yellow-500 font-medium">F: {meal.suggested_multiplier && meal.suggested_multiplier !== 1
                  ? Math.round(meal.fats * meal.suggested_multiplier)
                  : meal.fats}g</span>
              )}
              {meal.prep_time_minutes != null && (
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <Clock className="h-3 w-3" /> {meal.prep_time_minutes}m
                </span>
              )}
            </div>
            <MacroFeedback feedback={meal.macro_feedback} />
          </div>
          <Button
            size="icon"
            variant="outline"
            className="shrink-0 h-10 w-10 rounded-xl"
            onClick={onLog}
            disabled={isLogging}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MealCard({ meal, onLog, isLogging }: { meal: MealResult; onLog: () => void; isLogging: boolean }) {
  return (
    <Card className="rounded-2xl overflow-hidden border-border hover:border-primary/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold text-sm truncate">{meal.name}</h3>
              <MacroProfileBadge profile={meal.macro_profile} />
              {meal.is_ai_generated && (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI
                </Badge>
              )}
              <PortionBadge multiplier={meal.suggested_multiplier} />
            </div>
            {meal.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{meal.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs">
              {meal.calories != null && (
                <span className="flex items-center gap-1 text-orange-500 font-medium">
                  <Flame className="h-3 w-3" /> {meal.suggested_multiplier && meal.suggested_multiplier !== 1
                    ? Math.round(meal.calories * meal.suggested_multiplier)
                    : meal.calories}
                </span>
              )}
              {meal.protein != null && (
                <span className="text-blue-500 font-medium">P: {meal.suggested_multiplier && meal.suggested_multiplier !== 1
                  ? Math.round(meal.protein * meal.suggested_multiplier)
                  : meal.protein}g</span>
              )}
              {meal.carbs != null && (
                <span className="text-green-500 font-medium">C: {meal.suggested_multiplier && meal.suggested_multiplier !== 1
                  ? Math.round(meal.carbs * meal.suggested_multiplier)
                  : meal.carbs}g</span>
              )}
              {meal.fats != null && (
                <span className="text-yellow-500 font-medium">F: {meal.suggested_multiplier && meal.suggested_multiplier !== 1
                  ? Math.round(meal.fats * meal.suggested_multiplier)
                  : meal.fats}g</span>
              )}
              {meal.prep_time_minutes != null && (
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <Clock className="h-3 w-3" /> {meal.prep_time_minutes}m
                </span>
              )}
            </div>
            <MacroFeedback feedback={meal.macro_feedback} />
          </div>
          <Button
            size="icon"
            variant="outline"
            className="shrink-0 h-10 w-10 rounded-xl"
            onClick={onLog}
            disabled={isLogging}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CoachPickCard({ meal, rank, onLog, isLogging }: { meal: MealResult; rank: number; onLog: () => void; isLogging: boolean }) {
  const icon = PICK_ICONS[rank] || "🍽️";
  const colorClass = PICK_COLORS[rank] || "";
  return (
    <Card className={`rounded-2xl overflow-hidden transition-colors ${colorClass}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl mt-0.5">{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant={rank === 1 ? "default" : "secondary"} className="text-[10px] shrink-0">
                {meal.pick_label || `Pick #${rank}`}
              </Badge>
              {meal.score != null && (
                <span className="text-[10px] text-muted-foreground font-mono">{meal.score}/100</span>
              )}
            </div>
            <h3 className="font-bold text-sm mb-0.5">{meal.name}</h3>
            {meal.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{meal.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs">
              {meal.calories != null && (
                <span className="flex items-center gap-1 text-orange-500 font-medium">
                  <Flame className="h-3 w-3" /> {meal.calories}
                </span>
              )}
              {meal.protein != null && (
                <span className="text-blue-500 font-medium">P: {meal.protein}g</span>
              )}
              {meal.carbs != null && (
                <span className="text-green-500 font-medium">C: {meal.carbs}g</span>
              )}
              {meal.fats != null && (
                <span className="text-yellow-500 font-medium">F: {meal.fats}g</span>
              )}
              {meal.prep_time_minutes != null && (
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <Clock className="h-3 w-3" /> {meal.prep_time_minutes}m
                </span>
              )}
            </div>
          </div>
          <Button
            size="icon"
            variant="outline"
            className="shrink-0 h-10 w-10 rounded-xl"
            onClick={onLog}
            disabled={isLogging}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MealCard({ meal, onLog, isLogging }: { meal: MealResult; onLog: () => void; isLogging: boolean }) {
  return (
    <Card className="rounded-2xl overflow-hidden border-border hover:border-primary/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-sm truncate">{meal.name}</h3>
              {meal.is_ai_generated && (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI
                </Badge>
              )}
            </div>
            {meal.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{meal.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs">
              {meal.calories != null && (
                <span className="flex items-center gap-1 text-orange-500 font-medium">
                  <Flame className="h-3 w-3" /> {meal.calories}
                </span>
              )}
              {meal.protein != null && (
                <span className="text-blue-500 font-medium">P: {meal.protein}g</span>
              )}
              {meal.carbs != null && (
                <span className="text-green-500 font-medium">C: {meal.carbs}g</span>
              )}
              {meal.fats != null && (
                <span className="text-yellow-500 font-medium">F: {meal.fats}g</span>
              )}
              {meal.prep_time_minutes != null && (
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <Clock className="h-3 w-3" /> {meal.prep_time_minutes}m
                </span>
              )}
            </div>
          </div>
          <Button
            size="icon"
            variant="outline"
            className="shrink-0 h-10 w-10 rounded-xl"
            onClick={onLog}
            disabled={isLogging}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
