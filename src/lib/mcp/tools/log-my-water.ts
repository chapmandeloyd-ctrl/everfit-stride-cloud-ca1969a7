import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "log_my_water",
  title: "Log water intake",
  description: "Log a water intake entry (in ounces) for the signed-in client.",
  inputSchema: {
    amount_oz: z.number().positive().max(500),
    logged_at: z.string().datetime().optional().describe("Optional ISO timestamp; defaults to now."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ amount_oz, logged_at }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const { data, error } = await supabaseAsUser(ctx)
      .from("water_log_entries")
      .insert({
        client_id: ctx.getUserId(),
        amount_oz,
        logged_at: logged_at ?? new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: `Logged ${amount_oz} oz of water.` }],
      structuredContent: { entry: data },
    };
  },
});