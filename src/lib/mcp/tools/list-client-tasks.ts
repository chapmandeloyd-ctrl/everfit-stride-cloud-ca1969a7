import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "list_client_tasks",
  title: "List client tasks",
  description:
    "List tasks for one of the signed-in trainer's clients. Filter by completion status.",
  inputSchema: {
    client_id: z.string().uuid(),
    status: z.enum(["open", "completed", "all"]).default("open"),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ client_id, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    let query = supabaseAsUser(ctx)
      .from("client_tasks")
      .select("id, name, description, task_type, due_date, completed_at, assigned_at")
      .eq("client_id", client_id)
      .order("assigned_at", { ascending: false })
      .limit(limit);
    if (status === "open") query = query.is("completed_at", null);
    if (status === "completed") query = query.not("completed_at", "is", null);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult(data ?? [], "tasks");
  },
});