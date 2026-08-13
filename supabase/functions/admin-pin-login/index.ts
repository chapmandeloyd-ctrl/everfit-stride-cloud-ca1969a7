import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
      return new Response(
        JSON.stringify({ error: "Admin PIN is not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!pin || pin !== adminPin) {
      return new Response(
        JSON.stringify({ error: "Invalid PIN" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find the trainer account
    const { data: trainerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("role", "trainer")
      .limit(1)
      .single();

    if (profileError || !trainerProfile) {
      return new Response(
        JSON.stringify({ error: "No trainer account found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Auth can occasionally return a retryable gateway timeout even while the
    // rest of the backend is healthy. Retry once before failing the PIN login.
    let linkData = null;
    let linkError: unknown = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: trainerProfile.email,
      });
      linkData = result.data;
      linkError = result.error;
      if (linkData && !linkError) break;
      if (attempt === 0) await wait(750);
    }

    if (linkError || !linkData) {
      console.error("Error generating link after retry:", linkError);
      return new Response(
        JSON.stringify({ error: "Failed to generate login link" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Extract the token from the action link
    const actionLink = linkData.properties?.action_link;
    const url = new URL(actionLink);
    const token_hash = url.searchParams.get("token");
    const type = url.searchParams.get("type");

    return new Response(
      JSON.stringify({ 
        token_hash, 
        type,
        email: trainerProfile.email 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Admin PIN login error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
