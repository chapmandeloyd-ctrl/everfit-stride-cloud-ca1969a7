import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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
      // Active (non-revoked) consents joined with client metadata.
      const { data, error } = await admin
        .schema("auth" as any)
        .from("oauth_consents")
        .select("id, client_id, scopes, granted_at, revoked_at, oauth_clients(client_name, client_uri, logo_uri, redirect_uris, deleted_at)")
        .eq("user_id", userId)
        .is("revoked_at", null);
      if (error) throw error;

      // For each active consent, look up the most recent session (refreshed_at)
      // for that (user, oauth_client) pair. `refreshed_at` bumps on token
      // refresh — approximately once per hour while an assistant is active.
      const activeConsents = (data ?? []).filter((r: any) => !r.oauth_clients?.deleted_at);
      const clientIds = activeConsents.map((r: any) => r.client_id);

      let lastActiveByClient = new Map<string, string>();
      if (clientIds.length > 0) {
        const { data: sessions, error: sessErr } = await admin
          .schema("auth" as any)
          .from("sessions")
          .select("oauth_client_id, refreshed_at, created_at")
          .eq("user_id", userId)
          .in("oauth_client_id", clientIds);
        if (sessErr) throw sessErr;
        for (const s of sessions ?? []) {
          const stamp = (s as any).refreshed_at ?? (s as any).created_at;
          if (!stamp) continue;
          const key = (s as any).oauth_client_id as string;
          const prev = lastActiveByClient.get(key);
          if (!prev || new Date(stamp) > new Date(prev)) {
            lastActiveByClient.set(key, stamp);
          }
        }
      }

      const items = activeConsents
        .map((r: any) => ({
          consent_id: r.id,
          client_id: r.client_id,
          client_name: r.oauth_clients?.client_name ?? "Unknown client",
          client_uri: r.oauth_clients?.client_uri ?? null,
          logo_uri: r.oauth_clients?.logo_uri ?? null,
          scopes: r.scopes,
          granted_at: r.granted_at,
          last_active_at: lastActiveByClient.get(r.client_id) ?? null,
        }));
      return new Response(JSON.stringify({ items }), { status: 200, headers: jsonHeaders });
    }

    if (body.action === "revoke") {
      if (!body.client_id) {
        return new Response(JSON.stringify({ error: "client_id required" }), { status: 400, headers: jsonHeaders });
      }
      // 1) Mark all consents for this (user, client) as revoked so no new auth codes issue.
      const { error: consentErr } = await admin
        .schema("auth" as any)
        .from("oauth_consents")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("client_id", body.client_id)
        .is("revoked_at", null);
      if (consentErr) throw consentErr;

      // 2) Best-effort: kill any pending authorizations (blocks in-flight code exchanges).
      await admin
        .schema("auth" as any)
        .from("oauth_authorizations")
        .delete()
        .eq("user_id", userId)
        .eq("client_id", body.client_id);

      // 3) Kill active sessions for this (user, client) so existing access
      //    tokens can't refresh — immediate revocation instead of ~1hr wait.
      await admin
        .schema("auth" as any)
        .from("sessions")
        .delete()
        .eq("user_id", userId)
        .eq("oauth_client_id", body.client_id);

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