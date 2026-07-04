import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "reset_client_plan",
  title: "Reset a client's plan (trainer)",
  description:
    "Clear the client's selected protocol, quick plan, and protocol start date in client_feature_settings. Destructive: their dashboard reverts to a clean slate and the realtime toast fires on their device. Requires the caller to be the client's trainer (enforced by RLS).",
  inputSchema: {
    client_id: z.string().uuid(),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  needsApproval: true,
  handler: async ({ client_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const { data, error } = await supabaseAsUser(ctx)
      .from("client_feature_settings")
      .update({
        selected_protocol_id: null,
        selected_quick_plan_id: null,
        protocol_start_date: null,
        protocol_completed: false,
      })
      .eq("client_id", client_id)
      .select("client_id, selected_protocol_id, selected_quick_plan_id, protocol_start_date, protocol_completed")
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("Client settings not found or not accessible.");
    return {
      content: [{ type: "text", text: `Plan reset for client ${client_id}.` }],
      structuredContent: { settings: data },
    };
  },
});