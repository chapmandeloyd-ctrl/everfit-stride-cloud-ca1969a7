import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tables explicitly blocked from the console (system / risky)
const BLOCKED = new Set<string>([
  "schema_migrations",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify trainer role
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (profile?.role !== "trainer") return json({ error: "Forbidden — trainer only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list_tables") {
      const { data, error } = await userClient.rpc("admin_list_tables" as any);
      if (error) {
        return json({ error: error.message || "Failed to load tables" }, 500);
      }
      const tables = (data ?? []) as Array<{ table_name: string; row_estimate: number }>;
      // Get exact counts in parallel (head request, no rows transferred)
      const withCounts = await Promise.all(
        tables.map(async (t) => {
          const { count, error: cErr } = await admin
            .from(t.table_name)
            .select("*", { count: "exact", head: true });
          return {
            table_name: t.table_name,
            row_estimate: t.row_estimate,
            row_count: cErr ? null : count ?? 0,
          };
        })
      );
      return json({ tables: withCounts });
    }

    if (action === "list_rows") {
      const table = String(body.table || "");
      const limit = Math.min(Number(body.limit ?? 100), 500);
      const offset = Math.max(Number(body.offset ?? 0), 0);
      if (!table || BLOCKED.has(table)) return json({ error: "Invalid table" }, 400);
      const { data, error, count } = await admin
        .from(table)
        .select("*", { count: "exact" })
        .range(offset, offset + limit - 1);
      if (error) return json({ error: error.message }, 400);
      return json({ rows: data, count });
    }

    if (action === "delete_row") {
      const table = String(body.table || "");
      const id = body.id;
      const idColumn = String(body.id_column || "id");
      if (!table || BLOCKED.has(table) || id === undefined || id === null) {
        return json({ error: "Invalid request" }, 400);
      }
      const { error } = await admin.from(table).delete().eq(idColumn, id);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    return json({ error: e.message ?? String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}