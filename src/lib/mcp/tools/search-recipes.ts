import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "search_recipes",
  title: "Search recipes",
  description:
    "Search recipes available to the signed-in user by name/description, with optional macro and prep-time filters. Returns id, name, calories, macros, prep time, servings, and image — perfect for chaining into log_meal_from_recipe.",
  inputSchema: {
    query: z.string().trim().optional().describe("Free text; matches recipe name or description."),
    max_calories: z.number().int().positive().max(5000).optional(),
    min_protein: z.number().nonnegative().max(500).optional(),
    max_prep_minutes: z.number().int().positive().max(600).optional(),
    limit: z.number().int().min(1).max(25).default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, max_calories, min_protein, max_prep_minutes, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    let q = supabaseAsUser(ctx)
      .from("recipes")
      .select("id,name,description,calories,protein,carbs,fats,servings,prep_time_minutes,image_url,is_valid")
      .neq("is_valid", false)
      .limit(limit);

    if (query) q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    if (max_calories != null) q = q.lte("calories", max_calories);
    if (min_protein != null) q = q.gte("protein", min_protein);
    if (max_prep_minutes != null) q = q.lte("prep_time_minutes", max_prep_minutes);

    const { data, error } = await q;
    if (error) return errorResult(error.message);

    return {
      content: [
        {
          type: "text",
          text: data?.length
            ? `Found ${data.length} recipe(s):\n${data.map((r) => `• ${r.name} — ${r.calories ?? "?"} kcal, ${r.protein ?? "?"}g P (${r.prep_time_minutes ?? "?"} min) — id: ${r.id}`).join("\n")}`
            : "No recipes matched those filters.",
        },
      ],
      structuredContent: { recipes: data ?? [] },
    };
  },
});