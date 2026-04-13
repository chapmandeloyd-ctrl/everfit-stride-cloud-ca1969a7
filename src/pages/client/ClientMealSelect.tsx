import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, UtensilsCrossed, Brain, Lock, Flame, Zap, Clock, Camera, Barcode, Keyboard, Sparkles, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { useMealEngineState } from "@/hooks/useMealEngineState";
import { Skeleton } from "@/components/ui/skeleton";

const MOOD_OPTIONS = ["Breakfast", "Lunch", "Dinner"] as const;
const MEAL_TYPE_OPTIONS = ["Quick & Simple", "High Protein", "Light Meal", "Heavy Meal"] as const;

type MoodOption = (typeof MOOD_OPTIONS)[number];
type MealTypeOption = (typeof MEAL_TYPE_OPTIONS)[number];

function useMultiSelect<T extends string>() {
  const [selected, setSelected] = useState<Set<T>>(new Set());
  const toggle = useCallback((item: T) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  }, []);
  return { selected, toggle };
}

export default function ClientMealSelect() {
  const navigate = useNavigate();
  const engine = useMealEngineState();
  const [step, setStep] = useState(1);
  const mood = useMultiSelect<MoodOption>();
  const mealType = useMultiSelect<MealTypeOption>();

  const buildParams = () => {
    const params = new URLSearchParams();
    if (mood.selected.size > 0) params.set("types", [...mood.selected].join(","));
    if (mealType.selected.size > 0) params.set("goals", [...mealType.selected].join(","));
    if (engine.fasting_state) params.set("fasting_state", engine.fasting_state);
    if (engine.eating_phase) params.set("eating_phase", engine.eating_phase);
    if (engine.training_state) params.set("training_state", engine.training_state);
    if (engine.keto_type) params.set("keto_type", engine.keto_type);
    if (engine.goal) params.set("goal", engine.goal);
    return params;
  };

  // --- Fasting Active: Block ---
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
          <Button variant="outline" onClick={() => navigate("/client/dashboard")}>Back to Dashboard</Button>
        </div>
      </ClientLayout>
    );
  }

  if (engine.isLoading) {
    return (
      <ClientLayout>
        <div className="px-5 py-6 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-6 w-full" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-[calc(100dvh-80px)] flex flex-col">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          {/* Step indicator */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? "w-6 bg-primary" : s < step ? "w-3 bg-primary/50" : "w-3 bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 px-5 py-4">
          {step === 1 && <StepOne mood={mood} />}
          {step === 2 && <StepTwo mealType={mealType} />}
          {step === 3 && (
            <StepThree
              navigate={navigate}
              buildParams={buildParams}
            />
          )}
        </div>

        {/* Bottom CTA */}
        {step < 3 && (
          <div className="px-5 pb-6 pt-2 safe-area-bottom">
            <Button
              className="w-full h-14 text-base font-bold rounded-2xl shadow-lg shadow-primary/20"
              disabled={step === 1 && mood.selected.size === 0}
              onClick={() => setStep(step + 1)}
            >
              Continue
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            {step === 1 && (
              <button
                type="button"
                className="w-full text-sm text-muted-foreground mt-3 py-2"
                onClick={() => setStep(3)}
              >
                Skip — show me other options
              </button>
            )}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}

/* ─── Step 1: Mood ─── */

function StepOne({ mood }: { mood: { selected: Set<MoodOption>; toggle: (item: MoodOption) => void } }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Welcome to KSOM360 Meals</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Check what you're in the mood for
        </p>
      </div>

      <div className="space-y-3">
        {MOOD_OPTIONS.map((item) => (
          <SelectableCard
            key={item}
            label={item}
            emoji={item === "Breakfast" ? "🌅" : item === "Lunch" ? "☀️" : "🌙"}
            subtitle={
              item === "Breakfast" ? "Start your day right" :
              item === "Lunch" ? "Midday fuel" :
              "End your day strong"
            }
            selected={mood.selected.has(item)}
            onToggle={() => mood.toggle(item)}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Step 2: Meal Type ─── */

function StepTwo({ mealType }: { mealType: { selected: Set<MealTypeOption>; toggle: (item: MealTypeOption) => void } }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-xl font-extrabold tracking-tight">Meal Type</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          What kind of meal are you looking for?
        </p>
      </div>

      <div className="space-y-3">
        {MEAL_TYPE_OPTIONS.map((item) => (
          <SelectableCard
            key={item}
            label={item}
            emoji={
              item === "Quick & Simple" ? "⚡" :
              item === "High Protein" ? "💪" :
              item === "Light Meal" ? "🥗" : "🍖"
            }
            subtitle={
              item === "Quick & Simple" ? "Ready in minutes" :
              item === "High Protein" ? "Maximize recovery" :
              item === "Light Meal" ? "Stay lean and clean" :
              "Fuel up for performance"
            }
            selected={mealType.selected.has(item)}
            onToggle={() => mealType.toggle(item)}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Step 3: Alternative Options ─── */

function StepThree({
  navigate,
  buildParams,
}: {
  navigate: ReturnType<typeof useNavigate>;
  buildParams: () => URLSearchParams;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-xl font-extrabold tracking-tight">Or choose another option</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Not sure? Let us help you decide.
        </p>
      </div>

      {/* Show My Meals CTA */}
      <Button
        className="w-full h-14 text-base font-bold rounded-2xl shadow-lg shadow-primary/20"
        onClick={() => {
          const params = buildParams();
          navigate(`/client/meal-results?${params.toString()}`);
        }}
      >
        <UtensilsCrossed className="h-5 w-5 mr-2" />
        Show My Meals
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">or try these</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <QuickActionCard
          icon={<Brain className="h-6 w-6 text-primary" />}
          title="Can't Decide"
          description="AI suggests the best meal for you"
          onClick={() => {
            const params = buildParams();
            params.set("auto_mode", "true");
            navigate(`/client/meal-results?${params.toString()}`);
          }}
        />
        <QuickActionCard
          icon={<Barcode className="h-6 w-6 text-primary" />}
          title="Scan Food"
          description="Barcode scanner for instant tracking"
          onClick={() => navigate("/client/log-meal?tab=scan")}
        />
        <QuickActionCard
          icon={<Camera className="h-6 w-6 text-primary" />}
          title="Snap Photo"
          description="Photo → AI macro detection"
          onClick={() => navigate("/client/log-meal?tab=photo")}
        />
        <QuickActionCard
          icon={<Keyboard className="h-6 w-6 text-primary" />}
          title="Type Meal"
          description="Manual entry for full control"
          onClick={() => navigate("/client/log-meal?tab=manual")}
        />
      </div>
    </div>
  );
}

/* ─── Shared Components ─── */

function SelectableCard({
  label,
  emoji,
  subtitle,
  selected,
  onToggle,
}: {
  label: string;
  emoji: string;
  subtitle: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
        selected
          ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
          : "border-border bg-card hover:border-muted-foreground/30"
      }`}
    >
      <span className="text-2xl">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          selected ? "border-primary bg-primary" : "border-muted-foreground/30"
        }`}
      >
        {selected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
      </div>
    </button>
  );
}

function QuickActionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2.5 rounded-2xl border bg-card p-4 text-left transition-all active:scale-[0.97] hover:border-primary/40 hover:shadow-md"
    >
      {icon}
      <span className="text-sm font-bold text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground leading-relaxed">{description}</span>
    </button>
  );
}
