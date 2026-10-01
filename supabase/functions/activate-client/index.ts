import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Flips a client's trainer_clients rows from "pending" (new, never logged in)
// to "active" once they sign in with their own password.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return json({ error: "Unauthorized" }, 401);
    if (user.user_metadata?.must_change_password === true) return json({ activated: false });
    const { data, error: upErr } = await admin
      .from("trainer_clients")
      .update({ status: "active" })
      .eq("client_id", user.id)
      .eq("status", "pending")
      .select("id");
    if (upErr) throw upErr;
    return json({ activated: (data?.length ?? 0) > 0 });
  } catch (e) {
    console.error(e);
    return json({ error: "Failed" }, 500);
  }
});
