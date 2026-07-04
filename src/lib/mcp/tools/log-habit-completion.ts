import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "log_habit_completion",
  title: "Log habit completion",
  description:
    "Mark one of the signed-in client's habits as completed for today (or a chosen date).",
  inputSchema: {
    habit_id: z.string().uuid(),
    value: z.number().optional().describe("Optional numeric amount (e.g. count/minutes)."),
    notes: z.string().optional(),
    completion_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("YYYY-MM-DD, defaults to today."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ habit_id, value, notes, completion_date }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const date = completion_date ?? new Date().toISOString().slice(0, 10);
    const { data, error } = await supabaseAsUser(ctx)
      .from("habit_completions")
      .insert({
        habit_id,
        client_id: ctx.getUserId(),
        completion_date: date,
        completed_at: new Date().toISOString(),
        value: value ?? null,
        notes: notes ?? null,
      })
      .select()
      .single();
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: `Habit ${habit_id} logged for ${date}.` }],
      structuredContent: { completion: data },
    };
  },
});