import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, jsonResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "get_my_active_fast",
  title: "Get my active fast",
  description:
    "Return the signed-in client's active fasting session (if any), including target and elapsed hours.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const { data, error } = await supabaseAsUser(ctx)
      .from("fasting_log")
      .select("id, started_at, ended_at, target_hours, actual_hours, completion_pct, status, ended_early")
      .eq("client_id", ctx.getUserId())
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return { content: [{ type: "text", text: "No active fast." }] };
    const startedAt = new Date(data.started_at as string).getTime();
    const elapsed_hours = Math.max(0, (Date.now() - startedAt) / 3_600_000);
    return jsonResult({ ...data, elapsed_hours: Number(elapsed_hours.toFixed(2)) }, "fast");
  },
});