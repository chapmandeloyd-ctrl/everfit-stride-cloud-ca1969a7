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
      const r = await tzPost('/trainingPlan/getList', basic, { userid: userId });
      return new Response(JSON.stringify({ ok: r.ok, status: r.status, body: r.body }), {
        status: r.ok ? 200 : r.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3) Workouts inside a training plan
    if (action === 'workouts') {
      if (!userId || !planId) return new Response(JSON.stringify({ error: 'userId + planId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      const r = await tzPost('/workout/getList', basic, { userid: userId, trainingPlanID: planId });
      return new Response(JSON.stringify({ ok: r.ok, status: r.status, body: r.body }), {
        status: r.ok ? 200 : r.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4) Detailed workout (exercises, sets, reps)
    if (action === 'workoutDetail') {
      if (!workoutId) return new Response(JSON.stringify({ error: 'workoutId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      const r = await tzPost('/workout/get', basic, { id: workoutId });
      return new Response(JSON.stringify({ ok: r.ok, status: r.status, body: r.body }), {
        status: r.ok ? 200 : r.status,
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