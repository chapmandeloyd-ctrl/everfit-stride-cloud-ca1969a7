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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', claims.claims.sub).maybeSingle();
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

    const url = new URL(req.url);
    let action = url.searchParams.get('action') ?? 'roster';
    let userId: number | null = null;
    let planId: number | null = null;
    let workoutId: number | null = null;

    if (req.method === 'POST') {
      try {
        const b = await req.json();
        if (b?.action) action = b.action;
        if (b?.userId) userId = Number(b.userId);
        if (b?.planId) planId = Number(b.planId);
        if (b?.workoutId) workoutId = Number(b.workoutId);
      } catch { /* no body */ }
    }

    // 1) Roster (active clients)
    if (action === 'roster') {
      const all: Array<{ id: number; name: string; email: string | null }> = [];
      let start = 0;
      const count = 100;
      for (let i = 0; i < 20; i++) {
        const r = await tzPost('/user/getList', basic, { start, count, view: 'active' });
        if (!r.ok) return new Response(JSON.stringify({ ok: false, step: 'roster', ...r }), {
          status: r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        const users = (r.body as any)?.users ?? [];
        for (const u of users) {
          all.push({
            id: Number(u.id ?? u.userID ?? u.userId),
            name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || 'Unknown',
            email: u.email ?? null,
          });
        }
        if (users.length < count) break;
        start += count;
      }
      all.sort((a, b) => a.name.localeCompare(b.name));
      return new Response(JSON.stringify({ ok: true, users: all }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2) Training plans for a user
    if (action === 'plans') {
      if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      // Try multiple param/endpoint variants — Trainerize v03 shape varies by account
      const attempts = [
        { path: '/trainingPlan/getList', body: { userID: userId, start: 0, count: 100 } },
        { path: '/trainingPlan/getList', body: { userid: userId, start: 0, count: 100 } },
        { path: '/user/getTrainingPlans', body: { userID: userId } },
        { path: '/user/getTrainingPlans', body: { userid: userId } },
      ];
      const debug: any[] = [];
      for (const a of attempts) {
        const r = await tzPost(a.path, basic, a.body);
        debug.push({ path: a.path, body: a.body, status: r.status, sample: typeof r.body === 'object' ? Object.keys(r.body as any) : String(r.body).slice(0, 200) });
        const raw = (r.body as any)?.trainingPlans ?? (r.body as any)?.plans ?? (Array.isArray(r.body) ? r.body : null);
        if (r.ok && raw && raw.length > 0) {
          return new Response(JSON.stringify({ ok: true, body: r.body, debug }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      return new Response(JSON.stringify({ ok: true, body: { trainingPlans: [] }, debug }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3) Workouts inside a training plan
    if (action === 'workouts') {
      if (!userId || !planId) return new Response(JSON.stringify({ error: 'userId + planId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      const attempts = [
        { path: '/workout/getList', body: { userID: userId, trainingPlanID: planId, start: 0, count: 200 } },
        { path: '/workout/getList', body: { userid: userId, trainingPlanID: planId, start: 0, count: 200 } },
        { path: '/trainingPlan/getWorkouts', body: { trainingPlanID: planId } },
      ];
      const debug: any[] = [];
      for (const a of attempts) {
        const r = await tzPost(a.path, basic, a.body);
        debug.push({ path: a.path, status: r.status });
        const raw = (r.body as any)?.workouts ?? (Array.isArray(r.body) ? r.body : null);
        if (r.ok && raw && raw.length > 0) {
          return new Response(JSON.stringify({ ok: true, body: r.body, debug }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      return new Response(JSON.stringify({ ok: true, body: { workouts: [] }, debug }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4) Detailed workout (exercises, sets, reps)
    if (action === 'workoutDetail') {
      if (!workoutId) return new Response(JSON.stringify({ error: 'workoutId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      const attempts = [
        { path: '/workout/get', body: { id: workoutId } },
        { path: '/workout/get', body: { workoutID: workoutId } },
      ];
      for (const a of attempts) {
        const r = await tzPost(a.path, basic, a.body);
        if (r.ok) {
          return new Response(JSON.stringify({ ok: true, body: r.body }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      return new Response(JSON.stringify({ ok: false, body: { exercises: [] } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5) Completed / recent workout sessions for a user
    if (action === 'completed') {
      if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      const today = new Date();
      const past = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
      const toDate = today.toISOString().slice(0, 10);
      const fromDate = past.toISOString().slice(0, 10);
      const attempts = [
        { path: '/workoutStats/getList', body: { userid: userId, start: 0, count: 50, dateBegin: fromDate, dateEnd: toDate } },
        { path: '/workoutStats/getList', body: { userID: userId, start: 0, count: 50 } },
        { path: '/workout/getListForUser', body: { userid: userId, start: 0, count: 50 } },
        { path: '/user/getWorkoutHistory', body: { userid: userId, start: 0, count: 50 } },
        { path: '/activity/getList', body: { userid: userId, start: 0, count: 50, dateBegin: fromDate, dateEnd: toDate } },
        { path: '/activity/getList', body: { userID: userId, start: 0, count: 50 } },
        { path: '/bodyStats/getList', body: { userid: userId, start: 0, count: 50 } },
      ];
      const debug: any[] = [];
      for (const a of attempts) {
        const r = await tzPost(a.path, basic, a.body);
        const preview = typeof r.body === 'object' && r.body !== null
          ? { keys: Object.keys(r.body as any), sample: JSON.stringify(r.body).slice(0, 400) }
          : { raw: String(r.body).slice(0, 400) };
        debug.push({ path: a.path, body: a.body, status: r.status, ...preview });
        console.log('[completed attempt]', a.path, r.status, JSON.stringify(preview).slice(0, 600));
        const raw = (r.body as any)?.workouts
          ?? (r.body as any)?.activities
          ?? (r.body as any)?.completedWorkouts
          ?? (r.body as any)?.stats
          ?? (r.body as any)?.history
          ?? (Array.isArray(r.body) ? r.body : null);
        if (r.ok && raw && raw.length > 0) {
          return new Response(JSON.stringify({ ok: true, body: r.body, debug }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      return new Response(JSON.stringify({ ok: true, body: { workouts: [] }, debug }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('trainerize-browse-workouts error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});