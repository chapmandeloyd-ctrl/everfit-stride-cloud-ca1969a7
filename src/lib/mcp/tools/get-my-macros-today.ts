import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "get_my_macros_today",
  title: "Get my macros today",
  description:
    "Return the signed-in client's macro targets vs. today's consumed totals (calories, protein, carbs, fats) plus remaining amounts. Uses the client's active client_macro_targets row and sums today's nutrition_logs.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseAsUser(ctx);
    const clientId = ctx.getUserId();
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: target, error: tErr }, { data: logs, error: lErr }] = await Promise.all([
      supabase
        .from("client_macro_targets")
        .select("target_calories,target_protein,target_carbs,target_fats,tracking_option,diet_style")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("nutrition_logs")
        .select("calories,protein,carbs,fats")
        .eq("client_id", clientId)
        .eq("log_date", today),
    ]);
    if (tErr) return errorResult(tErr.message);
    if (lErr) return errorResult(lErr.message);

    const consumed = (logs ?? []).reduce(
      (acc, r) => ({
        calories: acc.calories + Number(r.calories ?? 0),
        protein: acc.protein + Number(r.protein ?? 0),
        carbs: acc.carbs + Number(r.carbs ?? 0),
        fats: acc.fats + Number(r.fats ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 },
    );

    const round = (n: number) => Math.round(n * 10) / 10;
    const remaining = target
      ? {
          calories: Math.max(0, (target.target_calories ?? 0) - consumed.calories),
          protein: round(Math.max(0, Number(target.target_protein ?? 0) - consumed.protein)),
          carbs: round(Math.max(0, Number(target.target_carbs ?? 0) - consumed.carbs)),
          fats: round(Math.max(0, Number(target.target_fats ?? 0) - consumed.fats)),
        }
      : null;

    return {
      content: [
        {
          type: "text",
          text: target
            ? `Today: ${Math.round(consumed.calories)}/${target.target_calories} kcal · P ${round(consumed.protein)}/${target.target_protein}g · C ${round(consumed.carbs)}/${target.target_carbs}g · F ${round(consumed.fats)}/${target.target_fats}g`
            : `No active macro target set. Today's consumed: ${Math.round(consumed.calories)} kcal.`,
        },
      ],
      structuredContent: {
        date: today,
        target,
        consumed: {
          calories: Math.round(consumed.calories),
          protein: round(consumed.protein),
          carbs: round(consumed.carbs),
          fats: round(consumed.fats),
        },
        remaining,
        meals_logged: logs?.length ?? 0,
      },
    };
  },
});