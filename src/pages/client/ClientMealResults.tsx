import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Flame, Zap, Clock, Sparkles, Plus, AlertTriangle, X, Lock, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMealUnlockState, type MealRole, roleLabel } from "@/hooks/useMealUnlockState";
import { useMealEngineState } from "@/hooks/useMealEngineState";
import { MealContextHeader } from "@/components/meals/MealContextHeader";
import { SmartFilterBar, type SmartFilter } from "@/components/meals/SmartFilterBar";
import { RecommendedMealCard } from "@/components/meals/RecommendedMealCard";

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
  const engine = useMealEngineState();

  const [meals, setMeals] = useState<MealResult[]>([]);
  const [coachPicks, setCoachPicks] = useState<MealResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [macroTargets, setMacroTargets] = useState<MacroTargets | null>(null);
  const [ketoType, setKetoType] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [hasAiSuggestions, setHasAiSuggestions] = useState(false);
  const [activeNudge, setActiveNudge] = useState<CoachNudge | null>(null);
  const [activeFilter, setActiveFilter] = useState<SmartFilter | null>(null);
  const unlockState = useMealUnlockState();

  // Parse filters from URL
  const filters = {
    meal_types: searchParams.get("types")?.split(",").filter(Boolean) || [],
    meal_goals: searchParams.get("goals")?.split(",").filter(Boolean) || [],
    hunger_level: searchParams.get("hunger") || null,
    prep_styles: searchParams.get("prep")?.split(",").filter(Boolean) || [],
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

  // Smart filter logic — client-side re-filter
  const filteredMeals = useMemo(() => {
    if (!activeFilter) return meals;
    return meals.filter((m) => {
      switch (activeFilter) {
        case "high_protein": return (m.protein || 0) >= 25;
        case "quick": return (m.prep_time_minutes || 999) <= 15;
        case "light": return (m.calories || 999) <= 400;
        case "heavy": return (m.calories || 0) >= 500;
        case "break_fast_safe": return m.tags?.includes("break_fast") || m.tags?.includes("breakfast");
        case "last_meal_control": return m.tags?.includes("last_meal") || m.tags?.includes("dinner");
        default: return true;
      }
    });
  }, [meals, activeFilter]);

  // Fallback: always guarantee 3 meals
  const fallbackMeals = useMemo(() => {
    if (filteredMeals.length > 0 || loading) return [];
    const sorted = [...meals];
    const byProtein = [...sorted].sort((a, b) => (b.protein || 0) - (a.protein || 0))[0];
    const byCarbs = [...sorted].sort((a, b) => (a.carbs || 999) - (b.carbs || 999))[0];
    const byPrep = [...sorted].sort((a, b) => (a.prep_time_minutes || 999) - (b.prep_time_minutes || 999))[0];
    const unique = new Map<string, MealResult>();
    [byProtein, byCarbs, byPrep].filter(Boolean).forEach((m) => unique.set(m.id, m));
    return Array.from(unique.values());
  }, [filteredMeals, meals, loading]);

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

  const displayMeals = filteredMeals.length > 0 ? filteredMeals : fallbackMeals;
  const showingFallback = filteredMeals.length === 0 && fallbackMeals.length > 0;

  return (
    <ClientLayout>
      <div className="pb-6 w-full">
        {/* Header */}
        <div className="px-4 pt-4 pb-1 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold">Smart Meals</h1>
          </div>
        </div>

        {/* SECTION 1: Context Header */}
        {!loading && (
          <MealContextHeader
            eatingPhase={engine.eating_phase}
            ketoType={ketoType || engine.keto_type}
            macroTargets={macroTargets || engine.macroTargets}
          />
        )}

        {/* SECTION 3: Smart Filter Bar */}
        {!loading && <SmartFilterBar active={activeFilter} onSelect={setActiveFilter} />}

        {/* Coaching Nudge */}
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
                    <Button key={s.type} variant="secondary" size="sm" className="rounded-xl text-xs h-8" onClick={() => handleSuggestionTap(s)}>
                      {s.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Unlock Progress */}
        {!loading && !unlockState.isFullyUnlocked && (
          <div className="mx-5 mb-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2">
            <Lock className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-amber-400">
                🔥 {unlockState.streak}-day streak — {unlockState.unlockedRoles.length}/3 phases unlocked
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {unlockState.streak < 3
                  ? `${3 - unlockState.streak} more days to unlock Mid Window meals`
                  : `${7 - unlockState.streak} more days to unlock full meal library`}
              </p>
            </div>
          </div>
        )}

        {/* SECTION 6: Fallback Notice */}
        {!loading && showingFallback && (
          <div className="mx-5 mb-3 rounded-xl bg-muted/50 border border-border p-3 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              We've got you — here's your best option based on protein, carbs, and prep time.
            </p>
          </div>
        )}

        {usedFallback && !showingFallback && (
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

        {/* SECTION 2: Recommended For You (Coach Picks) */}
        {!loading && coachPicks.length > 0 && (
          <div className="px-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <h2 className="text-sm font-extrabold">Recommended For You</h2>
            </div>
            <div className="space-y-2.5">
              {coachPicks.slice(0, 5).map((pick, idx) => (
                <RecommendedMealCard
                  key={pick.id}
                  meal={pick}
                  rank={idx + 1}
                  onSelect={() => logMealMutation.mutate(pick)}
                  onViewDetail={() => navigate(`/client/recipe/${pick.id}`)}
                  isLogging={logMealMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Filtered Meals */}
        {!loading && displayMeals.length > 0 && (
          <div className="px-5 mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {showingFallback ? "Best Options" : coachPicks.length > 0 ? "More Meals" : "Your Meals"}
            </h2>
          </div>
        )}
        <div className="px-5 space-y-2.5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))
          ) : displayMeals.length === 0 && coachPicks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No meals available.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                Change Filters
              </Button>
            </div>
          ) : (
            displayMeals
              .filter((m) => !coachPicks.some((p) => p.id === m.id))
              .slice(0, 5)
              .map((meal) => {
                const mealRole = inferMealRole(meal);
                const isLocked = mealRole ? unlockState.isRoleLocked(mealRole) : false;
                const unlockAt = mealRole ? unlockState.unlockAtForRole(mealRole) : null;
                return (
                  <RecommendedMealCard
                    key={meal.id}
                    meal={meal}
                    onSelect={() => logMealMutation.mutate(meal)}
                    onViewDetail={() => navigate(`/client/recipe/${meal.id}`)}
                    isLogging={logMealMutation.isPending}
                    locked={isLocked}
                    unlockAt={unlockAt}
                  />
                );
              })
          )}
        </div>

        {/* SECTION 4: Customize CTA */}
        {!loading && (
          <div className="px-5 pt-5 pb-2">
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl text-sm font-bold border-dashed"
              onClick={() => navigate("/client/meal-select")}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Customize Your Selection
            </Button>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}

function inferMealRole(meal: MealResult): MealRole | null {
  const tags = meal.tags || [];
  const name = (meal.name || "").toLowerCase();
  if (tags.includes("break_fast") || tags.includes("breakfast") || name.includes("break fast")) return "break_fast";
  if (tags.includes("last_meal") || tags.includes("dinner") || name.includes("last meal")) return "last_meal";
  if (tags.includes("mid_window") || tags.includes("lunch") || tags.includes("snack") || name.includes("mid window")) return "mid_window";
  return "mid_window";
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
