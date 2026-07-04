import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "get_client_adherence_breakdown",
  title: "Get client adherence breakdown",
  description:
    "Return the latest per-engine scores for a client (engine type, score, status, streak, weekly completion, and the engine's own recommendation). Requires the caller to be the client's trainer (RLS enforced).",
  inputSchema: {
    client_id: z.string().uuid(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ client_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const { data, error } = await supabaseAsUser(ctx)
      .from("engine_scores")
      .select("engine_type,score,status,streak_days,weekly_completion_pct,recommendation,computed_at")
      .eq("client_id", client_id)
      .order("computed_at", { ascending: false });
    if (error) return errorResult(error.message);
    if (!data?.length)
      return { content: [{ type: "text", text: "No engine scores computed yet for this client." }] };

    // Keep the latest row per engine_type.
    const byEngine = new Map<string, typeof data[number]>();
    for (const row of data) if (!byEngine.has(row.engine_type)) byEngine.set(row.engine_type, row);
    const latest = [...byEngine.values()];

    return {
      content: [
        {
          type: "text",
          text: latest
            .map((r) => `• ${r.engine_type}: ${Number(r.score).toFixed(0)} (${r.status}) — streak ${r.streak_days}d, completion ${r.weekly_completion_pct ?? "?"}%`)
            .join("\n"),
        },
      ],
      structuredContent: { engines: latest },
    };
  },
});