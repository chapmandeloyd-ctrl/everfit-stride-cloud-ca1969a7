import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, jsonResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "get_my_habits",
  title: "Get my habits",
  description:
    "List the signed-in client's active habits with today's completion status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseAsUser(ctx);
    const today = new Date().toISOString().slice(0, 10);
    const [habitsRes, completionsRes] = await Promise.all([
      supabase
        .from("client_habits")
        .select("id, name, description, goal_value, goal_unit, frequency, is_active")
        .eq("client_id", ctx.getUserId())
        .eq("is_active", true),
      supabase
        .from("habit_completions")
        .select("habit_id, value, completed_at")
        .eq("client_id", ctx.getUserId())
        .eq("completion_date", today),
    ]);
    if (habitsRes.error) return errorResult(habitsRes.error.message);
    if (completionsRes.error) return errorResult(completionsRes.error.message);
    const completed = new Map<string, { value: number | null; completed_at: string }>();
    for (const c of completionsRes.data ?? []) {
      completed.set(c.habit_id as string, { value: c.value as any, completed_at: c.completed_at as any });
    }
    const rows = (habitsRes.data ?? []).map((h: any) => ({
      ...h,
      completed_today: completed.has(h.id),
      today_value: completed.get(h.id)?.value ?? null,
    }));
    return jsonResult(rows, "habits");
  },
});