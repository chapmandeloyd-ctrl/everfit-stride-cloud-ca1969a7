import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

type Action = "list" | "revoke";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  // Auth check: use the caller's JWT to resolve their user id.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: jsonHeaders });
  }

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: jsonHeaders });
  }
  const userId = userRes.user.id;

  // Admin client for auth-schema access.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: { action?: Action; client_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: jsonHeaders });
  }

  try {
    if (body.action === "list") {
      const { data, error } = await admin.rpc("list_mcp_connections", { _user_id: userId });
      if (error) throw error;
      const items = (data ?? []).map((r: any) => ({
        consent_id: r.consent_id,
        client_id: r.client_id,
        client_name: r.client_name ?? "Unknown client",
        client_uri: r.client_uri ?? null,
        logo_uri: r.logo_uri ?? null,
        scopes: r.scopes,
        granted_at: r.granted_at,
        last_active_at: r.last_active_at ?? null,
      }));
      return new Response(JSON.stringify({ items }), { status: 200, headers: jsonHeaders });
    }

    if (body.action === "revoke") {
      if (!body.client_id) {
        return new Response(JSON.stringify({ error: "client_id required" }), { status: 400, headers: jsonHeaders });
      }
      const { error: rpcErr } = await admin.rpc("revoke_mcp_connection", {
        _user_id: userId,
        _client_id: body.client_id,
      });
      if (rpcErr) throw rpcErr;

      return new Response(
        JSON.stringify({
          ok: true,
          note: "Consent revoked and sessions killed. Active access tokens will fail on next refresh (~1 hour max).",
        }),
        { status: 200, headers: jsonHeaders },
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: jsonHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: jsonHeaders });
  }
});