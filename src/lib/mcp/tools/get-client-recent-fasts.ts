import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "get_client_recent_fasts",
  title: "Get client's recent fasts",
  description:
    "Return the client's most recent fasting sessions (target vs. actual hours, completion %, status).",
  inputSchema: {
    client_id: z.string().uuid(),
    limit: z.number().int().min(1).max(50).default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ client_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const { data, error } = await supabaseAsUser(ctx)
      .from("fasting_log")
      .select("id, started_at, ended_at, target_hours, actual_hours, completion_pct, status, ended_early")
      .eq("client_id", client_id)
      .order("started_at", { ascending: false })
      .limit(limit);
    if (error) return errorResult(error.message);
    return jsonResult(data ?? [], "fasts");
  },
});