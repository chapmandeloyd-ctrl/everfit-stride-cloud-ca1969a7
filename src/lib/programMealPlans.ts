/* Daily Meal Timeline data — ported from the legacy gold complete-plan
   page (ClientFastingPlanDetailPreview). Hardcoded sample meals keyed by
   keto-type abbreviation. Anchored at a 10:00 AM eating-window open;
   call shiftTimeString() against the live opens-at to place them on the
   user's actual schedule. Future iteration may swap this for AI/DB data. */

export type MealTone = "fast" | "meal" | "snack";

export interface Meal {
  window: string;
  label: string;
  tone: MealTone;
  text: string;
  cal?: number;
  fat?: number;
  carbs?: number;
  protein?: number;
}

export interface MealPlan {
  totals: { cal: number; fat: number; carbs: number; protein: number };
  meals: Meal[];
}

export const PROGRAM_BASELINE_OPENS = "10:00 AM";

const FAST_BLOCK: Meal = {
  window: "8:00 PM – 10:00 AM",
  label: "Fast",
  tone: "fast",
  text: "Water, black coffee, electrolytes. No cream, no sweeteners.",
};

export const MEAL_PLANS: Record<string, MealPlan> = {
  skd: {
    totals: { cal: 1820, fat: 142, carbs: 25, protein: 113 },
    meals: [
      FAST_BLOCK,
      { window: "10:00 AM", label: "Break-Fast", tone: "meal", text: "3 eggs scrambled in butter, ½ avocado, sea salt.", cal: 470, fat: 38, carbs: 7, protein: 22 },
      { window: "1:30 PM", label: "Lunch", tone: "meal", text: "5 oz grilled salmon, 2 cups spinach, 1 tbsp olive oil, lemon.", cal: 480, fat: 35, carbs: 4, protein: 35 },
      { window: "4:30 PM", label: "Snack", tone: "snack", text: "1 oz macadamia nuts.", cal: 200, fat: 21, carbs: 4, protein: 2 },
      { window: "7:30 PM", label: "Dinner", tone: "meal", text: "6 oz ribeye, 1 cup broccoli roasted in 1 tbsp ghee, 16 oz mineral water.", cal: 670, fat: 52, carbs: 6, protein: 54 },
    ],
  },
  hpkd: {
    totals: { cal: 1900, fat: 127, carbs: 24, protein: 165 },
    meals: [
      FAST_BLOCK,
      { window: "10:00 AM", label: "Break-Fast", tone: "meal", text: "4 eggs + 3 oz turkey sausage, ¼ avocado.", cal: 520, fat: 38, carbs: 4, protein: 40 },
      { window: "1:30 PM", label: "Lunch", tone: "meal", text: "7 oz chicken thigh, 2 cups arugula, 1 tbsp olive oil.", cal: 540, fat: 35, carbs: 3, protein: 50 },
      { window: "4:30 PM", label: "Snack", tone: "snack", text: "¾ cup full-fat Greek yogurt + 1 tbsp chia.", cal: 180, fat: 9, carbs: 8, protein: 16 },
      { window: "7:30 PM", label: "Dinner", tone: "meal", text: "8 oz ribeye, 1 cup broccoli in 1 tbsp ghee, 16 oz water.", cal: 760, fat: 58, carbs: 6, protein: 62 },
    ],
  },
  ckd: {
    totals: { cal: 1830, fat: 138, carbs: 28, protein: 118 },
    meals: [
      FAST_BLOCK,
      { window: "10:00 AM", label: "Break-Fast", tone: "meal", text: "3 eggs in butter, 2 strips bacon, ½ avocado.", cal: 510, fat: 42, carbs: 5, protein: 26 },
      { window: "1:30 PM", label: "Lunch", tone: "meal", text: "5 oz grass-fed beef patty, lettuce wrap, 1 tbsp mayo.", cal: 470, fat: 36, carbs: 3, protein: 32 },
      { window: "4:30 PM", label: "Snack", tone: "snack", text: "1 oz pecans + 4 olives.", cal: 210, fat: 22, carbs: 4, protein: 3 },
      { window: "7:30 PM", label: "Dinner", tone: "meal", text: "6 oz ribeye, 1 cup broccoli in 1 tbsp ghee, 16 oz water.", cal: 640, fat: 52, carbs: 6, protein: 50 },
    ],
  },
  tkd: {
    totals: { cal: 1880, fat: 132, carbs: 45, protein: 120 },
    meals: [
      FAST_BLOCK,
      { window: "10:00 AM", label: "Break-Fast", tone: "meal", text: "3 eggs, 2 oz smoked salmon, ¼ avocado.", cal: 460, fat: 33, carbs: 4, protein: 32 },
      { window: "1:30 PM", label: "Lunch", tone: "meal", text: "5 oz chicken breast, 2 cups mixed greens, 1 tbsp olive oil.", cal: 430, fat: 28, carbs: 5, protein: 38 },
      { window: "4:30 PM", label: "Pre-Workout", tone: "snack", text: "½ banana + 1 tbsp almond butter (targeted carbs).", cal: 200, fat: 9, carbs: 22, protein: 4 },
      { window: "7:30 PM", label: "Dinner", tone: "meal", text: "6 oz ribeye, 1 cup broccoli in 1 tbsp ghee, 16 oz water.", cal: 670, fat: 52, carbs: 6, protein: 54 },
    ],
  },
  lazy: {
    totals: { cal: 1750, fat: 130, carbs: 19, protein: 115 },
    meals: [
      FAST_BLOCK,
      { window: "10:00 AM", label: "Break-Fast", tone: "meal", text: "3 eggs cooked in butter, ¼ avocado.", cal: 410, fat: 33, carbs: 4, protein: 22 },
      { window: "1:30 PM", label: "Lunch", tone: "meal", text: "5 oz rotisserie chicken, 1 cup spinach, ranch dressing.", cal: 470, fat: 34, carbs: 3, protein: 35 },
      { window: "4:30 PM", label: "Snack", tone: "snack", text: "1 oz cheddar + 1 oz almonds.", cal: 280, fat: 23, carbs: 6, protein: 12 },
      { window: "7:30 PM", label: "Dinner", tone: "meal", text: "6 oz ribeye, 1 cup broccoli in 1 tbsp ghee, 16 oz water.", cal: 590, fat: 40, carbs: 6, protein: 46 },
    ],
  },
  dirty: {
    totals: { cal: 1900, fat: 145, carbs: 22, protein: 115 },
    meals: [
      FAST_BLOCK,
      { window: "10:00 AM", label: "Break-Fast", tone: "meal", text: "Bunless fast-food sausage & egg patty, side of bacon.", cal: 520, fat: 42, carbs: 4, protein: 28 },
      { window: "1:30 PM", label: "Lunch", tone: "meal", text: "Bunless double cheeseburger, no ketchup, side of pickles.", cal: 540, fat: 42, carbs: 6, protein: 35 },
      { window: "4:30 PM", label: "Snack", tone: "snack", text: "Pork rinds + 2 string cheese.", cal: 250, fat: 19, carbs: 2, protein: 18 },
      { window: "7:30 PM", label: "Dinner", tone: "meal", text: "6 oz ribeye, 1 cup broccoli in 1 tbsp ghee, 16 oz water.", cal: 590, fat: 42, carbs: 6, protein: 50 },
    ],
  },
};

/** Resolve any keto-type abbreviation/id to a known meal-plan key. */
export function resolveMealPlanKey(abbreviationOrId: string | null | undefined): string {
  if (!abbreviationOrId) return "skd";
  const k = abbreviationOrId.toLowerCase();
  return k in MEAL_PLANS ? k : "skd";
}