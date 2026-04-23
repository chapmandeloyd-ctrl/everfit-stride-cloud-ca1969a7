// Migrates every portal video (portal_scenes + breathing_exercise_videos) from
// Supabase Storage to Cloudflare Stream. Idempotent — skips rows that already
// have a cloudflare_video_id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Row {
  id: string;
  url: string;
  table: "portal_scenes" | "breathing_exercise_videos";
  label: string;
}

async function uploadToCloudflare(
  sourceUrl: string,
  name: string,
  accountId: string,
  token: string,
): Promise<{ video_id: string } | { error: string }> {
  const fileRes = await fetch(sourceUrl);
  if (!fileRes.ok) {
    return { error: `Source fetch failed (${fileRes.status})` };
  }
  const blob = await fileRes.blob();
  const form = new FormData();
  form.append("file", blob, `${name}.mp4`);
  const cfRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form },
  );
  const data = await cfRes.json();
  if (!cfRes.ok || !data.success) {
    return { error: `Cloudflare upload failed: ${JSON.stringify(data.errors ?? data)}` };
  }
  return { video_id: data.result.uid };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const API_TOKEN = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ACCOUNT_ID || !API_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Cloudflare credentials missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: scenes, error: scenesErr } = await supabase
      .from("portal_scenes")
      .select("id, name, video_url")
      .is("cloudflare_video_id", null)
      .not("video_url", "is", null);
    if (scenesErr) throw scenesErr;

    const { data: bVideos, error: bvErr } = await supabase
      .from("breathing_exercise_videos")
      .select("id, exercise_id, video_url")
      .is("cloudflare_video_id", null);
    if (bvErr) throw bvErr;

    const rows: Row[] = [
      ...(scenes ?? []).filter((s) => s.video_url).map((s) => ({
        id: s.id,
        url: s.video_url as string,
        table: "portal_scenes" as const,
        label: s.name ?? s.id,
      })),
      ...(bVideos ?? []).filter((v) => v.video_url).map((v) => ({
        id: v.id,
        url: v.video_url as string,
        table: "breathing_exercise_videos" as const,
        label: v.exercise_id ?? v.id,
      })),
    ];

    const results: Array<Record<string, unknown>> = [];
    let migrated = 0;
    let failed = 0;

    for (const row of rows) {
      console.log(`[migrate] ${row.table}/${row.id} (${row.label})`);
      const out = await uploadToCloudflare(row.url, row.label, ACCOUNT_ID, API_TOKEN);
      if ("error" in out) {
        failed++;
        results.push({ id: row.id, table: row.table, ok: false, error: out.error });
        continue;
      }
      const { error: updErr } = await supabase
        .from(row.table)
        .update({ cloudflare_video_id: out.video_id })
        .eq("id", row.id);
      if (updErr) {
        failed++;
        results.push({ id: row.id, table: row.table, ok: false, error: updErr.message });
      } else {
        migrated++;
        results.push({ id: row.id, table: row.table, ok: true, video_id: out.video_id });
      }
    }

    return new Response(
      JSON.stringify({ success: true, total: rows.length, migrated, failed, results }),
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
