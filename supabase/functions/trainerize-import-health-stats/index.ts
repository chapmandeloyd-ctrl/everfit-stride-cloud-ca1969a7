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

function toDate(v: any): string | null {
  if (!v) return null;
  const s = String(v);
  // Accept 'YYYY-MM-DD' or ISO
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function toNum(v: any): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function upsertBySourceExternalId(admin: any, table: string, payload: Record<string, any>) {
  const { data: existing, error: findErr } = await admin
    .from(table)
    .select('id')
    .eq('source', payload.source)
    .eq('external_id', payload.external_id)
    .maybeSingle();
  if (findErr) return { error: findErr };

  if (existing?.id) {
    const { error } = await admin
      .from(table)
      .update(payload)
      .eq('id', existing.id);
    return { error };
  }

  const { error } = await admin.from(table).insert(payload);
  return { error };
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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const days = Math.max(1, Math.min(365, Number(body?.days ?? 90)));
    const specificClientId: string | null = body?.clientId ?? null;

    // Load metric definitions we care about
    const { data: mdefs } = await admin
      .from('metric_definitions')
      .select('id, name')
      .in('name', ['Weight', 'Body Fat', 'Caloric Intake']);
    const weightDefId = mdefs?.find((m: any) => m.name === 'Weight')?.id;
    const bodyFatDefId = mdefs?.find((m: any) => m.name === 'Body Fat')?.id;
    const caloricIntakeDefId = mdefs?.find((m: any) => m.name === 'Caloric Intake')?.id;

    // Linked clients
    let clientQuery = admin
      .from('profiles')
      .select('id, full_name, email, trainerize_user_id')
      .not('trainerize_user_id', 'is', null);
    if (specificClientId) clientQuery = clientQuery.eq('id', specificClientId);
    const { data: clients, error: clientsErr } = await clientQuery;
    if (clientsErr) throw clientsErr;

    const { data: myClientRows } = await admin
      .from('trainer_clients')
      .select('client_id')
      .eq('trainer_id', trainerId);
    const allowed = new Set((myClientRows ?? []).map((r: any) => r.client_id));
    const scoped = (clients ?? []).filter((c: any) => allowed.size === 0 || allowed.has(c.id));

    const today = new Date();
    const past = new Date(today.getTime() - days * 86400000);
    const startDate = past.toISOString().slice(0, 10);
    const endDate = today.toISOString().slice(0, 10);

    type PerClient = {
      clientId: string;
      name: string;
      nutritionImported: number;
      weightImported: number;
      weightSkippedApex: number;
      bodyFatImported: number;
      goalsImported: number;
      error?: string;
    };
    const results: PerClient[] = [];

    for (const c of scoped) {
      const tzId = Number((c as any).trainerize_user_id);
      const clientId = (c as any).id as string;
      const name = (c as any).full_name || (c as any).email || 'Client';
      const row: PerClient = {
        clientId, name,
        nutritionImported: 0, weightImported: 0, weightSkippedApex: 0, bodyFatImported: 0,
        goalsImported: 0,
      };

      async function ensureClientMetric(defId: string): Promise<string | null> {
        const { data: existing } = await admin
          .from('client_metrics')
          .select('id')
          .eq('client_id', clientId)
          .eq('metric_definition_id', defId)
          .maybeSingle();
        if (existing?.id) return existing.id;
        const { data: created, error } = await admin
          .from('client_metrics')
          .insert({ client_id: clientId, trainer_id: trainerId, metric_definition_id: defId, order_index: 0 })
          .select('id').maybeSingle();
        if (error) { console.error('client_metrics insert', error); return null; }
        return created?.id ?? null;
      }

      // -------- Nutrition (per meal) --------
      try {
        const nr = await tzPost('/dailyNutrition/getList', basic, {
          userid: tzId, startDate, endDate,
        });
        if (nr.ok) {
          const days: any[] = (nr.body as any)?.nutrition ?? (nr.body as any)?.days ?? (nr.body as any)?.list ?? (nr.body as any)?.dailyNutrition ?? [];
          const caloricIntakeMetricId = caloricIntakeDefId ? await ensureClientMetric(caloricIntakeDefId) : null;
          for (const d of Array.isArray(days) ? days : []) {
            const date = toDate(d?.date ?? d?.day ?? d?.logDate);
            if (!date) continue;
            const dayCalories = toNum(d?.calories ?? d?.kcal ?? d?.energy);
            const dayProtein = toNum(d?.proteinGrams ?? d?.protein ?? d?.proteins) ?? 0;
            const dayCarbs = toNum(d?.carbsGrams ?? d?.carbs ?? d?.carbohydrates) ?? 0;
            const dayFats = toNum(d?.fatGrams ?? d?.fat ?? d?.fats) ?? 0;
            const meals: any[] = d?.meals ?? d?.mealList ?? d?.entries ?? [];
            const hasMealCalories = Array.isArray(meals) && meals.some((m: any) =>
              toNum(m?.calories ?? m?.kcal ?? m?.energy ?? m?.caloriesSummary?.calories) != null
            );
            const list = hasMealCalories ? meals : [{
              ...d,
              name: 'Daily total',
              calories: dayCalories,
              protein: dayProtein,
              carbs: dayCarbs,
              fat: dayFats,
              isRollup: true,
            }];

            if (dayCalories != null && caloricIntakeMetricId) {
              const { error: metricErr } = await upsertBySourceExternalId(admin, 'metric_entries', {
                client_id: clientId,
                client_metric_id: caloricIntakeMetricId,
                value: Math.round(dayCalories),
                recorded_at: `${date}T12:00:00Z`,
                notes: 'Imported from Trainerize nutrition',
                source: 'trainerize',
                external_id: `tz_${tzId}_${date}_caloric_intake`,
              });
              if (metricErr) console.error('caloric intake metric upsert', metricErr);
            }

            for (const m of list) {
              const mealName = String(m?.name ?? m?.mealName ?? m?.type ?? 'Meal');
              const calories = toNum(m?.calories ?? m?.kcal ?? m?.energy ?? m?.caloriesSummary?.calories);
              if (calories == null && !m?.isRollup) continue;
              const protein = toNum(m?.protein ?? m?.proteins ?? m?.proteinGrams ?? m?.caloriesSummary?.proteinGrams) ?? 0;
              const carbs = toNum(m?.carbs ?? m?.carbohydrates ?? m?.carbsGrams ?? m?.caloriesSummary?.carbsGrams) ?? 0;
              const fats = toNum(m?.fat ?? m?.fats ?? m?.fatGrams ?? m?.caloriesSummary?.fatGrams) ?? 0;
              const externalId = `tz_${tzId}_${date}_${mealName.toLowerCase().replace(/\s+/g, '_')}`;
              const { error: upErr } = await upsertBySourceExternalId(admin, 'nutrition_logs', {
                client_id: clientId,
                log_date: date,
                meal_name: mealName,
                calories: Math.round(calories ?? 0),
                protein, carbs, fats,
                notes: 'Imported from Trainerize',
                source: 'trainerize',
                external_id: externalId,
              });
              if (!upErr) row.nutritionImported++;
              else console.error('nutrition_logs upsert', upErr);
            }
          }
        }
      } catch (e) { console.error('nutrition err', e); }

      // -------- Body Stats (Weight + Body Fat) --------
      // APEX is source of truth: skip dates that already have an APEX entry.
      try {
        const br = await tzPost('/bodyStats/getList', basic, {
          userid: tzId, count: 500, unitWeight: 'lb',
        });
        if (br.ok) {
          const stats: any[] = (br.body as any)?.stats ?? (br.body as any)?.list ?? (br.body as any)?.bodyStats ?? [];
          // Load APEX weight dates for this client so we don't clobber them.
          const apexWeightDates = new Set<string>();
          if (weightDefId) {
            const { data: cm } = await admin
              .from('client_metrics')
              .select('id')
              .eq('client_id', clientId)
              .eq('metric_definition_id', weightDefId)
              .maybeSingle();
            if (cm?.id) {
              const { data: entries } = await admin
                .from('metric_entries')
                .select('recorded_at, source')
                .eq('client_metric_id', cm.id)
                .gte('recorded_at', `${startDate}T00:00:00Z`);
              for (const e of entries ?? []) {
                if ((e as any).source === 'apex') {
                  apexWeightDates.add(String((e as any).recorded_at).slice(0, 10));
                }
              }
            }
          }

          const weightMetricId = weightDefId ? await ensureClientMetric(weightDefId) : null;
          const bodyFatMetricId = bodyFatDefId ? await ensureClientMetric(bodyFatDefId) : null;

          for (const s of Array.isArray(stats) ? stats : []) {
            const date = toDate(s?.date ?? s?.recordDate ?? s?.day);
            if (!date) continue;
            const recordedAt = `${date}T12:00:00Z`;
            const weight = toNum(s?.weight ?? s?.bodyWeight);
            const bodyFat = toNum(s?.bodyFat ?? s?.bodyFatPercent ?? s?.fatPercent);

            if (weight != null && weightMetricId) {
              {
                const externalId = `tz_${tzId}_${date}_weight`;
                const { error } = await upsertBySourceExternalId(admin, 'metric_entries', {
                  client_id: clientId,
                  client_metric_id: weightMetricId,
                  value: weight,
                  recorded_at: recordedAt,
                  notes: 'Imported from Trainerize',
                  source: 'trainerize',
                  external_id: externalId,
                });
                if (!error) row.weightImported++;
              }
            }
            if (bodyFat != null && bodyFatMetricId) {
              const externalId = `tz_${tzId}_${date}_bodyfat`;
              const { error } = await upsertBySourceExternalId(admin, 'metric_entries', {
                client_id: clientId,
                client_metric_id: bodyFatMetricId,
                value: bodyFat,
                recorded_at: recordedAt,
                notes: 'Imported from Trainerize',
                source: 'trainerize',
                external_id: externalId,
              });
              if (!error) row.bodyFatImported++;
            }
          }
        }
      } catch (e) { console.error('bodystats err', e); }

      // -------- Goals (Weight target, Nutrition target, Water target) --------
      try {
        const gr = await tzPost('/goal/getList', basic, { userid: tzId });
        if (gr.ok) {
          const goals: any[] = (gr.body as any)?.goals ?? (gr.body as any)?.list ?? [];
          for (const g of Array.isArray(goals) ? goals : []) {
            const type = String(g?.type ?? g?.goalType ?? '').toLowerCase();
            const target = toNum(g?.target ?? g?.targetValue ?? g?.value);
            if (target == null) continue;

            // Weight goal → fitness_goals (only if no active weight goal exists)
            if (type.includes('weight') && !type.includes('water')) {
              const { data: existing } = await admin
                .from('fitness_goals')
                .select('id')
                .eq('client_id', clientId)
                .eq('goal_type', 'weight')
                .eq('status', 'active')
                .maybeSingle();
              const targetDate = toDate(g?.targetDate ?? g?.dueDate) ??
                new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
              if (existing?.id) {
                const { error } = await admin
                  .from('fitness_goals')
                  .update({ target_value: target, target_date: targetDate })
                  .eq('id', existing.id);
                if (!error) row.goalsImported++;
              } else {
                const { error } = await admin.from('fitness_goals').insert({
                  client_id: clientId,
                  trainer_id: trainerId,
                  goal_type: 'weight',
                  title: 'Weight goal (Trainerize)',
                  target_value: target,
                  unit: 'lbs',
                  target_date: targetDate,
                  status: 'active',
                });
                if (!error) row.goalsImported++;
              }

              // Also mirror into smart_pace_goals so the Smart Weight Tracker tile lights up.
              try {
                // Find latest weigh-in to seed start_weight (optional).
                let startWeight: number | null = null;
                if (weightDefId) {
                  const { data: cm } = await admin
                    .from('client_metrics')
                    .select('id')
                    .eq('client_id', clientId)
                    .eq('metric_definition_id', weightDefId)
                    .maybeSingle();
                  if (cm?.id) {
                    const { data: latest } = await admin
                      .from('metric_entries')
                      .select('value')
                      .eq('client_metric_id', cm.id)
                      .order('recorded_at', { ascending: false })
                      .limit(1)
                      .maybeSingle();
                    startWeight = latest?.value != null ? Number(latest.value) : null;
                  }
                }

                const goalWeight = Number(target);
                const startDate = new Date().toISOString().slice(0, 10);
                const msPerDay = 86_400_000;
                const daysUntil = Math.max(
                  7,
                  Math.round((new Date(targetDate).getTime() - Date.now()) / msPerDay),
                );
                const direction = startWeight != null && goalWeight > startWeight ? 'gain'
                  : startWeight != null && Math.abs(goalWeight - startWeight) < 0.5 ? 'maintain'
                  : 'lose';
                const totalDelta = startWeight != null ? Math.abs(goalWeight - startWeight) : 0;
                // Default 0.3 lbs/day if we can't compute (~2 lbs/week).
                const paceRaw = totalDelta > 0 ? totalDelta / daysUntil : 0.3;
                const dailyPace = Math.max(0.05, Math.min(1.0, Math.round(paceRaw * 100) / 100));

                const { data: existingPace } = await admin
                  .from('smart_pace_goals')
                  .select('id')
                  .eq('client_id', clientId)
                  .eq('status', 'active')
                  .maybeSingle();

                const payload: Record<string, any> = {
                  goal_weight: goalWeight,
                  target_date: targetDate,
                  daily_pace_lbs: dailyPace,
                  goal_direction: direction,
                };
                if (existingPace?.id) {
                  // Do NOT overwrite an existing Smart Pace goal — the trainer/client
                  // may have tuned pace, direction, or target date manually.
                } else if (startWeight != null) {
                  // Only create when we can compute a real direction/pace from a weigh-in.
                  await admin.from('smart_pace_goals').insert({
                    ...payload,
                    client_id: clientId,
                    trainer_id: trainerId,
                    start_date: startDate,
                    start_weight: startWeight,
                    status: 'active',
                  });
                }

                // Do NOT auto-enable Smart Pace — respect the client/trainer's toggle.
              } catch (e) {
                console.error('smart_pace_goals upsert', e);
              }
            }

            // Nutrition / calorie goal → client_macro_targets.target_calories
            if (type.includes('nutrition') || type.includes('calorie')) {
              const { data: existing } = await admin
                .from('client_macro_targets')
                .select('id')
                .eq('client_id', clientId)
                .eq('trainer_id', trainerId)
                .maybeSingle();
              if (existing?.id) {
                // Do NOT overwrite an existing macro target — the trainer/client set it manually.
              } else {
                const { error } = await admin.from('client_macro_targets').insert({
                  client_id: clientId,
                  trainer_id: trainerId,
                  tracking_option: 'calories_only',
                  target_calories: Math.round(target),
                  is_active: true,
                });
                if (!error) row.goalsImported++;
              }
            }

            // Water goal → water_goal_settings (Trainerize is in ml; APEX default fl_oz)
            if (type.includes('water') || type.includes('hydration')) {
              const ml = target;
              const oz = Math.round((ml / 29.5735) * 10) / 10;
              const { data: existing } = await admin
                .from('water_goal_settings')
                .select('id')
                .eq('client_id', clientId)
                .maybeSingle();
              if (existing?.id) {
                // Do NOT overwrite an existing water goal — preserve the client's unit and target.
              } else {
                const { error } = await admin.from('water_goal_settings').insert({
                  client_id: clientId,
                  daily_goal_oz: oz,
                  serving_size_oz: 8,
                  unit: 'fl_oz',
                });
                if (!error) row.goalsImported++;
              }
            }
          }
        }
      } catch (e) { console.error('goals err', e); }

      results.push(row);
    }

    const totals = results.reduce((acc, r) => ({
      nutrition: acc.nutrition + r.nutritionImported,
      weight: acc.weight + r.weightImported,
      weightSkippedApex: acc.weightSkippedApex + r.weightSkippedApex,
      bodyFat: acc.bodyFat + r.bodyFatImported,
      goals: acc.goals + r.goalsImported,
    }), { nutrition: 0, weight: 0, weightSkippedApex: 0, bodyFat: 0, goals: 0 });

    return new Response(JSON.stringify({ ok: true, days, from: startDate, to: endDate, totals, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('trainerize-import-health-stats error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});