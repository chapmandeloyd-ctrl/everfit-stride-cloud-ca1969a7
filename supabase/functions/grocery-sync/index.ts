import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CATEGORY_MAP: Record<string, string> = {
  chicken: "Protein", beef: "Protein", steak: "Protein", salmon: "Protein",
  shrimp: "Protein", turkey: "Protein", pork: "Protein", bacon: "Protein",
  sausage: "Protein", egg: "Protein", eggs: "Protein", tuna: "Protein",
  fish: "Protein", lamb: "Protein", tofu: "Protein", tempeh: "Protein",
  butter: "Fats", "olive oil": "Fats", "coconut oil": "Fats",
  avocado: "Fats", "cream cheese": "Fats", cheese: "Fats",
  mozzarella: "Fats", cheddar: "Fats", parmesan: "Fats",
  spinach: "Vegetables", broccoli: "Vegetables", asparagus: "Vegetables",
  kale: "Vegetables", lettuce: "Vegetables", tomato: "Vegetables",
  onion: "Vegetables", garlic: "Vegetables", pepper: "Vegetables",
  mushroom: "Vegetables", zucchini: "Vegetables", cauliflower: "Vegetables",
  carrot: "Vegetables", cucumber: "Vegetables", celery: "Vegetables",
  milk: "Dairy", cream: "Dairy", yogurt: "Dairy",
};

function categorize(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return cat;
  }
  return "Other";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { client_id, recipe_id, action } = await req.json();
    if (!client_id || !recipe_id) {
      return new Response(
        JSON.stringify({ error: "client_id and recipe_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get the active grocery list for this client
    const { data: activeList } = await supabase
      .from("grocery_lists")
      .select("id")
      .eq("client_id", client_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!activeList) {
      return new Response(
        JSON.stringify({ synced: false, reason: "no_active_list" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get recipe ingredients
    const { data: ingredients } = await supabase
      .from("recipe_ingredients")
      .select("name, amount, unit")
      .eq("recipe_id", recipe_id);

    const { data: recipe } = await supabase
      .from("recipes")
      .select("name")
      .eq("id", recipe_id)
      .single();

    const recipeName = recipe?.name || "Unknown";

    if (action === "log_meal") {
      // STEP 2: Mark ingredients as used, reduce quantities
      // STEP 3: Auto-add new ingredients not in the list
      const { data: existingItems } = await supabase
        .from("grocery_list_items")
        .select("id, ingredient_name, amount, used_amount, original_amount")
        .eq("list_id", activeList.id);

      const existingMap = new Map(
        (existingItems || []).map((item) => [item.ingredient_name.toLowerCase().trim(), item])
      );

      const lowStockItems: string[] = [];
      const addedItems: string[] = [];

      for (const ing of ingredients || []) {
        const key = ing.name.toLowerCase().trim();
        const existing = existingMap.get(key);

        if (existing) {
          // Reduce quantity
          const currentAmount = parseFloat(existing.amount || "0") || 0;
          const usedSoFar = parseFloat(existing.used_amount || "0") || 0;
          const ingAmount = parseFloat((ing.amount || "0").replace(/[^\d.]/g, "")) || 0;
          const newUsed = usedSoFar + ingAmount;
          const remaining = currentAmount - newUsed;
          const isLow = remaining <= 0 || (currentAmount > 0 && remaining / currentAmount < 0.2);

          await supabase
            .from("grocery_list_items")
            .update({
              used_amount: String(newUsed),
              is_low_stock: isLow,
            })
            .eq("id", existing.id);

          if (isLow) lowStockItems.push(ing.name);
        } else {
          // Auto-add new ingredient (Step 3)
          await supabase
            .from("grocery_list_items")
            .insert({
              list_id: activeList.id,
              ingredient_name: ing.name,
              amount: ing.amount,
              original_amount: ing.amount,
              unit: ing.unit,
              category: categorize(ing.name),
              meal_sources: [recipeName],
              is_manual: false,
              used_amount: ing.amount || "0",
              is_low_stock: true,
            });
          addedItems.push(ing.name);
        }
      }

      return new Response(
        JSON.stringify({
          synced: true,
          low_stock: lowStockItems,
          auto_added: addedItems,
          list_id: activeList.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ synced: false, reason: "unknown_action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("grocery-sync error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
