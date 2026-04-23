// Batched migration of exercise videos (and other workout video tables) from
// Supabase Storage → Cloudflare Stream. Designed to be invoked every minute by
// pg_cron. Each invocation processes a small batch so it stays well under the
// edge-function timeout, even when pulling large MP4s from Supabase first.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 8; // 8 videos per run × 1 run/min ≈ 800 in ~100 min

interface ExerciseRow {
  id: string;
  name: string | null;
  video_url: string;
}

async function uploadToCloudflare(
  sourceUrl: string,
  name: string,
  accountId: string,
  token: string,
): Promise<{ video_id: string } | { error: string }> {
  // Skip if it's already a Cloudflare URL or a YouTube link — nothing to do.
  if (
    sourceUrl.includes("cloudflarestream.com") ||
    sourceUrl.includes("youtube.com") ||
    sourceUrl.includes("youtu.be")
  ) {
    return { error: "skip:not_storage" };
  }

  const fileRes = await fetch(sourceUrl);
  if (!fileRes.ok) return { error: `Source fetch failed (${fileRes.status})` };
  const blob = await fileRes.blob();

  const form = new FormData();
  form.append("file", blob, `${name}.mp4`);

  const cfRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form },
  );
  const data = await cfRes.json();
  if (!cfRes.ok || !data.success) {
    return { error: `Cloudflare upload failed: ${JSON.stringify(data.errors ?? data).slice(0, 300)}` };
  }
  return { video_id: data.result.uid };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();
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

    // Pick the next batch of pending exercises. Restrict to rows that have a
    // Supabase-hosted video so we don't waste cycles on YouTube links etc.
    const { data: rows, error: pickErr } = await supabase
      .from("exercises")
      .select("id, name, video_url")
      .is("cloudflare_video_id", null)
      .eq("cloudflare_migration_status", "pending")
      .not("video_url", "is", null)
      .limit(BATCH_SIZE);
    if (pickErr) throw pickErr;

    const batch = (rows ?? []) as ExerciseRow[];

    if (batch.length === 0) {
      return new Response(
        JSON.stringify({ success: true, drained: true, processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mark them as in-flight so concurrent runs don't double-process.
    await supabase
      .from("exercises")
      .update({ cloudflare_migration_status: "migrating" })
      .in("id", batch.map((r) => r.id));

    const results: Array<Record<string, unknown>> = [];
    let migrated = 0;
    let failed = 0;
    let skipped = 0;

    for (const row of batch) {
      const safeName = (row.name ?? row.id).slice(0, 80).replace(/[^a-zA-Z0-9_-]+/g, "_");
      const out = await uploadToCloudflare(row.video_url, safeName, ACCOUNT_ID, API_TOKEN);

      if ("error" in out) {
        const isSkip = out.error === "skip:not_storage";
        await supabase
          .from("exercises")
          .update({
            cloudflare_migration_status: isSkip ? "not_applicable" : "failed",
            cloudflare_migration_error: isSkip ? null : out.error.slice(0, 500),
          })
          .eq("id", row.id);
        if (isSkip) skipped++;
        else failed++;
        results.push({ id: row.id, ok: false, ...(isSkip ? { skipped: true } : { error: out.error }) });
        continue;
      }

      const { error: updErr } = await supabase
        .from("exercises")
        .update({
          cloudflare_video_id: out.video_id,
          cloudflare_migration_status: "done",
          cloudflare_migrated_at: new Date().toISOString(),
          cloudflare_migration_error: null,
        })
        .eq("id", row.id);

      if (updErr) {
        failed++;
        results.push({ id: row.id, ok: false, error: updErr.message });
      } else {
        migrated++;
        results.push({ id: row.id, ok: true, video_id: out.video_id });
      }
    }

    // Quick remaining count for progress visibility.
    const { count: remaining } = await supabase
      .from("exercises")
      .select("id", { count: "exact", head: true })
      .is("cloudflare_video_id", null)
      .eq("cloudflare_migration_status", "pending");

    return new Response(
      JSON.stringify({
        success: true,
        processed: batch.length,
        migrated,
        failed,
        skipped,
        remaining,
        elapsed_ms: Date.now() - startedAt,
        results,
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