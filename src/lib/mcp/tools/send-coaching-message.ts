import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "send_coaching_message",
  title: "Send coaching message to a client",
  description:
    "Post a coach message that appears in the client's dashboard coaching feed. Trainer-only.",
  inputSchema: {
    client_id: z.string().uuid(),
    message: z.string().min(1),
    action_text: z.string().optional().describe("Optional CTA button label."),
    priority: z.number().int().min(1).max(5).default(3),
    delivery_slot: z.enum(["morning", "midday", "evening", "any"]).default("any"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ client_id, message, action_text, priority, delivery_slot }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabaseAsUser(ctx)
      .from("coaching_messages")
      .insert({
        client_id,
        coach_type: "trainer",
        message,
        action_text: action_text ?? null,
        priority,
        delivery_slot,
        message_date: today,
      })
      .select()
      .single();
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: `Message queued for ${client_id}` }],
      structuredContent: { message: data },
    };
  },
});