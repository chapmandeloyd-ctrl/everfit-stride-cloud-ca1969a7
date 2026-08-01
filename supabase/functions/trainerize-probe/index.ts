import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: claims } = await supabase.auth.getClaims(token);
    const role = (claims?.claims as Record<string, unknown> | undefined)?.role;
    let allowed = role === 'service_role';
    if (!allowed && claims?.claims?.sub) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', claims.claims.sub).maybeSingle();
      allowed = profile?.role === 'trainer';
    }
    if (!allowed) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const groupId = Deno.env.get('TRAINERIZE_GROUP_ID');
    const apiToken = Deno.env.get('TRAINERIZE_API_TOKEN');
    if (!groupId || !apiToken) return new Response(JSON.stringify({ error: 'Missing Trainerize credentials' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const basic = btoa(`${groupId}:${apiToken}`);

    const payload = await req.json().catch(() => ({}));
    const endpoints: { path: string; body: unknown }[] = payload.endpoints ?? [
      { path: 'form/getList', body: { start: 0, count: 20 } },
      { path: 'forms/getList', body: { start: 0, count: 20 } },
      { path: 'consultationForm/get', body: {} },
      { path: 'user/getConsultationForm', body: {} },
      { path: 'questionnaire/getList', body: { start: 0, count: 20 } },
      { path: 'assessment/getList', body: { start: 0, count: 20 } },
      { path: 'document/getList', body: { start: 0, count: 20 } },
    ];

    const results = [];
    for (const ep of endpoints) {
      const res = await fetch(`https://api.trainerize.com/v03/${ep.path}`, {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(ep.body ?? {}),
      });
      const text = await res.text();
      results.push({ path: ep.path, status: res.status, body: text.slice(0, 2000) });
    }
    return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('trainerize-probe error:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
