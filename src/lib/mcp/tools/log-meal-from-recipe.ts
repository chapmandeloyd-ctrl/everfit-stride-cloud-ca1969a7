import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "log_meal_from_recipe",
  title: "Log meal from recipe",
  description:
    "Log a meal for the signed-in client using an existing validated recipe. Macros are scaled by servings_eaten / recipe.servings. Writes to nutrition_logs, so it does not create free-text meals that would poison adaptive scoring.",
  inputSchema: {
    recipe_id: z.string().uuid(),
    servings_eaten: z.number().positive().max(20).default(1),
    log_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("YYYY-MM-DD, defaults to today."),
    notes: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ recipe_id, servings_eaten, log_date, notes }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseAsUser(ctx);

    const { data: recipe, error: recipeErr } = await supabase
      .from("recipes")
      .select("id, name, calories, protein, carbs, fats, servings, is_valid, image_url")
      .eq("id", recipe_id)
      .maybeSingle();
    if (recipeErr) return errorResult(recipeErr.message);
    if (!recipe) return errorResult("Recipe not found or not accessible.");
    if (recipe.is_valid === false) return errorResult("Recipe is marked invalid; ask your coach to fix it before logging.");

    const baseServings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1;
    const factor = servings_eaten / baseServings;
    const scale = (n: number | null) => (n == null ? null : Math.round(Number(n) * factor * 100) / 100);

    const { data: entry, error: entryErr } = await supabase
      .from("nutrition_logs")
      .insert({
        client_id: ctx.getUserId(),
        log_date: log_date ?? new Date().toISOString().slice(0, 10),
        meal_name: `${recipe.name}${servings_eaten !== 1 ? ` (${servings_eaten}x)` : ""}`,
        calories: recipe.calories == null ? null : Math.round(Number(recipe.calories) * factor),
        protein: scale(recipe.protein as any),
        carbs: scale(recipe.carbs as any),
        fats: scale(recipe.fats as any),
        notes: notes ?? null,
        image_url: recipe.image_url ?? null,
      })
      .select()
      .single();
    if (entryErr) return errorResult(entryErr.message);

    return {
      content: [
        {
          type: "text",
          text: `Logged ${servings_eaten} serving(s) of "${recipe.name}" (~${entry.calories ?? "?"} kcal).`,
        },
      ],
      structuredContent: { entry },
    };
  },
});