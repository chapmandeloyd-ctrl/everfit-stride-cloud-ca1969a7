import type { ExtractedRecipe } from "./AIRecipeBuilderDialog";

const DAIRY_KEYWORDS = ["milk", "cheese", "cream", "butter", "yogurt", "whey", "casein", "ghee"];
const GLUTEN_KEYWORDS = ["wheat", "flour", "bread", "pasta", "barley", "rye", "couscous"];
const NUT_KEYWORDS = ["almond", "walnut", "pecan", "cashew", "peanut", "pistachio", "hazelnut", "macadamia"];

function extractSection(text: string, label: string): string | null {
  // Match "LABEL:" or "LABEL:\n" followed by content until the next label or end
  const regex = new RegExp(`(?:^|\\n)\\s*${label}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*[A-Z_]{2,}\\s*:|$)`, "i");
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function extractBulletList(text: string, label: string): string[] {
  const section = extractSection(text, label);
  if (!section) return [];
  return section
    .split(/\n/)
    .map((line) => line.replace(/^[\\s*•\\-–—]+/, "").trim())
    .filter(Boolean);
}

function parseNumber(text: string | null): number {
  if (!text) return 0;
  const match = text.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function normalizeLower(val: string): string {
  return val.toLowerCase().replace(/\s+/g, "_").trim();
}

const CATEGORY_MAP: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  soup: "Soup",
  "salad/bowl": "Salad/Bowl",
  salad: "Salad/Bowl",
  bowl: "Salad/Bowl",
  others: "Others",
};

const IF_ROLE_MAP: Record<string, string> = {
  break_fast: "break_fast",
  breakfast: "break_fast",
  mid_window: "mid_window",
  last_meal: "last_meal",
};

const KETO_VALID = new Set(["SKD", "TKD", "HPKD", "CKD"]);

export function parseStructuredRecipeText(text: string): ExtractedRecipe | null {
  // Quick check: does it look like structured recipe text?
  const hasLabels = /(?:NAME|CALORIES|MACROS|IF_ROLES|KETO_TYPES|INGREDIENTS|INSTRUCTIONS)\s*:/i.test(text);
  if (!hasLabels) return null;

  const name = extractSection(text, "NAME") || "Untitled Recipe";
  const description = extractSection(text, "DESCRIPTION") || "";
  const instructionsRaw = extractSection(text, "INSTRUCTIONS") || "";
  const ingredientsRaw = extractBulletList(text, "INGREDIENTS").join("\n");

  // Macros - try dedicated fields first, then MACROS_PER_SERVING block
  let calories = parseNumber(extractSection(text, "CALORIES_PER_SERVING") || extractSection(text, "CALORIES"));
  let protein = 0, carbs = 0, fats = 0;

  const macrosBlock = extractSection(text, "MACROS_PER_SERVING") || extractSection(text, "MACROS");
  if (macrosBlock) {
    const pMatch = macrosBlock.match(/protein\s*:\s*([\d.]+)/i);
    const cMatch = macrosBlock.match(/(?:carbs?|net\s*carbs?)\s*:\s*([\d.]+)/i);
    const fMatch = macrosBlock.match(/(?:fat|fats?)\s*:\s*([\d.]+)/i);
    if (pMatch) protein = parseFloat(pMatch[1]);
    if (cMatch) carbs = parseFloat(cMatch[1]);
    if (fMatch) fats = parseFloat(fMatch[1]);
  }
  // Fallback to individual fields
  if (!protein) protein = parseNumber(extractSection(text, "PROTEIN"));
  if (!carbs) carbs = parseNumber(extractSection(text, "CARBS"));
  if (!fats) fats = parseNumber(extractSection(text, "FATS"));

  // IF Roles
  const ifRolesRaw = extractBulletList(text, "IF_ROLES");
  const ifRoles = ifRolesRaw
    .map((r) => IF_ROLE_MAP[normalizeLower(r)] || normalizeLower(r))
    .filter(Boolean);

  // Meal Role & Subtype
  const mealRole = extractSection(text, "MEAL_ROLE") || "";
  const subtype = extractSection(text, "SUBTYPE") || "";

  // Keto Types
  const ketoRaw = extractBulletList(text, "KETO_TYPES");
  const ketoTypes = ketoRaw.map((k) => k.toUpperCase().trim()).filter(Boolean);
  // Keep unrecognized ones too (failsafe)

  // Trigger Conditions
  const triggerConditions = extractBulletList(text, "TRIGGER_CONDITIONS").map((tc) => normalizeLower(tc));

  // Coaching notes
  const carbLimitNote = extractSection(text, "CARB_LIMIT_NOTE") || "";
  const proteinTargetNote = extractSection(text, "PROTEIN_TARGET_NOTE") || "";
  const whyItWorks = extractSection(text, "WHY_IT_WORKS") || "";
  const bestFor = extractBulletList(text, "BEST_FOR");
  const avoidIf = extractBulletList(text, "AVOID_IF");
  const mealTiming = extractSection(text, "MEAL_TIMING") || "";

  // Dish type
  const dishTypeRaw = extractSection(text, "DISH_TYPE") || "";
  let dishType = "Main dish";
  if (/side/i.test(dishTypeRaw)) dishType = "Side dish";

  // Category
  const categoryRaw = extractBulletList(text, "CATEGORY");
  const category = categoryRaw
    .map((c) => CATEGORY_MAP[normalizeLower(c)] || null)
    .filter(Boolean) as string[];

  // Prep / Cook / Servings
  const prepTime = parseNumber(extractSection(text, "PREP_TIME_MINUTES") || extractSection(text, "PREP_TIME"));
  const cookTime = parseNumber(extractSection(text, "COOK_TIME_MINUTES") || extractSection(text, "COOK_TIME"));
  const servings = parseNumber(extractSection(text, "SERVINGS")) || 1;

  // Auto-detect dietary info from macros + ingredients
  const dietaryInfo: string[] = [];
  const ingredientsLower = ingredientsRaw.toLowerCase();

  if (protein >= 30) dietaryInfo.push("High Protein");
  if (carbs <= 10) dietaryInfo.push("Low Carb");
  if (carbs <= 20) dietaryInfo.push("Keto Diet");
  if (!DAIRY_KEYWORDS.some((d) => ingredientsLower.includes(d))) dietaryInfo.push("Dairy-Free");
  if (!GLUTEN_KEYWORDS.some((g) => ingredientsLower.includes(g))) dietaryInfo.push("Gluten-Free");
  if (!NUT_KEYWORDS.some((n) => ingredientsLower.includes(n))) dietaryInfo.push("Nut-Free");

  // Also parse explicit DIETARY_INFORMATION section
  const explicitDietary = extractBulletList(text, "DIETARY_INFORMATION");
  explicitDietary.forEach((d) => {
    if (!dietaryInfo.includes(d)) dietaryInfo.push(d);
  });

  return {
    name,
    description,
    instructions: instructionsRaw,
    ingredients: ingredientsRaw,
    calories,
    protein,
    carbs,
    fats,
    prep_time_minutes: prepTime || undefined,
    cook_time_minutes: cookTime || undefined,
    servings,
    dish_type: dishType,
    category,
    dietary_info: dietaryInfo,
    if_roles: ifRoles,
    meal_role: mealRole,
    subtype,
    keto_types: ketoTypes,
    trigger_conditions: triggerConditions,
    carb_limit_note: carbLimitNote,
    protein_target_note: proteinTargetNote,
    why_it_works: whyItWorks,
    best_for: bestFor,
    avoid_if: avoidIf,
    meal_timing: mealTiming,
    tags: [...ketoTypes.filter((k) => KETO_VALID.has(k)), ...ifRoles],
  };
}
