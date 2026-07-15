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
    ['/bodyStats/getList (all)', { userid, count: 100, unitWeight: 'lb' }],
    ['/bodyStats/getList (yr)', { userid, startDate: '2025-01-01', endDate, unitWeight: 'lb' }],
    ['/measurement/getList', { userid, startDate, endDate }],
    ['/health/getList', { userid, startDate, endDate }],
    ['/health/get', { userid, date: endDate }],
    ['/tracker/getList', { userid, startDate, endDate }],
    ['/trackerData/getList', { userid, startDate, endDate }],
    ['/wearableData/getList', { userid, startDate, endDate }],
    ['/sleep/get', { userid, date: endDate }],
    ['/steps/get', { userid, date: endDate }],
    ['/dailyActivity/getList', { userid, startDate, endDate }],
    ['/dailyActivity/get', { userid, date: endDate }],
    ['/activityStats/getList', { userid, startDate, endDate }],
    ['/fitnessLog/getList', { userid, startDate, endDate }],
    ['/log/getList', { userid, startDate, endDate }],
    ['/goal/getList', { userid }],
    ['/goal/getListStats', { userid, startDate, endDate }],
    ['/checkin/getList', { userid, startDate, endDate }],
    ['/summary/getList', { userid, startDate, endDate }],
    ['/summary/get', { userid, date: endDate }],
    ['/dailySummary/getList', { userid, startDate, endDate }],
  ];
  // Map probe labels back to real paths
  const pathMap: Record<string, string> = {
    '/bodyStats/getList (all)': '/bodyStats/getList',
    '/bodyStats/getList (yr)': '/bodyStats/getList',
  };
  const _oldCandidates: Array<[string, unknown]> = [
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
  void _oldCandidates;

  const results = await Promise.all(candidates.map(([label, b]) => {
    const realPath = pathMap[label] ?? label;
    return probe(realPath, basic, b).then(r => ({ ...r, label }));
  }));
  return new Response(JSON.stringify({ userid, results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});