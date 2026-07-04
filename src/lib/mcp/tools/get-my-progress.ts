import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, jsonResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "get_my_progress",
  title: "Get my progress",
  description:
    "Return the signed-in client's latest weekly summary (adherence score, 7-day averages, trend, deltas).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const { data, error } = await supabaseAsUser(ctx)
      .from("client_weekly_summaries")
      .select("*")
      .eq("client_id", ctx.getUserId())
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return { content: [{ type: "text", text: "No weekly summary yet." }] };
    return jsonResult(data, "summary");
  },
});