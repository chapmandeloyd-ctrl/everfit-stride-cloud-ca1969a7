import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "get_client_recent_workouts",
  title: "Get client's recent workouts",
  description:
    "Return the client's most recent workout sessions (status, duration, completion %, difficulty rating, notes).",
  inputSchema: {
    client_id: z.string().uuid(),
    limit: z.number().int().min(1).max(50).default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ client_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const { data, error } = await supabaseAsUser(ctx)
      .from("workout_sessions")
      .select(
        "id, started_at, completed_at, status, duration_seconds, completion_percentage, difficulty_rating, is_partial, notes",
      )
      .eq("client_id", client_id)
      .order("started_at", { ascending: false })
      .limit(limit);
    if (error) return errorResult(error.message);
    return jsonResult(data ?? [], "workouts");
  },
});