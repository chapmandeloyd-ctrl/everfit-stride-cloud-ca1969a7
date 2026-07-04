import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "get_my_smart_pace",
  title: "Get my Smart Pace",
  description:
    "Return the signed-in client's active Smart Pace goal and the most recent daily log entry (weight, delta vs. plan, debt/credit).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseAsUser(ctx);
    const clientId = ctx.getUserId();

    const [{ data: goal, error: gErr }, { data: logs, error: lErr }] = await Promise.all([
      supabase
        .from("smart_pace_goals")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("smart_pace_daily_log")
        .select("*")
        .eq("client_id", clientId)
        .order("log_date", { ascending: false })
        .limit(7),
    ]);
    if (gErr) return errorResult(gErr.message);
    if (lErr) return errorResult(lErr.message);

    const latest = logs?.[0];
    return {
      content: [
        {
          type: "text",
          text: goal
            ? `Smart Pace active. Latest log: ${latest ? `${latest.log_date} — weight ${latest.weight_lbs ?? "?"} lbs` : "no entries yet"}.`
            : "No active Smart Pace goal.",
        },
      ],
      structuredContent: { goal, latest, recent_logs: logs ?? [] },
    };
  },
});