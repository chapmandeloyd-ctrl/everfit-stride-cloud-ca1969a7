import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "get_client_progress",
  title: "Get client progress",
  description:
    "Return the latest weekly summary for a client (adherence score, avg score 7d, completion, trend, deltas). Requires the caller to be the client's trainer (RLS enforced).",
  inputSchema: {
    client_id: z.string().uuid().describe("The client's profile id (UUID)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ client_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseAsUser(ctx);
    const { data, error } = await supabase
      .from("client_weekly_summaries")
      .select("*")
      .eq("client_id", client_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) {
      return { content: [{ type: "text", text: "No progress summary found for this client." }] };
    }
    return jsonResult(data, "summary");
  },
});