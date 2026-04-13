import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, UtensilsCrossed, Brain, Lock, Flame, Zap, Clock, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { useMealEngineState } from "@/hooks/useMealEngineState";
import { Skeleton } from "@/components/ui/skeleton";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
const MEAL_GOALS = ["Break My Fast", "High Protein", "Light & Clean", "Performance Fuel", "Quick & Easy"] as const;
const HUNGER_LEVELS = ["Light", "Moderate", "High"] as const;
const PREP_STYLES = ["Quick", "Cooked", "Grab & Go", "No Prep"] as const;

function useMultiSelect<T extends string>(options: readonly T[]) {
  const [selected, setSelected] = useState<Set<T>>(new Set());
  const toggle = useCallback((item: T) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  }, []);
  const setItems = useCallback((items: T[]) => {
    setSelected(new Set(items));
  }, []);
  return { selected, toggle, setItems };
}

export default function ClientMealSelect() {
  const navigate = useNavigate();
  const engine = useMealEngineState();
  const mealType = useMultiSelect(MEAL_TYPES);
  const mealGoal = useMultiSelect(MEAL_GOALS);
  const prepStyle = useMultiSelect(PREP_STYLES);
  const [hunger, setHunger] = useState<string | null>(null);

  const hasSelection = mealType.selected.size > 0 || mealGoal.selected.size > 0 || hunger || prepStyle.selected.size > 0;

  // Build URL params including engine state
  const buildParams = (overrides?: { goals?: string }) => {
    const params = new URLSearchParams();
    if (mealType.selected.size > 0) params.set("types", [...mealType.selected].join(","));
    const goals = overrides?.goals || (mealGoal.selected.size > 0 ? [...mealGoal.selected].join(",") : "");
    if (goals) params.set("goals", goals);
    if (hunger) params.set("hunger", hunger);
    if (prepStyle.selected.size > 0) params.set("prep", [...prepStyle.selected].join(","));
    // Engine state params
    if (engine.fasting_state) params.set("fasting_state", engine.fasting_state);
    if (engine.eating_phase) params.set("eating_phase", engine.eating_phase);
    if (engine.training_state) params.set("training_state", engine.training_state);
    if (engine.keto_type) params.set("keto_type", engine.keto_type);
    if (engine.goal) params.set("goal", engine.goal);
    return params;
  };

  // --- Fasting Active: Block all meals ---
  if (!engine.isLoading && engine.fasting_state === "fasting_active") {
    return (
      <ClientLayout>
        <div className="min-h-[calc(100dvh-80px)] flex flex-col items-center justify-center px-5 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-destructive/20 blur-2xl animate-pulse" />
            <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-destructive to-destructive/60 flex items-center justify-center">
              <Lock className="h-10 w-10 text-destructive-foreground" />
            </div>
          </div>
          <h1 className="text-xl font-extrabold mb-2">Fasting In Progress</h1>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
            Meals are locked while you're fasting. Complete your fast to unlock your eating window.
          </p>
          <Button variant="outline" onClick={() => navigate("/client/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </ClientLayout>
    );
  }

  // Loading state
  if (engine.isLoading) {
    return (
      <ClientLayout>
        <div className="px-5 py-6 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-6 w-full" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        </div>
      </ClientLayout>
    );
  }

  // Phase-aware header info
  const phaseInfo = getPhaseInfo(engine.fasting_state, engine.eating_phase, engine.training_state);

  return (
    <ClientLayout>
      <div className="pb-28 w-full">
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-5 space-y-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">KSOM360 Meals</h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Meals filtered based on your current state — select preferences below.
          </p>
        </div>

        {/* Engine State Banner */}
        {phaseInfo && (
          <div className="mx-5 mb-4">
            <div className={`rounded-2xl p-4 border ${phaseInfo.borderColor} ${phaseInfo.bgColor}`}>
              <div className="flex items-center gap-2 mb-1">
                {phaseInfo.icon}
                <span className="text-sm font-bold">{phaseInfo.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{phaseInfo.description}</p>
              <div className="flex gap-2 mt-2">
                {engine.keto_type && (
                  <Badge variant="secondary" className="text-xs">{engine.keto_type}</Badge>
                )}
                {engine.eating_phase && (
                  <Badge variant="outline" className="text-xs capitalize">{engine.eating_phase.replace("_", " ")}</Badge>
                )}
                {engine.training_state !== "no_training" && (
                  <Badge variant="outline" className="text-xs capitalize">{engine.training_state.replace("_", " ")}</Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Auto Mode: Top 3 */}
        <div className="px-5 mb-4">
          <Button
            className="w-full h-14 text-base font-bold rounded-2xl shadow-lg shadow-primary/20"
            onClick={() => {
              const params = buildParams();
              params.set("auto_mode", "true");
              navigate(`/client/meal-results?${params.toString()}`);
            }}
          >
            <Brain className="h-5 w-5 mr-2" />
            🔥 Auto Pick — Top 3 Meals
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-1.5">
            Best matches for your phase, keto type & goals
          </p>
        </div>

        <div className="px-5">
          <div className="h-px bg-border my-2" />
        </div>

        <div className="px-5 space-y-6 mt-4">
          {/* Meal Type */}
          <FilterSection title="Meal Type">
            <div className="grid grid-cols-2 gap-2.5">
              {MEAL_TYPES.map((item) => (
                <CheckboxChip
                  key={item}
                  label={item}
                  checked={mealType.selected.has(item)}
                  onChange={() => mealType.toggle(item)}
                />
              ))}
            </div>
          </FilterSection>

          {/* Meal Goal */}
          <FilterSection title="Meal Goal">
            <div className="grid grid-cols-2 gap-2.5">
              {MEAL_GOALS.map((item) => (
                <CheckboxChip
                  key={item}
                  label={item}
                  checked={mealGoal.selected.has(item)}
                  onChange={() => mealGoal.toggle(item)}
                  highlight={engine.eating_phase === "break_fast" && item === "Break My Fast"}
                />
              ))}
            </div>
          </FilterSection>

          {/* Hunger Level */}
          <FilterSection title="Hunger Level">
            <div className="grid grid-cols-3 gap-2.5">
              {HUNGER_LEVELS.map((level) => (
                <RadioChip
                  key={level}
                  label={level}
                  selected={hunger === level}
                  onSelect={() => setHunger(hunger === level ? null : level)}
                />
              ))}
            </div>
          </FilterSection>

          {/* Prep Style */}
          <FilterSection title="Prep Style">
            <div className="grid grid-cols-2 gap-2.5">
              {PREP_STYLES.map((item) => (
                <CheckboxChip
                  key={item}
                  label={item}
                  checked={prepStyle.selected.has(item)}
                  onChange={() => prepStyle.toggle(item)}
                />
              ))}
            </div>
          </FilterSection>

          {/* Divider */}
          <div className="pt-4 pb-1">
            <div className="h-px bg-border" />
          </div>

          {/* Quick Actions */}
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Not Sure What You Want?</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 pb-4">
            <QuickActionCard
              emoji="🧠"
              title="Can't Decide"
              description="Let KSOM360 pick based on your state."
              onClick={() => {
                const params = buildParams({ goals: "Break My Fast,High Protein" });
                params.set("auto_mode", "true");
                navigate(`/client/meal-results?${params.toString()}`);
              }}
            />
            <QuickActionCard
              emoji="📦"
              title="Scan Your Food"
              description="Scan a barcode to instantly track."
              onClick={() => navigate("/client/log-meal?tab=scan")}
            />
            <QuickActionCard
              emoji="📸"
              title="Snap Your Meal"
              description="Photo → AI macro estimate."
              onClick={() => navigate("/client/log-meal?tab=photo")}
            />
            <QuickActionCard
              emoji="⌨️"
              title="Type Your Meal"
              description="Manual entry for full control."
              onClick={() => navigate("/client/log-meal?tab=manual")}
            />
          </div>
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t p-4 safe-area-bottom">
        <Button
          className="w-full h-14 text-base font-bold rounded-2xl shadow-lg shadow-primary/20"
          disabled={!hasSelection}
          onClick={() => {
            const params = buildParams();
            navigate(`/client/meal-results?${params.toString()}`);
          }}
        >
          Show My Meals
        </Button>
      </div>
    </ClientLayout>
  );
}

/* ─── Phase Info Helper ─── */

function getPhaseInfo(fastingState: string, eatingPhase: string | null, trainingState: string) {
  if (fastingState === "break_fast_triggered") {
    return {
      title: "Break-Fast Phase",
      description: "Your fast just ended. Showing meals optimized for breaking your fast safely.",
      icon: <Flame className="h-4 w-4 text-amber-500" />,
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
    };
  }
  if (fastingState === "eating_window_closing") {
    return {
      title: "Window Closing",
      description: "Your eating window is ending soon. Showing last-meal options.",
      icon: <Clock className="h-4 w-4 text-orange-500" />,
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/30",
    };
  }
  if (fastingState === "eating_window_open") {
    const isTraining = trainingState !== "no_training";
    return {
      title: isTraining ? "Eating Window · Training Day" : "Eating Window Open",
      description: isTraining
        ? "Training detected — prioritizing performance and recovery meals."
        : "Mid-window phase. Showing meals matched to your keto type.",
      icon: <Zap className="h-4 w-4 text-primary" />,
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
    };
  }
  if (trainingState !== "no_training") {
    return {
      title: trainingState === "post_workout" ? "Post-Workout" : "Training Day",
      description: "Meals prioritized for recovery and performance.",
      icon: <Zap className="h-4 w-4 text-primary" />,
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
    };
  }
  return null;
}

/* ─── Sub-components ─── */

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function CheckboxChip({ label, checked, onChange, highlight }: { label: string; checked: boolean; onChange: () => void; highlight?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex items-center gap-2.5 rounded-xl border px-4 py-3.5 text-sm font-medium transition-all active:scale-[0.97] ${
        checked
          ? "border-primary bg-primary/10 text-foreground"
          : highlight
          ? "border-amber-500/50 bg-amber-500/5 text-foreground ring-1 ring-amber-500/30"
          : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
          checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
        }`}
      >
        {checked && (
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
      {highlight && !checked && (
        <span className="text-[10px] text-amber-500 font-bold ml-auto">Suggested</span>
      )}
    </button>
  );
}

function RadioChip({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3.5 text-sm font-medium transition-all active:scale-[0.97] ${
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          selected ? "border-primary" : "border-muted-foreground/40"
        }`}
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </span>
      {label}
    </button>
  );
}

function QuickActionCard({ emoji, title, description, onClick }: { emoji: string; title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-2xl border bg-card p-4 text-left transition-all active:scale-[0.97] hover:border-primary/40 hover:shadow-md min-h-[44px]"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-sm font-bold text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground leading-relaxed">{description}</span>
    </button>
  );
}
