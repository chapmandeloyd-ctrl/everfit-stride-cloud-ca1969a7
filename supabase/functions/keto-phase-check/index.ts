import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Runs daily. For every active keto assignment, checks days elapsed
 * since `assigned_at` and — when a client crosses into Adjustment (day 8)
 * or Maintenance (day 22) — sends the trainer an in-app notification.
 * Deduped via keto_phase_notifications_log (unique on client_id + phase).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: assignments, error } = await supabase
    .from("client_keto_assignments")
    .select("client_id, keto_type_id, assigned_at")
    .eq("is_active", true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = Date.now();
  const notified: string[] = [];

  for (const a of assignments ?? []) {
    if (!a.assigned_at) continue;
    const daysIn = Math.floor((now - new Date(a.assigned_at).getTime()) / 86400000);

    let phase: "adjustment" | "maintenance" | null = null;
    if (daysIn >= 21) phase = "maintenance";
    else if (daysIn >= 7) phase = "adjustment";
    if (!phase) continue;

    // Already notified for this phase?
    const { data: existing } = await supabase
      .from("keto_phase_notifications_log")
      .select("id")
      .eq("client_id", a.client_id)
      .eq("phase", phase)
      .maybeSingle();
    if (existing) continue;

    // Find trainer + client name
    const [{ data: settings }, { data: profile }, { data: keto }] = await Promise.all([
      supabase
        .from("client_feature_settings")
        .select("trainer_id")
        .eq("client_id", a.client_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", a.client_id)
        .maybeSingle(),
      supabase
        .from("keto_types")
        .select("abbreviation")
        .eq("id", a.keto_type_id)
        .maybeSingle(),
    ]);

    if (!settings?.trainer_id) continue;

    const clientName = profile?.full_name?.trim() || "A client";
    const ketoAbbr = keto?.abbreviation ?? "keto";
    const title =
      phase === "adjustment"
        ? `${clientName} entered Adjustment phase`
        : `${clientName} entered Maintenance phase`;
    const body =
      phase === "adjustment"
        ? `Day 8 on ${ketoAbbr} — fat adaptation window. Time to check in on energy, cravings, and reintroduce light training.`
        : `Day 22 on ${ketoAbbr} — they're fat-adapted. Time to dial macros to their goal and review re-feed strategy.`;

    await supabase.from("in_app_notifications").insert({
      user_id: settings.trainer_id,
      title,
      body,
      type: "keto_phase_transition",
      reference_id: a.client_id,
      action_url: `/clients/${a.client_id}`,
    });

    await supabase.from("keto_phase_notifications_log").insert({
      client_id: a.client_id,
      phase,
    });

    notified.push(`${a.client_id}:${phase}`);
  }

  return new Response(JSON.stringify({ ok: true, notified }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});