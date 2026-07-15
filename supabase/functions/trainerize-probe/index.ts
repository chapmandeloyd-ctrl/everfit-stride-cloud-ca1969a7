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
    ['/bodyStats/getList (no unit)', { userid, count: 100 }],
    ['/bodyStats/getList (kg)', { userid, count: 100, unitWeight: 'kg' }],
    ['/bodyStats/getList (weight only)', { userid, count: 100, unitWeight: 'lb', types: ['weight'] }],
    ['/bodyStats/getList (bodyFat only)', { userid, count: 100, unitWeight: 'lb', types: ['bodyFat'] }],
    ['/bodyStats/getList (type=weight)', { userid, count: 100, unitWeight: 'lb', type: 'weight' }],
    ['/bodyStats/getList (all fields)', { userid, count: 100, unitWeight: 'lb', unitLength: 'in', includeDeleted: true, source: 'all' }],
    ['/bodyStats/getList (dates full ISO)', { userid, count: 100, unitWeight: 'lb', startDate: '2020-01-01T00:00:00', endDate: '2027-01-01T00:00:00' }],
    ['/bodyStats/getList (sortAsc)', { userid, count: 500, unitWeight: 'lb', sort: 'dateAsc' }],
    ['/user/getContact', { userid }],
    ['/user/getStats', { userid }],
    ['/user/getUserSummary', { userid }],
    ['/user/getFullProfile', { userid }],
    ['/user/getBodyStats', { userid, unitWeight: 'lb' }],
    ['/reportBodyStats/getList', { userid, count: 100, unitWeight: 'lb' }],
    ['/report/getBodyStats', { userid, unitWeight: 'lb' }],
    ['/bodyStats/getListSummary', { userid, unitWeight: 'lb' }],
    ['/bodyStats/getGraph', { userid, startDate: '2025-01-01', endDate, unitWeight: 'lb' }],
    ['/bodyStats/getList (yr)', { userid, startDate: '2025-01-01', endDate, unitWeight: 'lb' }],
    ['/bodyStats/getList (types)', { userid, count: 100, unitWeight: 'lb', types: ['weight','bodyFat','measurements'] }],
    ['/bodyStats/getList (start2020)', { userid, startDate: '2020-01-01', endDate, unitWeight: 'lb' }],
    ['/bodyMeasurement/getList', { userid, startDate: '2025-01-01', endDate }],
    ['/clientMeasurement/getList', { userid, startDate: '2025-01-01', endDate }],
    ['/weight/getList', { userid, startDate: '2025-01-01', endDate, unitWeight: 'lb' }],
    ['/weight/get', { userid, date: endDate, unitWeight: 'lb' }],
    ['/bodyWeight/getList', { userid, startDate: '2025-01-01', endDate, unitWeight: 'lb' }],
    ['/bodyweight/getList', { userid, startDate: '2025-01-01', endDate, unitWeight: 'lb' }],
    ['/bodyFat/getList', { userid, startDate: '2025-01-01', endDate }],
    ['/user/get', { userid }],
    ['/user/getProfile', { userid }],
    ['/user/getStats', { userid }],
    ['/client/get', { userid }],
    ['/checkIn/getList', { userid, startDate: '2025-01-01', endDate }],
    ['/progressPhoto/getList', { userid, startDate: '2025-01-01', endDate }],
    ['/bodyStat/getList', { userid, startDate: '2025-01-01', endDate, unitWeight: 'lb' }],
    ['/bodyStats/get', { userid, date: endDate, unitWeight: 'lb' }],
    ['/progress/getList', { userid, startDate: '2025-01-01', endDate, unitWeight: 'lb' }],
    ['/progressStats/getList', { userid, startDate: '2025-01-01', endDate, unitWeight: 'lb' }],
    ['/progressStat/getList', { userid, startDate: '2025-01-01', endDate, unitWeight: 'lb' }],
    ['/stat/getList', { userid, startDate: '2025-01-01', endDate, unitWeight: 'lb' }],
    ['/stats/getList', { userid, startDate: '2025-01-01', endDate, unitWeight: 'lb' }],
    ['/measurement/getList', { userid, startDate, endDate }],
    ['/measurement/getList (yr)', { userid, startDate: '2025-01-01', endDate }],
    ['/dailyNutrition/getList', { userid, startDate: '2025-01-01', endDate }],
    ['/dailyNutrition/get', { userid, date: endDate }],
    ['/nutritionEntry/getList', { userid, startDate: '2025-01-01', endDate }],
    ['/mealLog/getList', { userid, startDate: '2025-01-01', endDate }],
    ['/mealLog/get', { userid, date: endDate }],
    ['/food/getList', { userid, startDate: '2025-01-01', endDate }],
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
  const results = await Promise.all(candidates.map(([label, b]) => {
    // Strip any " (...)" suffix from labels to get the real path
    const realPath = label.replace(/\s*\(.*\)$/, '');
    return probe(realPath, basic, b).then(r => ({ ...r, label }));
  }));
  return new Response(JSON.stringify({ userid, results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});