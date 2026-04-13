import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface IngredientEntry {
  name: string;
  amount: string | null;
  unit: string | null;
  meal_name: string;
}

const CATEGORY_MAP: Record<string, string> = {
  // Proteins
  chicken: "Protein", beef: "Protein", steak: "Protein", salmon: "Protein",
  shrimp: "Protein", turkey: "Protein", pork: "Protein", bacon: "Protein",
  sausage: "Protein", egg: "Protein", eggs: "Protein", tuna: "Protein",
  fish: "Protein", lamb: "Protein", whey: "Protein", protein: "Protein",
  tofu: "Protein", tempeh: "Protein", venison: "Protein", bison: "Protein",
  // Fats
  butter: "Fats", "olive oil": "Fats", "coconut oil": "Fats",
  avocado: "Fats", "cream cheese": "Fats", "heavy cream": "Fats",
  "sour cream": "Fats", ghee: "Fats", lard: "Fats", mayo: "Fats",
  mayonnaise: "Fats", "mct oil": "Fats", "avocado oil": "Fats",
  cheese: "Fats", mozzarella: "Fats", cheddar: "Fats", parmesan: "Fats",
  // Vegetables
  spinach: "Vegetables", broccoli: "Vegetables", asparagus: "Vegetables",
  kale: "Vegetables", lettuce: "Vegetables", tomato: "Vegetables",
  tomatoes: "Vegetables", onion: "Vegetables", garlic: "Vegetables",
  pepper: "Vegetables", peppers: "Vegetables", mushroom: "Vegetables",
  mushrooms: "Vegetables", zucchini: "Vegetables", cauliflower: "Vegetables",
  cabbage: "Vegetables", celery: "Vegetables", cucumber: "Vegetables",
  "green beans": "Vegetables", "bell pepper": "Vegetables",
  jalapeño: "Vegetables", cilantro: "Vegetables", basil: "Vegetables",
  arugula: "Vegetables", carrot: "Vegetables", carrots: "Vegetables",
  // Dairy
  milk: "Dairy", cream: "Dairy", yogurt: "Dairy", "greek yogurt": "Dairy",
  // Pantry
  "almond flour": "Pantry", "coconut flour": "Pantry",
  "baking powder": "Pantry", "baking soda": "Pantry",
};

function categorize(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return cat;
  }
  // Seasonings / sauces
  if (
    lower.includes("salt") || lower.includes("pepper") ||
    lower.includes("spice") || lower.includes("seasoning") ||
    lower.includes("sauce") || lower.includes("vinegar") ||
    lower.includes("mustard") || lower.includes("dressing")
  ) return "Seasonings";

  return "Other";
}

function mergeKey(name: string, unit: string | null): string {
  return `${name.toLowerCase().trim()}|${(unit || "").toLowerCase().trim()}`;
}

function tryParseAmount(amt: string | null): number | null {
  if (!amt) return null;
  const cleaned = amt.replace(/[^\d./]/g, "");
  if (cleaned.includes("/")) {
    const [n, d] = cleaned.split("/");
    return d ? parseFloat(n) / parseFloat(d) : null;
  }
  const v = parseFloat(cleaned);
  return isNaN(v) ? null : v;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { client_id, recipe_ids, list_name } = await req.json();
    if (!client_id || !recipe_ids?.length) {
      return new Response(
        JSON.stringify({ error: "client_id and recipe_ids required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch recipes
    const { data: recipes } = await supabase
      .from("recipes")
      .select("id, name, servings")
      .in("id", recipe_ids);

    // Fetch ingredients
    const { data: ingredients } = await supabase
      .from("recipe_ingredients")
      .select("recipe_id, name, amount, unit")
      .in("recipe_id", recipe_ids)
      .order("order_index");

    const recipeMap = new Map((recipes || []).map((r) => [r.id, r]));

    // Merge duplicates
    const merged = new Map<string, {
      name: string;
      amount: number | null;
      unit: string | null;
      category: string;
      meals: Set<string>;
    }>();

    for (const ing of ingredients || []) {
      const recipe = recipeMap.get(ing.recipe_id);
      const mealName = recipe?.name || "Unknown";
      const key = mergeKey(ing.name, ing.unit);
      const parsed = tryParseAmount(ing.amount);

      if (merged.has(key)) {
        const existing = merged.get(key)!;
        if (parsed !== null && existing.amount !== null) {
          existing.amount += parsed;
        }
        existing.meals.add(mealName);
      } else {
        merged.set(key, {
          name: ing.name,
          amount: parsed,
          unit: ing.unit,
          category: categorize(ing.name),
          meals: new Set([mealName]),
        });
      }
    }

    // Create grocery list
    const { data: list, error: listError } = await supabase
      .from("grocery_lists")
      .insert({ client_id, name: list_name || "My Grocery List" })
      .select("id")
      .single();

    if (listError) throw listError;

    // Insert items
    const items = Array.from(merged.values()).map((item) => ({
      list_id: list.id,
      ingredient_name: item.name,
      amount: item.amount !== null ? String(item.amount) : null,
      unit: item.unit,
      category: item.category,
      meal_sources: Array.from(item.meals),
    }));

    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from("grocery_list_items")
        .insert(items);
      if (itemsError) throw itemsError;
    }

    return new Response(
      JSON.stringify({ list_id: list.id, item_count: items.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-grocery-list error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
