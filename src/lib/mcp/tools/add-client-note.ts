import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "add_client_note",
  title: "Add client note",
  description:
    "Add a private trainer note about a client. Only visible to the trainer via RLS.",
  inputSchema: {
    client_id: z.string().uuid(),
    content: z.string().min(1),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ client_id, content }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const { data, error } = await supabaseAsUser(ctx)
      .from("client_notes")
      .insert({ trainer_id: ctx.getUserId(), client_id, content })
      .select()
      .single();
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: `Note saved: ${data.id}` }],
      structuredContent: { note: data },
    };
  },
});