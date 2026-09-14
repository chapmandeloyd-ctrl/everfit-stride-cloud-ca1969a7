import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Only these hosts may be fetched through the proxy. Anything else is rejected,
// so the function cannot be abused as an open proxy / SSRF gadget.
function allowedHost(host: string): boolean {
  const projectHost = (() => {
    try { return new URL(Deno.env.get("SUPABASE_URL") ?? "").host; } catch { return ""; }
  })();
  if (projectHost && host === projectHost) return true;
  const ALLOWED = [
    /\.supabase\.co$/i,
    /\.supabase\.in$/i,
    /^cdn\.pixabay\.com$/i,
    /^storage\.googleapis\.com$/i,
  ];
  return ALLOWED.some((re) => re.test(host));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const audioUrl = url.searchParams.get("url");

  if (!audioUrl) {
    return new Response(JSON.stringify({ error: "Missing url param" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let target: URL;
  try {
    target = new URL(audioUrl);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid url" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (target.protocol !== "https:" || !allowedHost(target.host)) {
    return new Response(JSON.stringify({ error: "URL not allowed" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const res = await fetch(target.toString(), { redirect: "error" });
    if (!res.ok) {
      return new Response("Upstream error", {
        status: res.status,
        headers: corsHeaders,
      });
    }

    const contentType = res.headers.get("content-type") || "audio/mpeg";
    if (!/^(audio|video|application\/octet-stream)/i.test(contentType)) {
      return new Response("Unsupported content type", { status: 415, headers: corsHeaders });
    }

    const body = await res.arrayBuffer();

    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Proxy error", { status: 502, headers: corsHeaders });
  }
});
