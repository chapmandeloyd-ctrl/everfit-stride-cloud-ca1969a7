import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const TZ_BASE = 'https://api.trainerize.com/v03';

async function tzPost(path: string, basic: string, body: unknown) {
  const res = await fetch(`${TZ_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, body: parsed };
}

function normalizeCalendarWorkouts(body: any) {
  const calendar = body?.calendar ?? body?.calendars ?? body?.days ?? [];
  if (!Array.isArray(calendar)) return [];

  const completedStatuses = new Set(['checkedin', 'checked_in', 'completed', 'complete', 'done', 'tracked']);
  const workoutLikeTypes = new Set([
    'workoutinterval', 'workoutregular', 'workout', 'cardio', 'cardioactivity', 'activity',
  ]);

  const rows: any[] = [];
  for (const day of calendar) {
    const date = day?.date ?? day?.startDate ?? day?.calendarDate ?? day?.day;
    const items = day?.items ?? day?.activities ?? day?.events ?? [];
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      const rawType = String(item?.type ?? item?.activityType ?? item?.itemType ?? '').toLowerCase();
      const rawStatus = String(item?.status ?? item?.state ?? item?.completionStatus ?? '').toLowerCase();
      const completed = completedStatuses.has(rawStatus) || item?.checkedIn === true || item?.isCompleted === true || item?.completed === true;
      const workoutLike = workoutLikeTypes.has(rawType) || rawType.includes('workout') || rawType.includes('cardio');
      if (!completed || !workoutLike) continue;
      const detail = item?.detail && typeof item.detail === 'object' ? item.detail : {};
      rows.push({
        id: String(item?.id ?? item?.itemID ?? item?.dailyWorkoutID ?? item?.workoutID ?? `${date}-${rawType}-${item?.name ?? ''}`),
        name: (item?.name ?? item?.title ?? item?.workoutName ?? item?.activityName ?? item?.cardioName ?? item?.displayName ?? rawType) || 'Completed activity',
        date: item?.date ?? item?.completedDate ?? item?.completedAt ?? item?.startTime ?? date,
        duration: item?.duration ?? item?.durationSeconds ?? item?.time ?? item?.actualDuration ?? detail.duration ?? detail.durationSeconds ?? detail.time ?? detail.timeSeconds,
        distance: item?.distance ?? item?.actualDistance ?? detail.distance ?? detail.actualDistance,
        distanceUnit: item?.distanceUnit ?? item?.unitDistance ?? detail.distanceUnit ?? detail.unitDistance,
        calories: item?.calories ?? item?.caloriesBurned ?? detail.calories ?? detail.caloriesBurned,
        steps: item?.steps ?? detail.steps,
        targetText: detail?.targetDetail?.text ?? item?.targetText ?? null,
        type: item?.type ?? item?.activityType,
        status: item?.status,
      });
    }
  }
  return rows;
}

function toDurationSeconds(d: any): number | null {
  if (d == null) return null;
  const n = Number(d);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Trainerize returns seconds already for most fields
  return Math.round(n);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const trainerId = claims.claims.sub as string;
    const { data: profile } = await userClient
      .from('profiles').select('role').eq('id', trainerId).maybeSingle();
    if (profile?.role !== 'trainer') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const groupId = Deno.env.get('TRAINERIZE_GROUP_ID');
    const apiToken = Deno.env.get('TRAINERIZE_API_TOKEN');
    if (!groupId || !apiToken) {
      return new Response(JSON.stringify({ error: 'Missing Trainerize credentials' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const basic = btoa(`${groupId}:${apiToken}`);

    // Service-role client used only for inserts into workout_sessions (bypass RLS)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const days = Math.max(1, Math.min(365, Number(body?.days ?? 90)));
    const specificClientId: string | null = body?.clientId ?? null;

    // Load linked clients (profiles.trainerize_user_id set), scoped to this trainer
    let clientQuery = admin
      .from('profiles')
      .select('id, full_name, email, trainerize_user_id')
      .not('trainerize_user_id', 'is', null);
    if (specificClientId) clientQuery = clientQuery.eq('id', specificClientId);
    const { data: clients, error: clientsErr } = await clientQuery;
    if (clientsErr) throw clientsErr;

    // Optionally restrict to trainer_clients
    const { data: myClientRows } = await admin
      .from('trainer_clients')
      .select('client_id')
      .eq('trainer_id', trainerId);
    const allowed = new Set((myClientRows ?? []).map((r: any) => r.client_id));
    const scoped = (clients ?? []).filter((c: any) => allowed.size === 0 || allowed.has(c.id));

    const today = new Date();
    const past = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    const toDate = today.toISOString().slice(0, 10);
    const fromDate = past.toISOString().slice(0, 10);

    const results: Array<{ clientId: string; name: string; fetched: number; imported: number; skipped: number; error?: string }> = [];

    for (const c of scoped) {
      const tzId = Number((c as any).trainerize_user_id);
      const clientId = (c as any).id as string;
      const name = (c as any).full_name || (c as any).email || 'Client';

      const r = await tzPost('/calendar/getList', basic, {
        userid: tzId, startDate: fromDate, endDate: toDate, unitDistance: 'mi', unitWeight: 'lb',
      });
      if (!r.ok) {
        results.push({ clientId, name, fetched: 0, imported: 0, skipped: 0, error: `HTTP ${r.status}` });
        continue;
      }
      const rows = normalizeCalendarWorkouts(r.body);

      let imported = 0, skipped = 0;
      for (const row of rows) {
        const startedAt = row.date ? new Date(row.date).toISOString() : new Date().toISOString();
        const duration = toDurationSeconds(row.duration);
        const completedAt = duration ? new Date(new Date(startedAt).getTime() + duration * 1000).toISOString() : startedAt;
        const externalId = `tz_${tzId}_${row.id}`;

        const { error: upErr } = await admin.from('workout_sessions').upsert({
          client_id: clientId,
          started_at: startedAt,
          completed_at: completedAt,
          duration_seconds: duration,
          status: 'completed',
          completion_percentage: 100,
          notes: row.targetText || null,
          source: 'trainerize',
          external_id: externalId,
          external_type: row.type ?? null,
          external_name: row.name,
          external_metadata: {
            distance: row.distance ?? null,
            distanceUnit: row.distanceUnit ?? null,
            calories: row.calories ?? null,
            steps: row.steps ?? null,
            trainerize_user_id: tzId,
          },
        }, { onConflict: 'source,external_id', ignoreDuplicates: false });

        if (upErr) { skipped++; console.error('upsert error', upErr); }
        else imported++;
      }

      results.push({ clientId, name, fetched: rows.length, imported, skipped });
    }

    const totals = results.reduce((acc, r) => ({
      fetched: acc.fetched + r.fetched, imported: acc.imported + r.imported, skipped: acc.skipped + r.skipped,
    }), { fetched: 0, imported: 0, skipped: 0 });

    return new Response(JSON.stringify({ ok: true, days, from: fromDate, to: toDate, totals, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('trainerize-import-activities error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});