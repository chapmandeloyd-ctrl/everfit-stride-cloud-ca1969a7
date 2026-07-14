import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface TzUser {
  id: number;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  email?: string;
  status?: string;
}

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
      return new Response(JSON.stringify({ error: 'Missing Trainerize credentials' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const basic = btoa(`${groupId}:${apiToken}`);

    // Paginate Trainerize user list
    const tzUsers: TzUser[] = [];
    let start = 0;
    const pageSize = 100;
    for (let i = 0; i < 20; i++) {
      const res = await fetch('https://api.trainerize.com/v03/user/getList', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ start, count: pageSize, view: 'active' }),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error(`Trainerize getList failed [${res.status}]: ${text}`);
        return new Response(
          JSON.stringify({ error: 'Trainerize request failed', status: res.status, details: text }),
          { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const json = JSON.parse(text) as { users?: TzUser[] };
      const batch = json.users ?? [];
      tzUsers.push(...batch);
      if (batch.length < pageSize) break;
      start += pageSize;
    }

    // Admin client for cross-user profile updates
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: existingProfiles, error: profErr } = await admin
      .from('profiles')
      .select('id, email, trainerize_user_id, full_name')
      .eq('role', 'client');
    if (profErr) throw profErr;

    const byEmail = new Map<string, { id: string; trainerize_user_id: number | null }>();
    const byTzId = new Set<number>();
    for (const p of existingProfiles ?? []) {
      if (p.email) byEmail.set(p.email.toLowerCase().trim(), { id: p.id, trainerize_user_id: p.trainerize_user_id });
      if (p.trainerize_user_id) byTzId.add(p.trainerize_user_id);
    }

    let linked = 0;
    let alreadySynced = 0;
    const newClients: Array<{ trainerize_user_id: number; name: string; email: string | null }> = [];

    for (const u of tzUsers) {
      const email = (u.emailAddress ?? u.email ?? '').toLowerCase().trim();
      const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || email || `Trainerize #${u.id}`;

      if (byTzId.has(u.id)) { alreadySynced++; continue; }

      if (email && byEmail.has(email)) {
        const match = byEmail.get(email)!;
        if (match.trainerize_user_id === u.id) { alreadySynced++; continue; }
        const { error: updErr } = await admin
          .from('profiles')
          .update({ trainerize_user_id: u.id })
          .eq('id', match.id)
          .is('trainerize_user_id', null);
        if (!updErr) linked++;
        continue;
      }

      newClients.push({ trainerize_user_id: u.id, name, email: email || null });
    }

    return new Response(JSON.stringify({
      ok: true,
      totalTrainerize: tzUsers.length,
      linked,
      alreadySynced,
      newCount: newClients.length,
      newClients,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('trainerize-sync-clients error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});