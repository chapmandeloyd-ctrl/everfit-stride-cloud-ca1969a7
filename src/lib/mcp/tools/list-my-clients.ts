import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, jsonResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "list_my_clients",
  title: "List my clients",
  description:
    "List clients linked to the signed-in trainer via trainer_clients, joined with each client's profile (name, email).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseAsUser(ctx);
    const { data, error } = await supabase
      .from("trainer_clients")
      .select("client_id, status, assigned_at, profiles:client_id ( full_name, email, engine_mode )")
      .eq("trainer_id", ctx.getUserId());
    if (error) return errorResult(error.message);
    const rows = (data ?? []).map((r: any) => ({
      client_id: r.client_id,
      status: r.status,
      assigned_at: r.assigned_at,
      full_name: r.profiles?.full_name ?? null,
      email: r.profiles?.email ?? null,
      engine_mode: r.profiles?.engine_mode ?? null,
    }));
    return jsonResult(rows, "clients");
  },
});