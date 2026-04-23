const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const API_TOKEN = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");

    if (!ACCOUNT_ID || !API_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Cloudflare Stream credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const sourceUrl: string | undefined = body.url;
    const name: string = body.name ?? `upload-${Date.now()}`;

    if (!sourceUrl || typeof sourceUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'url' in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 1: Fetch the source file ourselves (avoids origin range-request requirement)
    const fileRes = await fetch(sourceUrl);
    if (!fileRes.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch source: ${fileRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const fileBlob = await fileRes.blob();

    // Step 2: Upload as multipart/form-data to Cloudflare Stream basic upload endpoint
    const formData = new FormData();
    formData.append("file", fileBlob, `${name}.mp4`);

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: formData,
      },
    );

    const cfData = await cfRes.json();

    if (!cfRes.ok || !cfData.success) {
      return new Response(
        JSON.stringify({
          error: "Cloudflare Stream upload failed",
          status: cfRes.status,
          details: cfData,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        video_id: cfData.result.uid,
        playback: cfData.result.playback,
        thumbnail: cfData.result.thumbnail,
        status: cfData.result.status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});