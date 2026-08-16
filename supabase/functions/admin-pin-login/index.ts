import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Reject after `ms` so a hung auth call can't stall the whole request. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
    const adminPin = (Deno.env.get("ADMIN_PIN") ?? "").trim();

    if (!adminPin) {
      console.error("ADMIN_PIN secret is not configured");
      return json({ error: "Admin PIN is not configured" }, 500);
    }
    if (!pin || pin !== adminPin) {
      return json({ error: "Invalid PIN" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Resolve the trainer account (bounded).
    let email: string | null = null;
    try {
      const t0 = Date.now();
      const { data, error } = await withTimeout(
        supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("role", "trainer")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        6000,
        "trainer lookup"
      );
      console.log(`trainer lookup took ${Date.now() - t0}ms`);
      if (error) throw error;
      email = data?.email ?? null;
    } catch (e) {
      console.error("Trainer lookup failed:", e);
      return json({ error: "Login service is busy. Tap Enter again." }, 503);
    }

    if (!email) return json({ error: "No trainer account found" }, 404);

    // 2. Mint a magic link. Auth occasionally hangs; bound each attempt and
    //    retry quickly so we always answer well inside the client timeout.
    let actionLink: string | null = null;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const t0 = Date.now();
      try {
        const { data, error } = await withTimeout(
          supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email }),
          6000,
          "generateLink"
        );
        console.log(`generateLink attempt ${attempt + 1} took ${Date.now() - t0}ms`);
        if (error) throw error;
        actionLink = data?.properties?.action_link ?? null;
        if (actionLink) break;
        throw new Error("No action link returned");
      } catch (e) {
        lastError = e;
        console.error(`generateLink attempt ${attempt + 1} failed after ${Date.now() - t0}ms:`, e);
        if (attempt < 2) await wait(500);
      }
    }

    if (!actionLink) {
      console.error("generateLink failed after retries:", lastError);
      return json({ error: "Login service is busy. Tap Enter again." }, 503);
    }

    const url = new URL(actionLink);
    const token_hash = url.searchParams.get("token");
    const type = url.searchParams.get("type");

    if (!token_hash) {
      return json({ error: "Login service is busy. Tap Enter again." }, 503);
    }

    return json({ token_hash, type, email }, 200);
  } catch (error: any) {
    console.error("Admin PIN login error:", error);
    return json({ error: error?.message ?? "Unexpected error" }, 500);
  }
});
