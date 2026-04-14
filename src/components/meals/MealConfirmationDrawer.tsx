import { useState, useMemo } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Edit3, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateMacros } from "@/components/nutrition/macroValidator";
import { MacroValidationBanner } from "@/components/meals/MacroValidationBanner";

export interface PendingMeal {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  source?: string;
  confidence?: "high" | "medium" | "low";
  if_role?: string;
  meal_role?: string;
  macro_profile?: string;
  ingredients?: { name: string; amount?: string; calories: number; protein: number; carbs: number; fats: number }[];
}

interface MealConfirmationDrawerProps {
  meal: PendingMeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (meal: PendingMeal) => void;
  servingMultiplier?: number;
  isLogging?: boolean;
}

export function MealConfirmationDrawer({
  meal,
  open,
  onOpenChange,
  onConfirm,
  servingMultiplier: initialMultiplier = 1,
  isLogging = false,
}: MealConfirmationDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [serving, setServing] = useState(initialMultiplier);
  const [editValues, setEditValues] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });

  const scaled = meal ? {
    calories: Math.round(meal.calories * serving),
    protein: Math.round(meal.protein * serving * 10) / 10,
    carbs: Math.round(meal.carbs * serving * 10) / 10,
    fats: Math.round(meal.fats * serving * 10) / 10,
  } : { calories: 0, protein: 0, carbs: 0, fats: 0 };

  const displayMacros = isEditing ? editValues : scaled;

  const validation = useMemo(() => {
    if (!meal) return null;
    return validateMacros({
      calories: displayMacros.calories,
      protein: displayMacros.protein,
      fats: displayMacros.fats,
      carbs: displayMacros.carbs,
      confidence: meal.confidence,
      meal_role: meal.meal_role,
    });
  }, [meal, displayMacros.calories, displayMacros.protein, displayMacros.fats, displayMacros.carbs]);

  if (!meal) return null;

  const handleEdit = () => {
    setEditValues({ ...scaled });
    setIsEditing(true);
  };

  const handleConfirm = () => {
    onConfirm({
      ...meal,
      ...displayMacros,
    });
    setIsEditing(false);
    setServing(1);
  };

  const confidenceColor = meal.confidence === "high"
    ? "text-emerald-400"
    : meal.confidence === "low"
    ? "text-amber-400"
    : "text-blue-400";

  const roleLabels: Record<string, string> = {
    break_fast: "Break Fast",
    mid_window: "Mid Window",
    last_meal: "Last Meal",
    high_protein: "High Protein",
    control: "Control",
    performance: "Performance",
    heavy: "Heavy",
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="p-4 space-y-4 overflow-y-auto">
          <DrawerHeader className="p-0">
            <DrawerTitle className="text-lg font-bold">{meal.name}</DrawerTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {meal.source && (
                <Badge variant="secondary" className="text-[10px]">
                  {meal.source === "ai+usda" ? "AI + USDA Verified" : meal.source === "barcode" ? "Barcode" : "AI Estimated"}
                </Badge>
              )}
              {meal.confidence && (
                <span className={cn("text-[10px] font-medium", confidenceColor)}>
                  {meal.confidence === "high" ? "✓ High confidence" : meal.confidence === "low" ? "⚠ Low confidence — review" : "~ Moderate confidence"}
                </span>
              )}
            </div>
          </DrawerHeader>

          {/* Macro Validation Banner */}
          {validation && validation.validation_flags.length > 0 && (
            <MacroValidationBanner
              flags={validation.validation_flags}
              warnings={validation.warnings}
            />
          )}

          {/* Smart Tags */}
          {(meal.if_role || meal.meal_role || meal.macro_profile) && (
            <div className="flex gap-1.5 flex-wrap">
              {meal.if_role && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                  {roleLabels[meal.if_role] || meal.if_role}
                </Badge>
              )}
              {meal.meal_role && (
                <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">
                  {roleLabels[meal.meal_role] || meal.meal_role}
                </Badge>
              )}
              {meal.macro_profile && (
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                  {meal.macro_profile.replace("_", " ")}
                </Badge>
              )}
            </div>
          )}

          {/* Serving Adjuster */}
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Serving Size</Label>
            <div className="flex items-center gap-2 flex-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setServing(Math.max(0.5, serving - 0.5))}
                disabled={isEditing}
              >
                −
              </Button>
              <span className="text-sm font-bold w-10 text-center">{serving}×</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setServing(Math.min(5, serving + 0.5))}
                disabled={isEditing}
              >
                +
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={handleEdit} disabled={isEditing}>
              <Edit3 className="h-3 w-3" /> Edit
            </Button>
          </div>

          {/* Macro Grid */}
          <div className="grid grid-cols-4 gap-2 rounded-xl bg-muted/50 p-3">
            {(["calories", "protein", "carbs", "fats"] as const).map((key) => (
              <div key={key} className="text-center">
                {isEditing ? (
                  <Input
                    type="number"
                    value={editValues[key]}
                    onChange={(e) =>
                      setEditValues((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))
                    }
                    className="h-8 text-center text-sm font-bold p-1"
                  />
                ) : (
                  <p className="text-lg font-bold">
                    {key === "calories" ? `🔥 ${displayMacros[key]}` : `${displayMacros[key]}g`}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground capitalize">{key}</p>
              </div>
            ))}
          </div>

          {/* Ingredients breakdown */}
          {meal.ingredients && meal.ingredients.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Breakdown</p>
              {meal.ingredients.map((ing, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                  <span className="font-medium">{ing.name} {ing.amount && <span className="text-muted-foreground">({ing.amount})</span>}</span>
                  <span className="text-muted-foreground">{ing.calories} cal • {ing.protein}p • {ing.carbs}c • {ing.fats}f</span>
                </div>
              ))}
            </div>
          )}

          {/* Confirm Button */}
          <Button
            className="w-full h-12 text-base font-bold rounded-xl"
            onClick={handleConfirm}
            disabled={isLogging}
          >
            {isLogging ? (
              "Logging..."
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Confirm & Log Meal
              </>
            )}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
