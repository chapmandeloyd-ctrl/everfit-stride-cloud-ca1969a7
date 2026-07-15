import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const TZ_BASE = 'https://api.trainerize.com/v03';

async function probe(path: string, basic: string, body: unknown) {
  const started = Date.now();
  try {
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
    return { path, status: res.status, ok: res.ok, ms: Date.now() - started, sample: typeof parsed === 'object' ? JSON.stringify(parsed).slice(0, 600) : String(parsed).slice(0, 600) };
  } catch (e) {
    return { path, status: 0, ok: false, ms: Date.now() - started, sample: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const groupId = Deno.env.get('TRAINERIZE_GROUP_ID')!;
  const apiToken = Deno.env.get('TRAINERIZE_API_TOKEN')!;
  const basic = btoa(`${groupId}:${apiToken}`);

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const userid = Number(body?.userid ?? 30280736); // Deloyd default

  const today = new Date();
  const past = new Date(today.getTime() - 30 * 86400000);
  const startDate = past.toISOString().slice(0, 10);
  const endDate = today.toISOString().slice(0, 10);

  const candidates: Array<[string, unknown]> = [
    ['/progressStats/getList', { userid, startDate, endDate }],
    ['/progressStat/getList', { userid, startDate, endDate }],
    ['/stat/getList', { userid, startDate, endDate }],
    ['/stats/getList', { userid, startDate, endDate }],
    ['/dailyStat/getList', { userid, startDate, endDate }],
    ['/dailyStats/getList', { userid, startDate, endDate }],
    ['/bodyStat/getList', { userid, startDate, endDate }],
    ['/nutritionEntry/getList', { userid, startDate, endDate }],
    ['/mealPlan/getList', { userid, startDate, endDate }],
    ['/food/getList', { userid, startDate, endDate }],
    ['/mealLog/get', { userid, date: endDate }],
    ['/dailyNutrition/getList', { userid, startDate, endDate }],
    ['/wearable/getList', { userid, startDate, endDate }],
    ['/activity/getList', { userid, startDate, endDate }],
    ['/step/getList', { userid, startDate, endDate }],
    ['/hr/getList', { userid, startDate, endDate }],
    ['/heartrate/getList', { userid, startDate, endDate }],
    ['/statistics/getList', { userid, startDate, endDate }],
    ['/user/getInfo', { userid }],
    ['/user/getProfile', { userid }],
  ];

  const results = await Promise.all(candidates.map(([p, b]) => probe(p, basic, b)));
  return new Response(JSON.stringify({ userid, results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});