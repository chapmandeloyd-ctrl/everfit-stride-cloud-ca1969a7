// Shared auth helpers for edge functions.
// All functions here validate the caller's Supabase JWT in code, because
// Lovable-managed functions deploy with verify_jwt = false.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface AuthedUser {
  id: string;
  email?: string | null;
}

function anonClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
}

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** Returns the authenticated user, or null when the request has no valid session. */
export async function getAuthedUser(req: Request): Promise<AuthedUser | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  try {
    const { data, error } = await anonClient(authHeader).auth.getUser();
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email };
  } catch {
    return null;
  }
}

/** True when the request carries the project's service-role key (internal call). */
export function isServiceRoleRequest(req: Request): boolean {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey) return false;
  const header = req.headers.get("Authorization") ?? "";
  const apikey = req.headers.get("apikey") ?? "";
  return header === `Bearer ${serviceKey}` || apikey === serviceKey;
}

export function unauthorized(corsHeaders: Record<string, string>, message = "Unauthorized") {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function forbidden(corsHeaders: Record<string, string>, message = "Forbidden") {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Requires a signed-in user. Returns a Response to return immediately when the
 * caller is not authenticated, otherwise the user.
 */
export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<{ user: AuthedUser } | { response: Response }> {
  const user = await getAuthedUser(req);
  if (!user) return { response: unauthorized(corsHeaders) };
  return { user };
}

/** Requires the caller to be the given client, that client's trainer, or an admin. */
export async function canActForClient(userId: string, clientId: string): Promise<boolean> {
  if (userId === clientId) return true;
  const admin = serviceClient();
  const [{ data: isAdmin }, { data: rel }] = await Promise.all([
    admin.rpc("has_role", { _user_id: userId, _role: "admin" }),
    admin
      .from("trainer_clients")
      .select("id")
      .eq("trainer_id", userId)
      .eq("client_id", clientId)
      .maybeSingle(),
  ]);
  if (isAdmin === true) return true;
  return !!rel;
}
