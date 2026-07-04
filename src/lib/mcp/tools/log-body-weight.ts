import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthed, supabaseAsUser } from "../_supabase";

export default defineTool({
  name: "log_body_weight",
  title: "Log body weight",
  description:
    "Log a body weight measurement (lbs) for the signed-in client. Automatically resolves the 'Weight' metric definition and reuses (or creates) the client's Weight metric row. A DB trigger will backfill the start weight of any active fitness goal if it isn't set yet.",
  inputSchema: {
    value_lbs: z.number().positive().max(1500),
    recorded_at: z.string().datetime().optional().describe("Optional ISO timestamp; defaults to now."),
    notes: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ value_lbs, recorded_at, notes }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseAsUser(ctx);
    const clientId = ctx.getUserId();

    // 1) Resolve the default 'Weight' metric definition.
    const { data: def, error: defErr } = await supabase
      .from("metric_definitions")
      .select("id")
      .eq("name", "Weight")
      .eq("is_default", true)
      .limit(1)
      .maybeSingle();
    if (defErr) return errorResult(defErr.message);
    if (!def) return errorResult("Weight metric definition not found.");

    // 2) Find (or create) the client's Weight metric row.
    let { data: metric, error: metricErr } = await supabase
      .from("client_metrics")
      .select("id")
      .eq("client_id", clientId)
      .eq("metric_definition_id", def.id)
      .limit(1)
      .maybeSingle();
    if (metricErr) return errorResult(metricErr.message);

    if (!metric) {
      const { data: created, error: createErr } = await supabase
        .from("client_metrics")
        .insert({ client_id: clientId, metric_definition_id: def.id, is_pinned: true })
        .select("id")
        .single();
      if (createErr) return errorResult(createErr.message);
      metric = created;
    }

    // 3) Insert the entry. The auto_set_goal_start_weight trigger handles goals.
    const { data: entry, error: entryErr } = await supabase
      .from("metric_entries")
      .insert({
        client_id: clientId,
        client_metric_id: metric.id,
        value: value_lbs,
        recorded_at: recorded_at ?? new Date().toISOString(),
        notes: notes ?? null,
      })
      .select()
      .single();
    if (entryErr) return errorResult(entryErr.message);

    return {
      content: [{ type: "text", text: `Weight logged: ${value_lbs} lbs.` }],
      structuredContent: { entry },
    };
  },
});