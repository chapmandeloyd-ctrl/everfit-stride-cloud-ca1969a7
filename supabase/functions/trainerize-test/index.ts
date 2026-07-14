import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Restrict to trainer role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', claims.claims.sub)
      .maybeSingle();
    if (profile?.role !== 'trainer') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const groupId = Deno.env.get('TRAINERIZE_GROUP_ID');
    const apiToken = Deno.env.get('TRAINERIZE_API_TOKEN');
    if (!groupId || !apiToken) {
      return new Response(
        JSON.stringify({ error: 'Missing Trainerize credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const basic = btoa(`${groupId}:${apiToken}`);
    const started = Date.now();
    const tzRes = await fetch('https://api.trainerize.com/v03/user/getList', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ start: 0, count: 5, view: 'active' }),
    });
    const latencyMs = Date.now() - started;
    const text = await tzRes.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = text; }

    if (!tzRes.ok) {
      console.error(`Trainerize failed [${tzRes.status}]: ${text}`);
      return new Response(
        JSON.stringify({ ok: false, status: tzRes.status, latencyMs, body }),
        { status: tzRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, status: tzRes.status, latencyMs, groupId, body }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('trainerize-test error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});