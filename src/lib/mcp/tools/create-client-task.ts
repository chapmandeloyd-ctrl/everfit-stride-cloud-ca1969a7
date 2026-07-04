import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "create_client_task",
  title: "Create client task",
  description:
    "Assign a task to one of the signed-in trainer's clients. The trainer_id is taken from the OAuth token, never from input.",
  inputSchema: {
    client_id: z.string().uuid().describe("Target client's profile id."),
    name: z.string().min(1).describe("Short task name shown to the client."),
    description: z.string().optional().describe("Optional longer description."),
    task_type: z
      .enum(["general", "progress_photo", "body_metrics", "form", "habit"])
      .default("general")
      .describe("Task category."),
    due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Optional due date, YYYY-MM-DD."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ client_id, name, description, task_type, due_date }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseAsUser(ctx);
    const { data, error } = await supabase
      .from("client_tasks")
      .insert({
        trainer_id: ctx.getUserId(),
        client_id,
        name,
        description: description ?? null,
        task_type,
        due_date: due_date ?? null,
      })
      .select()
      .single();
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: `Task created: ${data.id}` }],
      structuredContent: { task: data },
    };
  },
});