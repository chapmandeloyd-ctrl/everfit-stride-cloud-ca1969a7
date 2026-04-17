import { useState, useMemo, useEffect } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  Minus,
  Plus,
  X,
  Check,
  AlertTriangle,
  Bot,
  User as UserIcon,
  UtensilsCrossed,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

// ─────────────────────────── Constants ───────────────────────────

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary", desc: "Little or no exercise", multiplier: 1.2 },
  { value: "light", label: "Lightly active", desc: "Exercise 1–3 days/week", multiplier: 1.375 },
  { value: "moderate", label: "Moderately active", desc: "Exercise 3–5 days/week", multiplier: 1.55 },
  { value: "active", label: "Very active", desc: "Intense exercise 6–7 days/week", multiplier: 1.725 },
  { value: "extreme", label: "Extremely active", desc: "2+ hrs intense activity daily", multiplier: 1.9 },
];

const GOALS = [
  { value: "lose", label: "Lose weight", icon: "⬇️", factor: 0.85 },
  { value: "recomp", label: "Build muscle & lose fat", icon: "💪", factor: 0.95 },
  { value: "maintain", label: "Maintain weight", icon: "⚖️", factor: 1.0 },
  { value: "gain", label: "Gain weight & build muscle", icon: "⬆️", factor: 1.10 },
];

type DietStyle = {
  value: string;
  label: string;
  badge: string;
  badgeColor: string; // tailwind class for badge bg/text
  letter: string;
  letterBg: string;
  letterText: string;
  desc: string;
  splitText: string;
  splitColor: string;
  fatPct: number;
  proteinPct: number;
  carbsPct: number;
};

const DIET_STYLES: DietStyle[] = [
  {
    value: "standard",
    label: "Standard",
    badge: "Balanced macros",
    badgeColor: "bg-blue-100 text-blue-700",
    letter: "B",
    letterBg: "bg-blue-100",
    letterText: "text-blue-700",
    desc: "Goal-based protein / carb / fat split",
    splitText: "P 30–35% · C 30–45% · F 25–35%",
    splitColor: "text-blue-600",
    fatPct: 0.30, proteinPct: 0.30, carbsPct: 0.40,
  },
  {
    value: "standard_keto",
    label: "Standard Keto (SKD)",
    badge: "Most popular keto",
    badgeColor: "bg-orange-100 text-orange-700",
    letter: "K",
    letterBg: "bg-orange-100",
    letterText: "text-orange-700",
    desc: "High-fat, very-low-carb — great for sustained fat loss and ketosis",
    splitText: "F 70% · P 25% · C 5%",
    splitColor: "text-orange-600",
    fatPct: 0.70, proteinPct: 0.25, carbsPct: 0.05,
  },
  {
    value: "targeted_keto",
    label: "Targeted Keto (TKD)",
    badge: "For active people",
    badgeColor: "bg-green-100 text-green-700",
    letter: "K",
    letterBg: "bg-green-100",
    letterText: "text-green-700",
    desc: "Extra carbs timed around workouts for quick energy without leaving ketosis",
    splitText: "F 65% · P 25% · C 10%",
    splitColor: "text-green-600",
    fatPct: 0.65, proteinPct: 0.25, carbsPct: 0.10,
  },
  {
    value: "cyclical_keto",
    label: "Cyclical Keto (CKD)",
    badge: "For bodybuilders",
    badgeColor: "bg-purple-100 text-purple-700",
    letter: "K",
    letterBg: "bg-purple-100",
    letterText: "text-purple-700",
    desc: "5–6 days strict keto then 1–2 days higher-carb refeeds for muscle building",
    splitText: "F 60% · P 25% · C 15% (avg)",
    splitColor: "text-purple-600",
    fatPct: 0.60, proteinPct: 0.25, carbsPct: 0.15,
  },
  {
    value: "high_protein_keto",
    label: "High-Protein Keto",
    badge: "Muscle-first keto",
    badgeColor: "bg-red-100 text-red-700",
    letter: "K",
    letterBg: "bg-red-100",
    letterText: "text-red-700",
    desc: "More protein than traditional keto — great for building muscle while in ketosis",
    splitText: "F 60% · P 35% · C 5%",
    splitColor: "text-red-600",
    fatPct: 0.60, proteinPct: 0.35, carbsPct: 0.05,
  },
];

// 8 wizard steps + adjustment + results + manual
type WizardStep =
  | "gender"
  | "age"
  | "weight"
  | "height"
  | "bodyfat"
  | "activity"
  | "goal"
  | "diet";

type Screen = WizardStep | "adjustment" | "results" | "manual";

const WIZARD_STEPS: WizardStep[] = [
  "gender",
  "age",
  "weight",
  "height",
  "bodyfat",
  "activity",
  "goal",
  "diet",
];

// ─────────────────────────── Component ───────────────────────────

export default function ClientMacroSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const clientId = useEffectiveClientId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [screen, setScreen] = useState<Screen>("gender");

  // Wizard state
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [age, setAge] = useState<number>(0);
  const [weightLbs, setWeightLbs] = useState<number>(0);
  const [heightFt, setHeightFt] = useState<number>(0);
  const [heightIn, setHeightIn] = useState<number>(0);
  const [bodyFat, setBodyFat] = useState<number | null>(null);
  const [activityLevel, setActivityLevel] = useState<string>("");
  const [goal, setGoal] = useState<string>("");
  const [dietStyle, setDietStyle] = useState<string>("");

  // Calculation state
  const [baseTdee, setBaseTdee] = useState<number>(0);
  const [adjustment, setAdjustment] = useState<number>(0); // -0.80 .. +0.30
  const [calcResults, setCalcResults] = useState<{
    calories: number; protein: number; carbs: number; fats: number;
  } | null>(null);
  const [manualOverride, setManualOverride] = useState<boolean>(false);

  // Manual mode state
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFats, setManualFats] = useState("");

  // Existing targets
  const { data: existingTargets } = useQuery({
    queryKey: ["client-macro-targets", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_macro_targets")
        .select("*")
        .eq("client_id", clientId!)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // ──────── Helpers ────────

  const stepIndex = WIZARD_STEPS.indexOf(screen as WizardStep);
  const isWizard = stepIndex >= 0;

  const computeTdee = () => {
    const w = weightLbs * 0.453592;
    const h = (heightFt * 12 + heightIn) * 2.54;
    let bmr = gender === "male"
      ? 10 * w + 6.25 * h - 5 * age + 5
      : 10 * w + 6.25 * h - 5 * age - 161;
    const mult = ACTIVITY_LEVELS.find(l => l.value === activityLevel)?.multiplier || 1.55;
    return Math.round(bmr * mult);
  };

  const goToAdjustment = () => {
    const tdee = computeTdee();
    const goalFactor = GOALS.find(g => g.value === goal)?.factor || 1.0;
    const defaultAdj = goalFactor - 1; // -0.15 / 0 / +0.10 etc.
    setBaseTdee(tdee);
    setAdjustment(defaultAdj);
    setManualOverride(false);
    setScreen("adjustment");
  };

  const goToResults = () => {
    const diet = DIET_STYLES.find(d => d.value === dietStyle) || DIET_STYLES[0];
    const calories = Math.round(baseTdee * (1 + adjustment));
    const protein = Math.round((calories * diet.proteinPct) / 4);
    const fats = Math.round((calories * diet.fatPct) / 9);
    const carbs = Math.round((calories * diet.carbsPct) / 4);
    setCalcResults({ calories, protein, carbs, fats });
    setScreen("results");
  };

  // Recompute macros on slider/diet change while on results
  useEffect(() => {
    if (screen !== "results" || !baseTdee || manualOverride) return;
    const diet = DIET_STYLES.find(d => d.value === dietStyle) || DIET_STYLES[0];
    const calories = Math.round(baseTdee * (1 + adjustment));
    const protein = Math.round((calories * diet.proteinPct) / 4);
    const fats = Math.round((calories * diet.fatPct) / 9);
    const carbs = Math.round((calories * diet.carbsPct) / 4);
    setCalcResults({ calories, protein, carbs, fats });
  }, [adjustment, baseTdee, dietStyle, screen, manualOverride]);

  const adjustmentLabel = useMemo(() => {
    const pct = Math.round(adjustment * 100);
    if (pct <= -75) return { name: "Maximum Cut", sub: `${Math.abs(pct)}% below maintenance`, color: "text-destructive" };
    if (pct <= -65) return { name: "Extreme Deficit", sub: `${Math.abs(pct)}% below maintenance`, color: "text-destructive" };
    if (pct <= -45) return { name: "Aggressive Cut", sub: `${Math.abs(pct)}% below maintenance`, color: "text-orange-600" };
    if (pct <= -25) return { name: "Heavy Cut", sub: `${Math.abs(pct)}% below maintenance`, color: "text-orange-500" };
    if (pct <= -10) return { name: "Moderate Cut", sub: `${Math.abs(pct)}% below maintenance`, color: "text-green-600" };
    if (pct < 0) return { name: "Light Cut", sub: `${Math.abs(pct)}% below maintenance`, color: "text-green-500" };
    if (pct === 0) return { name: "Maintain", sub: "At maintenance", color: "text-foreground" };
    if (pct <= 10) return { name: "Lean Bulk", sub: `${pct}% above maintenance`, color: "text-blue-500" };
    if (pct <= 20) return { name: "Surplus", sub: `${pct}% above maintenance`, color: "text-blue-600" };
    return { name: "Aggressive Bulk", sub: `${pct}% above maintenance`, color: "text-purple-600" };
  }, [adjustment]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (macros: { calories: number; protein: number; carbs: number; fats: number }) => {
      const isImpersonating = clientId !== user?.id;
      const payload = {
        client_id: clientId!,
        tracking_option: "all_macros" as const,
        target_calories: macros.calories,
        target_protein: macros.protein,
        target_carbs: macros.carbs,
        target_fats: macros.fats,
        is_active: true,
        diet_style: dietStyle || "custom",
        ...(isImpersonating ? { trainer_id: user?.id } : {}),
      };
      if (existingTargets) {
        const { error } = await supabase
          .from("client_macro_targets")
          .update(payload)
          .eq("id", existingTargets.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_macro_targets")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-macro-targets"] });
      toast({ title: "Macro goals saved!" });
      navigate("/client/dashboard");
    },
    onError: () => {
      toast({ title: "Error saving goals", variant: "destructive" });
    },
  });

  const handleSaveManual = () => {
    const c = parseInt(manualCalories);
    if (!c) {
      toast({ title: "Please enter at least calories", variant: "destructive" });
      return;
    }
    saveMutation.mutate({
      calories: c,
      protein: parseInt(manualProtein) || 0,
      carbs: parseInt(manualCarbs) || 0,
      fats: parseInt(manualFats) || 0,
    });
  };

  // Validity for Next button on each step
  const canAdvance = (s: WizardStep) => {
    switch (s) {
      case "gender": return gender !== "";
      case "age": return age >= 13 && age <= 100;
      case "weight": return weightLbs >= 60 && weightLbs <= 600;
      case "height": return heightFt >= 3 && heightFt <= 8;
      case "bodyfat": return true; // optional
      case "activity": return activityLevel !== "";
      case "goal": return goal !== "";
      case "diet": return dietStyle !== "";
    }
  };

  const handleNext = () => {
    if (!isWizard) return;
    if (!canAdvance(screen as WizardStep)) return;
    if (screen === "diet") {
      goToAdjustment();
      return;
    }
    setScreen(WIZARD_STEPS[stepIndex + 1]);
  };

  const handleBack = () => {
    if (screen === "adjustment") {
      setScreen("diet");
      return;
    }
    if (screen === "results") {
      setScreen("adjustment");
      return;
    }
    if (stepIndex > 0) {
      setScreen(WIZARD_STEPS[stepIndex - 1]);
    } else {
      navigate("/client/dashboard");
    }
  };

  // ─────────────── Wizard chrome ───────────────

  const WizardHeader = ({ showBack = false }: { showBack?: boolean }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {showBack ? (
          <button onClick={handleBack} className="p-1 -ml-1">
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : (
          <button onClick={() => navigate("/client/dashboard")} className="p-1 -ml-1">
            <X className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={() => setScreen("manual")}
          className="text-sm font-semibold text-primary"
        >
          Set Manually
        </button>
      </div>
      <div className="flex gap-1">
        {WIZARD_STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= stepIndex ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );

  const NextBar = ({ label = "Next →", showBack = true, disabled = false, onClick }: {
    label?: string; showBack?: boolean; disabled?: boolean; onClick?: () => void;
  }) => (
    <div className="fixed left-0 right-0 px-4 z-50" style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 12px)' }}>
      <div className="max-w-lg mx-auto flex items-center gap-3">
        {showBack && (
          <button
            onClick={handleBack}
            className="w-12 h-12 rounded-full border border-border flex items-center justify-center bg-background"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <Button
          onClick={onClick || handleNext}
          disabled={disabled}
          className={cn(
            "flex-1 h-12 rounded-full text-base font-semibold gap-2",
            disabled && "opacity-50 bg-primary/40"
          )}
        >
          {label}
        </Button>
      </div>
    </div>
  );

  const FloatingBot = () => null;

  // ─────────────── Manual Mode ───────────────

  if (screen === "manual") {
    return (
      <ClientLayout>
        <div className="p-4 pb-32 space-y-6 max-w-lg mx-auto min-h-screen bg-background">
          <div className="flex items-center justify-between">
            <button onClick={() => setScreen("gender")} className="p-1 -ml-1">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className="text-base font-bold">Set Manually</h1>
            <div className="w-6" />
          </div>

          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
              <UtensilsCrossed className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Set Your Macros</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter your custom macro targets</p>
          </div>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Calories *</label>
                <Input type="number" value={manualCalories} onChange={e => setManualCalories(e.target.value)} placeholder="2000" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Protein (g)</label>
                <Input type="number" value={manualProtein} onChange={e => setManualProtein(e.target.value)} placeholder="150" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Carbs (g)</label>
                <Input type="number" value={manualCarbs} onChange={e => setManualCarbs(e.target.value)} placeholder="250" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Fat (g)</label>
                <Input type="number" value={manualFats} onChange={e => setManualFats(e.target.value)} placeholder="65" className="mt-1" />
              </div>
            </CardContent>
          </Card>

          <Button className="w-full h-12 rounded-xl text-base font-semibold" onClick={handleSaveManual} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Macro Goals"}
          </Button>
        </div>
      </ClientLayout>
    );
  }

  // ─────────────── Wizard Screens ───────────────

  if (isWizard) {
    return (
      <ClientLayout>
        <div className="p-4 pb-32 max-w-lg mx-auto min-h-screen bg-background">
          <WizardHeader showBack={stepIndex > 0} />

          {screen === "gender" && (
            <div className="mt-10 space-y-8">
              <div className="text-center space-y-3">
                <div className="inline-flex w-16 h-16 rounded-full bg-primary/10 items-center justify-center">
                  <UserIcon className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-3xl font-bold">Let's build your plan</h1>
                <p className="text-sm text-muted-foreground">We'll use this to calculate your metabolism accurately</p>
              </div>
              <div className="grid grid-cols-2 gap-4 px-2">
                <button
                  onClick={() => setGender("male")}
                  className={cn(
                    "aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all",
                    gender === "male" ? "border-primary bg-primary/5" : "border-border bg-card"
                  )}
                >
                  <span className="text-4xl text-muted-foreground">♂</span>
                  <span className="font-bold text-base">Male</span>
                </button>
                <button
                  onClick={() => setGender("female")}
                  className={cn(
                    "aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all",
                    gender === "female" ? "border-primary bg-primary/5" : "border-border bg-card"
                  )}
                >
                  <span className="text-4xl text-muted-foreground">♀</span>
                  <span className="font-bold text-base">Female</span>
                </button>
              </div>
            </div>
          )}

          {screen === "age" && (
            <div className="mt-8 space-y-12">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">How many trips around the sun?</h1>
                <p className="text-sm text-muted-foreground">Your metabolic rate is tied to your age</p>
              </div>
              <Stepper value={age} setValue={setAge} unit="yrs" min={13} max={100} />
            </div>
          )}

          {screen === "weight" && (
            <div className="mt-8 space-y-12">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">What's your weight?</h1>
                <p className="text-sm text-muted-foreground">We'll calculate your energy needs from this</p>
              </div>
              <Stepper value={weightLbs} setValue={setWeightLbs} unit="lb" min={60} max={600} step={1} />
            </div>
          )}

          {screen === "height" && (
            <div className="mt-8 space-y-12">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">How tall are you?</h1>
                <p className="text-sm text-muted-foreground">Height helps us dial in your baseline burn</p>
              </div>
              <div className="flex items-center justify-center gap-6">
                <Stepper value={heightFt} setValue={setHeightFt} unit="ft" min={3} max={8} compact />
                <Stepper value={heightIn} setValue={setHeightIn} unit="in" min={0} max={11} compact />
              </div>
            </div>
          )}

          {screen === "bodyfat" && (
            <div className="mt-8 space-y-12">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">Body fat %</h1>
                <p className="text-sm text-muted-foreground">Optional — improves accuracy if you know it</p>
              </div>
              <Stepper
                value={bodyFat ?? 0}
                setValue={(v) => setBodyFat(v)}
                unit="%"
                min={0}
                max={60}
                placeholder="Skip"
              />
              <div className="text-center">
                <button
                  onClick={() => { setBodyFat(null); handleNext(); }}
                  className="text-sm font-semibold text-muted-foreground underline"
                >
                  Skip this step
                </button>
              </div>
            </div>
          )}

          {screen === "activity" && (
            <div className="mt-8 space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">How active are you?</h1>
                <p className="text-sm text-muted-foreground">Choose what reflects your usual week</p>
              </div>
              <div className="space-y-2">
                {ACTIVITY_LEVELS.map(l => (
                  <button
                    key={l.value}
                    onClick={() => setActivityLevel(l.value)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border-2 transition-all",
                      activityLevel === l.value ? "border-primary bg-primary/5" : "border-border bg-card"
                    )}
                  >
                    <p className="font-bold text-sm">{l.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{l.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {screen === "goal" && (
            <div className="mt-8 space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">What's your goal?</h1>
                <p className="text-sm text-muted-foreground">We'll set a smart starting point</p>
              </div>
              <div className="space-y-2">
                {GOALS.map(g => (
                  <button
                    key={g.value}
                    onClick={() => setGoal(g.value)}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                      goal === g.value ? "border-primary bg-primary/5" : "border-border bg-card"
                    )}
                  >
                    <span className="text-2xl">{g.icon}</span>
                    <span className="font-bold text-sm flex-1 text-left">{g.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {screen === "diet" && (
            <div className="mt-6 space-y-5">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold">Pick your diet style</h1>
                <p className="text-sm text-muted-foreground px-4">
                  This sets your macro ratios — choose Standard or a keto variation
                </p>
              </div>
              <div className="space-y-3">
                {DIET_STYLES.map(d => {
                  const selected = dietStyle === d.value;
                  return (
                    <button
                      key={d.value}
                      onClick={() => setDietStyle(d.value)}
                      className={cn(
                        "relative w-full text-left p-4 rounded-2xl border-2 transition-all",
                        selected ? "border-primary bg-primary/5" : "border-border bg-card"
                      )}
                    >
                      {selected && (
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0", d.letterBg, d.letterText)}>
                          {d.letter}
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-base">{d.label}</p>
                            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", d.badgeColor)}>
                              {d.badge}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{d.desc}</p>
                          <p className={cn("text-xs font-semibold mt-1.5", d.splitColor)}>
                            {d.splitText}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <FloatingBot />
          <NextBar
            label={screen === "diet" ? "Calculate My Macro Goal" : "Next →"}
            disabled={!canAdvance(screen as WizardStep)}
          />
        </div>
      </ClientLayout>
    );
  }

  // ─────────────── Adjustment Screen ───────────────

  if (screen === "adjustment") {
    const sliderPct = Math.round(adjustment * 100); // -80..+30
    const sliderPos = ((sliderPct + 80) / 110) * 100;
    const calories = Math.round(baseTdee * (1 + adjustment));
    const isExtreme = sliderPct <= -70;
    const deficitPresets = [10, 20, 30, 40, 50, 60, 70, 80];
    const surplusPresets = [0, 5, 10, 15, 20, 30];

    return (
      <ClientLayout>
        <div className="p-4 pb-32 space-y-5 max-w-lg mx-auto min-h-screen bg-background">
          <div className="flex items-center justify-between">
            <button onClick={() => setScreen("diet")} className="p-1 -ml-1">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => setScreen("manual")}
              className="text-sm font-semibold text-primary"
            >
              Set Manually
            </button>
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold">Pick your calorie target</h1>
            <p className="text-xs text-muted-foreground">TDEE: {baseTdee.toLocaleString()} kcal/day</p>
          </div>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className={cn("font-bold text-lg", adjustmentLabel.color)}>
                    {adjustmentLabel.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{adjustmentLabel.sub}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">{calories.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">kcal / day</p>
                </div>
              </div>

              {/* Rainbow slider */}
              <div className="space-y-2 pt-2">
                <div
                  className="relative h-2 rounded-full"
                  style={{ background: "linear-gradient(to right, #ef4444, #f59e0b, #eab308, #22c55e, #3b82f6, #a855f7, #ec4899)" }}
                >
                  <input
                    type="range"
                    min={-80}
                    max={30}
                    step={5}
                    value={sliderPct}
                    onChange={e => setAdjustment(parseInt(e.target.value) / 100)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-blue-500 border-2 border-background shadow pointer-events-none"
                    style={{ left: `calc(${sliderPos}% - 10px)` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>-80% deficit</span>
                  <span>maintain</span>
                  <span>+30% surplus</span>
                </div>
              </div>

              {/* Deficit presets */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Deficit Presets
                </p>
                <div className="flex flex-wrap gap-2">
                  {deficitPresets.map(p => {
                    const active = sliderPct === -p;
                    const caution = p >= 70;
                    return (
                      <button
                        key={p}
                        onClick={() => setAdjustment(-p / 100)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1",
                          active && caution && "border-destructive bg-destructive/10 text-destructive",
                          active && !caution && "border-primary bg-primary/10 text-primary",
                          !active && caution && "border-destructive/40 text-destructive/80",
                          !active && !caution && "border-border text-muted-foreground hover:border-primary/50",
                        )}
                      >
                        {caution && <AlertTriangle className="h-3 w-3" />}
                        {p}%
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Surplus presets */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Maintain / Surplus
                </p>
                <div className="flex flex-wrap gap-2">
                  {surplusPresets.map(p => {
                    const active = sliderPct === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setAdjustment(p / 100)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                          active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {p === 0 ? "Maintain" : `+${p}%`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Caution banner for 70%+ */}
              {isExtreme && (
                <div className="border-l-4 border-destructive bg-destructive/10 rounded-r-lg p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="text-xs text-destructive">
                    <p className="font-bold mb-0.5">
                      Be advised: {sliderPct === -80 ? "Maximum cut zone" : "Extreme deficit"}
                    </p>
                    <p className="opacity-90">
                      Cuts above 70% are aggressive and can impact energy, recovery, and muscle retention.
                      Use only short-term (≤2 weeks) and check in with your coach.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <FloatingBot />
          <NextBar label="Save & See Results" onClick={goToResults} />
        </div>
      </ClientLayout>
    );
  }

  // ─────────────── Results Screen ───────────────

  if (screen === "results" && calcResults) {
    const totalMacroCalories = calcResults.protein * 4 + calcResults.carbs * 4 + calcResults.fats * 9;
    const proteinPct = totalMacroCalories > 0 ? Math.round((calcResults.protein * 4 / totalMacroCalories) * 100) : 0;
    const carbsPct = totalMacroCalories > 0 ? Math.round((calcResults.carbs * 4 / totalMacroCalories) * 100) : 0;
    const fatsPct = totalMacroCalories > 0 ? Math.round((calcResults.fats * 9 / totalMacroCalories) * 100) : 0;

    const chartData = [
      { name: "Protein", value: calcResults.protein * 4, color: "hsl(217, 91%, 60%)" },
      { name: "Carbs", value: calcResults.carbs * 4, color: "hsl(142, 71%, 45%)" },
      { name: "Fat", value: calcResults.fats * 9, color: "hsl(38, 92%, 50%)" },
    ];

    const updateMacro = (field: "calories" | "protein" | "carbs" | "fats", value: string) => {
      const n = parseInt(value) || 0;
      setManualOverride(true);
      setCalcResults(prev => prev ? { ...prev, [field]: n } : prev);
    };

    return (
      <ClientLayout>
        <div className="p-4 pb-8 space-y-5 max-w-lg mx-auto min-h-screen bg-background">
          <div className="flex items-center justify-between">
            <button onClick={() => setScreen("adjustment")} className="p-1 -ml-1">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => setScreen("adjustment")}
              className="text-sm font-semibold text-primary"
            >
              Recalculate
            </button>
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold">Your Macro Goals</h1>
            <p className="text-xs text-muted-foreground">TDEE: {baseTdee.toLocaleString()} kcal/day</p>
          </div>

          {/* Donut chart */}
          <div className="flex flex-col items-center pt-2">
            <div className="relative w-56 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={105}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-foreground">{calcResults.calories.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">calories</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Tap any value to fine-tune</p>
          </div>

          {/* Editable macro list */}
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              <MacroRow
                color="hsl(0, 84%, 60%)"
                label="Calories"
                value={calcResults.calories}
                onChange={v => updateMacro("calories", v)}
                unit="kcal"
              />
              <MacroRow
                color="hsl(217, 91%, 60%)"
                label="Protein"
                pct={proteinPct}
                value={calcResults.protein}
                onChange={v => updateMacro("protein", v)}
                unit="g"
              />
              <MacroRow
                color="hsl(142, 71%, 45%)"
                label="Carbs"
                pct={carbsPct}
                value={calcResults.carbs}
                onChange={v => updateMacro("carbs", v)}
                unit="g"
              />
              <MacroRow
                color="hsl(38, 92%, 50%)"
                label="Fat"
                pct={fatsPct}
                value={calcResults.fats}
                onChange={v => updateMacro("fats", v)}
                unit="g"
              />
            </CardContent>
          </Card>

          <Button
            className="w-full h-12 rounded-xl text-base font-semibold"
            onClick={() => saveMutation.mutate(calcResults)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving..." : "Save Goals"}
          </Button>
        </div>
      </ClientLayout>
    );
  }

  return null;
}

// ─────────────────────────── Subcomponents ───────────────────────────

function Stepper({
  value, setValue, unit, min, max, step = 1, compact = false, placeholder,
}: {
  value: number;
  setValue: (n: number) => void;
  unit: string;
  min: number;
  max: number;
  step?: number;
  compact?: boolean;
  placeholder?: string;
}) {
  const dec = () => setValue(Math.max(0, value - step));
  const inc = () => setValue(Math.min(max, (value || 0) + step));
  const isEmpty = value === 0;

  return (
    <div className="flex items-center justify-center gap-3 w-full">
      <button
        onClick={dec}
        className="w-12 h-12 shrink-0 rounded-full border border-border flex items-center justify-center bg-background"
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className={cn("flex items-baseline gap-2 justify-center", compact ? "min-w-[90px]" : "min-w-[140px]")}>
        <input
          type="number"
          inputMode="numeric"
          value={isEmpty ? "" : value}
          placeholder="0"
          onChange={e => {
            const raw = e.target.value;
            if (raw === "") { setValue(0); return; }
            const n = parseInt(raw);
            if (!isNaN(n)) setValue(Math.min(max, Math.max(0, n)));
          }}
          className={cn(
            "bg-transparent border-0 outline-none text-center font-bold tabular-nums placeholder:text-muted-foreground/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            compact ? "text-4xl w-20" : "text-5xl w-32"
          )}
        />
        <span className="text-lg text-muted-foreground shrink-0">{unit}</span>
      </div>
      <button
        onClick={inc}
        className="w-12 h-12 shrink-0 rounded-full border border-border flex items-center justify-center bg-background"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function MacroRow({
  color, label, pct, value, onChange, unit,
}: {
  color: string;
  label: string;
  pct?: number;
  value: number;
  onChange: (v: string) => void;
  unit: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-bold text-sm">{label}</span>
        {pct !== undefined && <span className="text-xs text-muted-foreground">{pct}%</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-20 h-9 text-right text-sm font-semibold"
        />
        <span className="text-xs text-muted-foreground w-8">{unit}</span>
      </div>
    </div>
  );
}
