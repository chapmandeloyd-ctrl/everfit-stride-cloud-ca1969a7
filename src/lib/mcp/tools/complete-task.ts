import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "complete_task",
  title: "Complete a task",
  description:
    "Mark a client_tasks row as completed (sets completed_at = now). RLS enforces the caller must own or coach the task.",
  inputSchema: {
    task_id: z.string().uuid(),
    notes: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ task_id, notes }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const patch: Record<string, unknown> = { completed_at: new Date().toISOString() };
    if (notes) patch.notes = notes;
    const { data, error } = await supabaseAsUser(ctx)
      .from("client_tasks")
      .update(patch)
      .eq("id", task_id)
      .select()
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("Task not found or not accessible.");
    return {
      content: [{ type: "text", text: `Task ${task_id} marked complete.` }],
      structuredContent: { task: data },
    };
  },
});