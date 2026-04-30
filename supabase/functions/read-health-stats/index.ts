// @ts-nocheck — Deno edge function; not part of the app's TS build
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function that reads health_data and health_connections using the
 * service-role key, completely bypassing RLS.
 *
 * This solves the problem where a trainer impersonating a client on a native
 * device can write data (via sync-health-insert) but cannot **read** it
 * because the Supabase client carries the trainer's JWT and the "client can
 * view own" RLS policy requires auth.uid() = client_id.
 *
 * Query params (passed in JSON body):
 *   client_id  – required
 *   mode       – "stats" | "connections" | "data" | "metric_summary" (default: "stats")
 *   data_type  – optional filter for "data" mode
 *   days       – how far back to query (default: 7)
 */

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth: make sure the caller is logged in ──────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("No authorization header");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate the JWT cryptographically via getClaims (works even if the
    // local session row was rotated/expired on the auth server, as long as
    // the access token itself is still valid and not expired).
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await userClient.auth.getClaims(token);
    if (authError || !claimsData?.claims?.sub) {
      console.error("[read-health-stats] getClaims failed:", authError?.message);
      throw new Error("Unauthorized");
    }
    const user = { id: claimsData.claims.sub as string };

    // ── Parse body ───────────────────────────────────────────────────────
    const body = await req.json();
    const clientId: string = body.client_id;
    const mode: string = body.mode ?? "stats";
    const dataType: string | undefined = body.data_type;
    const days: number = body.days ?? 7;
    // Timezone offset in minutes (e.g. -330 for IST = UTC+5:30)
    const tzOffsetMin: number = body.tz_offset ?? 0;

    if (!clientId) throw new Error("Missing client_id");

    console.log(
      `[read-health-stats] caller=${user.id} client=${clientId} mode=${mode} days=${days} tz_offset=${tzOffsetMin}`
    );

    // ── Authorisation check ─────────────────────────────────────────────
    // Caller must be the client themselves OR an assigned trainer.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (user.id !== clientId) {
      const { data: assignment } = await admin
        .from("trainer_clients")
        .select("id")
        .eq("trainer_id", user.id)
        .eq("client_id", clientId)
        .maybeSingle();

      const { data: featureAssignment } = await admin
        .from("client_feature_settings")
        .select("id")
        .eq("trainer_id", user.id)
        .eq("client_id", clientId)
        .maybeSingle();

      if (!assignment && !featureAssignment) {
        console.error(
          "[read-health-stats] FORBIDDEN: user",
          user.id,
          "is not assigned to client",
          clientId
        );
        throw new Error("Not authorized for this client");
      }
    }

    console.log(
      `[read-health-stats] user=${user.id} client=${clientId} mode=${mode} days=${days}`
    );

    // ── Connections ─────────────────────────────────────────────────────
    if (mode === "connections") {
      const { data, error } = await admin
        .from("health_connections")
        .select("*")
        .eq("client_id", clientId);

      if (error) {
        console.error("[read-health-stats] connections query error:", error);
        throw error;
      }

      return json({ connections: data });
    }

    // ── Metric history (daily series for one named metric) ─────────────
    if (mode === "metric_history") {
      const metricName: string = body.metric_name;
      const historyDays: number = Number(body.days ?? 14);
      if (!metricName) throw new Error("Missing metric_name");

      const { data: def, error: defErr } = await admin
        .from("metric_definitions")
        .select("id, name, unit")
        .eq("name", metricName)
        .maybeSingle();
      if (defErr) throw defErr;
      if (!def) return json({ metric: metricName, unit: null, days: [] });

      const { data: cm, error: cmErr } = await admin
        .from("client_metrics")
        .select("id")
        .eq("client_id", clientId)
        .eq("metric_definition_id", def.id)
        .maybeSingle();
      if (cmErr) throw cmErr;
      if (!cm) return json({ metric: metricName, unit: def.unit, days: [] });

      const since = new Date();
      since.setUTCDate(since.getUTCDate() - historyDays);

      const { data: entries, error: entriesErr } = await admin
        .from("metric_entries")
        .select("value, recorded_at")
        .eq("client_id", clientId)
        .eq("client_metric_id", cm.id)
        .gte("recorded_at", since.toISOString())
        .order("recorded_at", { ascending: true });
      if (entriesErr) throw entriesErr;

      // Bucket per local day (using tz_offset). Use the latest entry per day
      // for cumulative metrics like Steps (HealthKit is upserted as daily total).
      const byDay = new Map<string, { value: number; recorded_at: string }>();
      for (const e of entries ?? []) {
        const localMs = new Date(e.recorded_at).getTime() + tzOffsetMin * 60_000;
        const dayKey = new Date(localMs).toISOString().slice(0, 10);
        const existing = byDay.get(dayKey);
        if (!existing || new Date(e.recorded_at) > new Date(existing.recorded_at)) {
          byDay.set(dayKey, { value: Number(e.value), recorded_at: e.recorded_at });
        }
      }

      const days = Array.from(byDay.entries())
        .map(([date, v]) => ({ date, value: v.value, recorded_at: v.recorded_at }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return json({ metric: metricName, unit: def.unit, days });
    }

    if (mode === "metric_summary") {
      const metricNames = ["Weight", "Steps", "Sleep", "Caloric Intake", "Caloric Burn"];

      const { data: defs, error: defsError } = await admin
        .from("metric_definitions")
        .select("id, name")
        .in("name", metricNames);

      if (defsError) {
        console.error("[read-health-stats] metric definitions query error:", defsError);
        throw defsError;
      }

      const defIds = (defs ?? []).map((def: any) => def.id);
      const defNameMap = Object.fromEntries((defs ?? []).map((def: any) => [def.id, def.name]));
      const metrics: Record<string, { value: number; date: string }> = {};

      if (defIds.length > 0) {
        const { data: clientMetrics, error: clientMetricsError } = await admin
          .from("client_metrics")
          .select("id, metric_definition_id")
          .eq("client_id", clientId)
          .in("metric_definition_id", defIds);

        if (clientMetricsError) {
          console.error("[read-health-stats] client metrics query error:", clientMetricsError);
          throw clientMetricsError;
        }

        for (const clientMetric of clientMetrics ?? []) {
          const { data: entry, error: entryError } = await admin
            .from("metric_entries")
            .select("value, recorded_at")
            .eq("client_id", clientId)
            .eq("client_metric_id", clientMetric.id)
            .order("recorded_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (entryError) {
            console.error("[read-health-stats] metric entry query error:", entryError);
            throw entryError;
          }

          const metricName = defNameMap[clientMetric.metric_definition_id];
          if (metricName && entry) {
            metrics[metricName] = {
              value: Number(entry.value),
              date: entry.recorded_at,
            };
          }
        }
      }

      const { data: workoutRows, error: workoutRowsError } = await admin
        .from("health_data")
        .select("value, unit, recorded_at")
        .eq("client_id", clientId)
        .eq("data_type", "workout")
        .order("recorded_at", { ascending: false })
        .limit(50);

      if (workoutRowsError) {
        console.error("[read-health-stats] workout rows query error:", workoutRowsError);
        throw workoutRowsError;
      }

      const latestSnapshotWorkout = (workoutRows ?? []).find((row: any) => row.unit === "count");

      const { count: workoutCountFallback, error: workoutsError } = await admin
        .from("client_workouts")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .not("completed_at", "is", null);

      if (workoutsError) {
        console.error("[read-health-stats] workout count query error:", workoutsError);
        throw workoutsError;
      }

      const workoutCount = latestSnapshotWorkout
        ? Math.max(0, Math.round(Number(latestSnapshotWorkout.value) || 0))
        : (workoutRows?.length || 0) > 0
          ? (workoutRows ?? []).length
          : (workoutCountFallback ?? 0);

      // ── Caloric Intake from KSOM-360 nutrition_logs (today, in client TZ) ──
      // Apple Health rarely has Dietary Energy populated, so the source of
      // truth for "calories consumed" is the in-app meal log.
      try {
        const nowMs = Date.now();
        const localNowMs = nowMs + tzOffsetMin * 60_000;
        const localMidnight = new Date(localNowMs);
        localMidnight.setUTCHours(0, 0, 0, 0);
        // Today's date in the client's local timezone, formatted YYYY-MM-DD
        const localDateStr = localMidnight.toISOString().slice(0, 10);

        const { data: mealRows, error: mealErr } = await admin
          .from("nutrition_logs")
          .select("calories, created_at")
          .eq("client_id", clientId)
          .eq("log_date", localDateStr);

        if (mealErr) {
          console.error("[read-health-stats] nutrition_logs query error:", mealErr);
        } else if ((mealRows ?? []).length > 0) {
          const totalIntake = (mealRows ?? []).reduce(
            (sum: number, row: any) => sum + (Number(row.calories) || 0),
            0
          );
          // Use the latest created_at as the snapshot date for the card
          const latestDate = (mealRows ?? [])
            .map((r: any) => r.created_at)
            .sort()
            .pop();
          metrics["Caloric Intake"] = {
            value: totalIntake,
            date: latestDate ?? new Date().toISOString(),
          };
        }
      } catch (err) {
        console.error("[read-health-stats] caloric intake calc failed:", err);
      }

      return json({
        metrics,
        workoutCount,
      });
    }

    // ── Raw data ────────────────────────────────────────────────────────
    const since = new Date();
    since.setDate(since.getDate() - days);

    if (mode === "data") {
      let query = admin
        .from("health_data")
        .select("*")
        .eq("client_id", clientId)
        .gte("recorded_at", since.toISOString())
        .order("recorded_at", { ascending: false });

      if (dataType) query = query.eq("data_type", dataType);

      const { data, error } = await query;
      if (error) {
        console.error("[read-health-stats] data query error:", error);
        throw error;
      }

      return json({ data, count: data?.length ?? 0 });
    }

    // ── Stats (default) ─────────────────────────────────────────────────
    // Compute "midnight local" using the client's timezone offset so that
    // "today's stats" match what the user sees on their device, not UTC.
    const nowMs = Date.now();
    const localNowMs = nowMs + tzOffsetMin * 60_000;
    const localMidnight = new Date(localNowMs);
    localMidnight.setUTCHours(0, 0, 0, 0);            // midnight in "local" day
    const todayISO = new Date(localMidnight.getTime() - tzOffsetMin * 60_000).toISOString();

    console.log(
      `[read-health-stats] stats: tz_offset=${tzOffsetMin} todayISO=${todayISO}`
    );

    const { data: todayData, error: todayErr } = await admin
      .from("health_data")
      .select("*")
      .eq("client_id", clientId)
      .gte("recorded_at", todayISO);

    if (todayErr) {
      console.error("[read-health-stats] stats query error:", todayErr);
      throw todayErr;
    }

    const rows = todayData ?? [];

    // Sum steps & calories across hour buckets.
    // Each DB row should hold the correct per-hour total after sync.
    // MAX within each hour handles legacy rows that weren't re-synced yet.
    function dedupeMaxPerHour(
      items: { value: number; recorded_at: string }[]
    ): number {
      const byHour = new Map<string, number>();
      for (const r of items) {
        const d = new Date(r.recorded_at);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
        byHour.set(key, Math.max(byHour.get(key) ?? 0, Number(r.value)));
      }
      return Array.from(byHour.values()).reduce((s, v) => s + v, 0);
    }

    const steps = rows.filter((d: any) => d.data_type === "steps");
    const hr = rows.filter((d: any) => d.data_type === "heart_rate");
    const rhr = rows.filter((d: any) => d.data_type === "resting_heart_rate");
    const active = rows.filter((d: any) => d.data_type === "active_minutes");
    const workouts = rows.filter((d: any) => d.data_type === "workout");

    const stats = {
      todaySteps: dedupeMaxPerHour(steps),
      todayCalories: getTotalCaloriesBurned(rows),
      avgHeartRate:
        hr.length > 0
          ? Math.round(
              hr.reduce((s: number, d: any) => s + Number(d.value), 0) /
                hr.length
            )
          : 0,
      restingHeartRate:
        rhr.length > 0 ? Math.round(Number(rhr[rhr.length - 1].value)) : 0,
      activeMinutes: active.reduce(
        (s: number, d: any) => s + Number(d.value),
        0
      ),
      workoutsCount: workouts.length,
    };

    // Also return row count for debugging
    const totalAllTime = await admin
      .from("health_data")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId);

    console.log(
      `[read-health-stats] today rows=${rows.length} allTime=${totalAllTime.count} stats=${JSON.stringify(stats)}`
    );

    return json({
      stats,
      todayRows: rows.length,
      allTimeCount: totalAllTime.count ?? 0,
    });
  } catch (error: any) {
    console.error("[read-health-stats] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
};

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

function getTotalCaloriesBurned(rows: Array<{ data_type: string; value: number; recorded_at: string }>): number {
  const activeEnergy = rows.filter((row) => row.data_type === "active_energy");
  const restingEnergy = rows.filter((row) => row.data_type === "resting_energy");

  if (activeEnergy.length > 0 || restingEnergy.length > 0) {
    return dedupeMaxPerHour(activeEnergy) + dedupeMaxPerHour(restingEnergy);
  }

  return dedupeMaxPerHour(rows.filter((row) => row.data_type === "calories_burned"));
}

function dedupeMaxPerHour(items: Array<{ value: number; recorded_at: string }>): number {
  const byHour = new Map<string, number>();
  for (const r of items) {
    const d = new Date(r.recorded_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
    byHour.set(key, Math.max(byHour.get(key) ?? 0, Number(r.value)));
  }
  return Array.from(byHour.values()).reduce((s, v) => s + v, 0);
}

serve(handler);
