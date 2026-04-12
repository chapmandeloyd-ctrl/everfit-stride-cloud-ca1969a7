import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UtensilsCrossed, Brain, ScanBarcode, Camera, Keyboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";

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
  return { selected, toggle };
}

export default function ClientMealSelect() {
  const navigate = useNavigate();
  const mealType = useMultiSelect(MEAL_TYPES);
  const mealGoal = useMultiSelect(MEAL_GOALS);
  const prepStyle = useMultiSelect(PREP_STYLES);
  const [hunger, setHunger] = useState<string | null>(null);

  const hasSelection = mealType.selected.size > 0 || mealGoal.selected.size > 0 || hunger || prepStyle.selected.size > 0;

  return (
    <ClientLayout>
      <div className="pb-28 w-full">
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-5 space-y-2 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">Welcome to KSOM360 Meals</h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Select what you're in the mood for — we'll show meals that match your plan.
          </p>
        </div>

        <div className="px-5 space-y-6">
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

          {/* Alternative Options */}
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Not Sure What You Want?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can follow your plan — or track your own meal.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pb-4">
            <QuickActionCard
              emoji="🧠"
              title="Can't Decide"
              description="Let KSOM360 pick the best meals for you."
              onClick={() => {
                // Auto-filter: select break-my-fast + high-protein goals
                if (!mealGoal.selected.has("Break My Fast")) mealGoal.toggle("Break My Fast");
                if (!mealGoal.selected.has("High Protein")) mealGoal.toggle("High Protein");
                navigate("/client/meal-plan");
              }}
            />
            <QuickActionCard
              emoji="📦"
              title="Scan Your Food"
              description="Scan a barcode to instantly track your food."
              onClick={() => navigate("/client/log-meal?tab=scan")}
            />
            <QuickActionCard
              emoji="📸"
              title="Snap Your Meal"
              description="Take a photo and let AI estimate your macros."
              onClick={() => navigate("/client/log-meal?tab=photo")}
            />
            <QuickActionCard
              emoji="⌨️"
              title="Type Your Meal"
              description="Enter your meal manually for full macro breakdown."
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
            // TODO: pass filters to meal results page
            navigate("/client/meal-plan");
          }}
        >
          Show My Meals
        </Button>
      </div>
    </ClientLayout>
  );
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

function CheckboxChip({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex items-center gap-2.5 rounded-xl border px-4 py-3.5 text-sm font-medium transition-all active:scale-[0.97] ${
        checked
          ? "border-primary bg-primary/10 text-foreground"
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
      className="flex flex-col items-start gap-2 rounded-2xl border bg-card p-4 text-left transition-all active:scale-[0.97] hover:border-primary/40 hover:shadow-md"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-sm font-bold text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground leading-relaxed">{description}</span>
    </button>
  );
}
