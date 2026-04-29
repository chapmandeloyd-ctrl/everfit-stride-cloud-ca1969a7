import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Map AI-extracted data types to our metric_definition names
const DATA_TYPE_TO_METRIC: Record<string, string> = {
  steps: 'Steps',
  calories_burned: 'Caloric Burn',
  active_energy: 'Caloric Burn',
  resting_energy: 'Caloric Burn',
  sleep: 'Sleep',
  weight: 'Weight',
  caloric_intake: 'Caloric Intake',
  dietary_energy: 'Caloric Intake',
  food_energy: 'Caloric Intake',
};

const APPLE_HEALTH_LABEL_RULES: Array<{ pattern: RegExp; dataType: string }> = [
  { pattern: /active\s+energy|active\s+calories|move/i, dataType: 'active_energy' },
  { pattern: /resting\s+energy|basal\s+energy|basal\s+energy\s+burned/i, dataType: 'resting_energy' },
  { pattern: /dietary\s+energy|food\s+energy|calories\s+eaten|calories\s+consumed|energy\s+consumed/i, dataType: 'dietary_energy' },
  { pattern: /calories\s+burned|energy\s+burned|total\s+energy/i, dataType: 'calories_burned' },
  { pattern: /workouts?/i, dataType: 'workout' },
  { pattern: /steps?/i, dataType: 'steps' },
  { pattern: /sleep/i, dataType: 'sleep' },
  { pattern: /weight/i, dataType: 'weight' },
];

function normalizeMetric(metric: { data_type: string; value: number; unit: string; label: string }) {
  const label = metric.label?.trim() || '';
  const override = APPLE_HEALTH_LABEL_RULES.find((rule) => rule.pattern.test(label));

  return {
    ...metric,
    data_type: override?.dataType || metric.data_type,
    label,
  };
}

function buildWorkoutHealthRow(
  workoutCount: number,
  clientId: string,
  recordedAt: string,
) {
  if (workoutCount <= 0) return null;

  return {
    client_id: clientId,
    data_type: 'workout',
    value: workoutCount,
    unit: 'count',
    recorded_at: recordedAt,
    source: 'ai_snapshot',
    metadata: {
      imported_via: 'ai_snapshot',
      inferred_from: 'apple_health_summary_screenshot',
    },
  };
}

/**
 * Smart Pace pipeline (server-side mirror of src/lib/smartPaceWeighIn.ts).
 * Looks up the active goal, computes debt/credit deltas, and writes the
 * daily log + goal totals.
 */
async function applySmartPaceFromScaleSource(
  supabase: any,
  clientId: string,
  weightLbs: number,
  source: 'ai_photo' | 'healthkit' | 'bluetooth' | 'admin_override',
) {
  const { data: settings } = await supabase
    .from('client_feature_settings')
    .select('smart_pace_enabled')
    .eq('client_id', clientId)
    .maybeSingle();
  if (!settings?.smart_pace_enabled) return;

  const { data: goal } = await supabase
    .from('smart_pace_goals')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle();
  if (!goal) return;

  const today = new Date().toISOString().slice(0, 10);
  const base = Number(goal.daily_pace_lbs) || 0;
  const debt = Number(goal.current_debt_lbs) || 0;
  const credit = Number(goal.current_credit_lbs) || 0;
  const cap = base * 3;
  const rawTarget = base + debt - credit;
  const targetLoss = Math.round(Math.max(0, Math.min(cap, rawTarget)) * 10) / 10;

  const prev = goal.last_weigh_in_value ?? goal.start_weight ?? weightLbs;
  const direction = goal.goal_direction === 'gain' ? -1 : 1;
  const actualLoss = Math.round((prev - weightLbs) * direction * 10) / 10;
  const diff = actualLoss - targetLoss;

  let status: 'on_pace' | 'ahead' | 'behind' = 'on_pace';
  let debtDelta = 0;
  let creditDelta = 0;
  if (diff >= 0.05) {
    status = 'ahead';
    creditDelta = diff;
  } else if (diff <= -0.05) {
    status = 'behind';
    debtDelta = -diff;
  }

  let newDebt = debt;
  let newCredit = credit;
  if (status === 'ahead') {
    const payDown = Math.min(newDebt, creditDelta);
    newDebt -= payDown;
    newCredit += creditDelta - payDown;
  } else if (status === 'behind') {
    const burn = Math.min(newCredit, debtDelta);
    newCredit -= burn;
    newDebt += debtDelta - burn;
  }
  newDebt = Math.round(newDebt * 10) / 10;
  newCredit = Math.round(newCredit * 10) / 10;

  const consecutiveBehind =
    status === 'behind' ? (goal.consecutive_behind_days || 0) + 1 : 0;

  await supabase.from('smart_pace_daily_log').upsert(
    {
      goal_id: goal.id,
      client_id: clientId,
      log_date: today,
      target_loss_lbs: targetLoss,
      actual_loss_lbs: actualLoss,
      weight_recorded: weightLbs,
      weight_source: source,
      status,
      debt_delta: Math.round(debtDelta * 10) / 10,
      credit_delta: Math.round(creditDelta * 10) / 10,
      notes: 'AI Snapshot scale photo',
    },
    { onConflict: 'goal_id,log_date' },
  );

  await supabase
    .from('smart_pace_goals')
    .update({
      current_debt_lbs: newDebt,
      current_credit_lbs: newCredit,
      last_weigh_in_date: today,
      last_weigh_in_value: weightLbs,
      consecutive_behind_days: consecutiveBehind,
      consecutive_missed_days: 0,
    })
    .eq('id', goal.id);

  console.log(`[SmartPace] AI snapshot weigh-in applied: ${actualLoss} lb actual vs ${targetLoss} lb target (status=${status})`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image, clientId } = await req.json();
    if (!image) throw new Error('No image provided');

    const targetClientId = clientId || user.id;

    if (targetClientId !== user.id) {
      const { data: linkedClient, error: linkedClientError } = await supabase
        .from('client_feature_settings')
        .select('client_id')
        .eq('client_id', targetClientId)
        .eq('trainer_id', user.id)
        .maybeSingle();

      if (linkedClientError) {
        console.error('Error validating trainer-client relationship:', linkedClientError);
        throw new Error('Unable to validate client access');
      }

      if (!linkedClient) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    console.log('Analyzing health screenshot with AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an expert at reading health & fitness app screenshots from ANY source.
This image could be from Trainerize, Apple Health, Fitbit, Garmin Connect, Samsung Health,
Whoop, Oura, MyFitnessPal, Lose It!, a smart scale app, or even a handwritten note.
Do NOT assume it's Apple Health — read whatever labels and numbers are visible.

Extract any of these 5 metrics that you can see on screen:

MAPPING RULES for data_type:
- "Steps", "Step Count", "Daily Steps" → steps (integer)
- "Body Weight", "Weight", "Current Weight" → weight (in lbs; convert from kg if needed: kg × 2.2046)
- "Sleep", "Sleep Duration", "Time Asleep" → sleep (HOURS as decimal, e.g. "6h 56m" = 6.93, "7h 30m" = 7.5)
- "Caloric Burn", "Calories Burned", "Total Calories", "Energy Burned",
  "Active Calories" / "Active Energy" / "Move" → active_energy
- "Resting Energy", "Basal Energy Burned", "BMR" → resting_energy
- "Caloric Intake", "Calories Consumed", "Calories Eaten",
  "Dietary Energy", "Food Energy", "Food Calories" → dietary_energy
- "Workouts" count → workout

TRAINERIZE NOTE: Trainerize typically shows tiles labeled exactly:
"Body Weight", "Steps", "Sleep", "Caloric Burn", "Caloric Intake".
When you see "Caloric Burn" treat it as a single total → calories_burned.
When you see "Caloric Intake" → caloric_intake.
Do NOT split Trainerize's "Caloric Burn" into active + resting.

APPLE HEALTH NOTE: Apple shows "Active Energy" and "Resting Energy" separately.
Keep them separate (active_energy + resting_energy) — the server sums them.

General rules:
- Extract exact numbers shown on screen.
- Convert sleep "Xh Ym" to decimal hours.
- Convert kg → lbs for weight.
- Skip any metric not in the mapping above (HR, blood pressure, distance, etc.).
- Today's date is ${new Date().toISOString().split('T')[0]}.`
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${image}` }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_health_metrics',
              description: 'Extract health metrics from the screenshot',
              parameters: {
                type: 'object',
                properties: {
                  metrics: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        data_type: {
                          type: 'string',
                           enum: ['steps', 'calories_burned', 'active_energy', 'resting_energy', 'sleep', 'weight', 'caloric_intake', 'dietary_energy', 'food_energy', 'workout'],
                        },
                        value: { type: 'number' },
                        unit: { type: 'string' },
                        label: { type: 'string' }
                      },
                      required: ['data_type', 'value', 'unit', 'label']
                    }
                  },
                  summary: { type: 'string' }
                },
                required: ['metrics', 'summary']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_health_metrics' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits required. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error('AI error:', response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error('No health data returned from AI');

    const extracted = JSON.parse(toolCall.function.arguments);
    const normalizedMetrics = (extracted.metrics ?? []).map(normalizeMetric);
    console.log('Extracted metrics:', normalizedMetrics.length, 'items');
    console.log('Normalized:', JSON.stringify(normalizedMetrics));

    if (normalizedMetrics.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No health metrics detected. Try a clearer screenshot.", metrics: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    let savedCount = 0;
    let workoutCount = 0;
    let totalBurnFromParts = 0;
    let totalBurnExplicit = 0;
    let totalIntake = 0;

    const aggregated: Record<string, number> = {};
    for (const metric of normalizedMetrics) {
      const value = Number(metric.value) || 0;

      if (metric.data_type === 'workout') {
        workoutCount = Math.max(workoutCount, Math.round(value));
        continue;
      }

      if (metric.data_type === 'active_energy' || metric.data_type === 'resting_energy') {
        totalBurnFromParts += value;
        continue;
      }

      if (metric.data_type === 'calories_burned') {
        totalBurnExplicit = Math.max(totalBurnExplicit, value);
        continue;
      }

      if (metric.data_type === 'caloric_intake' || metric.data_type === 'dietary_energy' || metric.data_type === 'food_energy') {
        totalIntake = Math.max(totalIntake, value);
        continue;
      }

      const metricName = DATA_TYPE_TO_METRIC[metric.data_type];
      if (!metricName) continue;
      aggregated[metricName] = Math.max(aggregated[metricName] || 0, value);
    }

    const resolvedBurn = Math.max(totalBurnExplicit, totalBurnFromParts);
    if (resolvedBurn > 0) {
      aggregated['Caloric Burn'] = resolvedBurn;
    }

    if (totalIntake > 0) {
      aggregated['Caloric Intake'] = totalIntake;
    }

    const metricNames = Object.keys(aggregated);
    console.log('Aggregated metric names:', metricNames);
    const { data: metricDefs } = await supabase
      .from('metric_definitions')
      .select('id, name')
      .in('name', metricNames);

    if (!metricDefs || metricDefs.length === 0) {
      console.error('No metric definitions found for:', metricNames);
      throw new Error('Metric definitions not found');
    }

    const defMap: Record<string, string> = {};
    metricDefs.forEach(d => {
      defMap[d.name] = d.id;
    });

    const { data: clientSettings } = await supabase
      .from('client_feature_settings')
      .select('trainer_id')
      .eq('client_id', targetClientId)
      .limit(1);

    const trainerId = clientSettings?.[0]?.trainer_id || user.id;

    for (const [metricName, value] of Object.entries(aggregated)) {
      const metricDefId = defMap[metricName];
      if (!metricDefId) continue;
      console.log(`Saving ${metricName} = ${value}`);

      const { data: existingCM } = await supabase
        .from('client_metrics')
        .select('id')
        .eq('client_id', targetClientId)
        .eq('metric_definition_id', metricDefId)
        .limit(1);

      let clientMetricId: string;

      if (existingCM && existingCM.length > 0) {
        clientMetricId = existingCM[0].id;
      } else {
        const { data: newCM, error: cmErr } = await supabase
          .from('client_metrics')
          .insert({
            client_id: targetClientId,
            metric_definition_id: metricDefId,
            trainer_id: trainerId,
            order_index: 0,
          })
          .select('id')
          .single();

        if (cmErr) {
          console.error('Error creating client_metric:', cmErr);
          continue;
        }
        clientMetricId = newCM.id;
      }

      // ── Smart dedup: one entry per metric per day ──────────────────────
      // Apple Health values for Steps/Energy/Sleep are cumulative daily
      // totals that only grow. For these, the latest (highest) value of the
      // day wins. Weight is point-in-time and just gets the latest reading.
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: todaysEntry } = await supabase
        .from('metric_entries')
        .select('id, value')
        .eq('client_id', targetClientId)
        .eq('client_metric_id', clientMetricId)
        .gte('recorded_at', startOfDay.toISOString())
        .lte('recorded_at', endOfDay.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // For cumulative metrics, only update if new value is strictly higher.
      // For Weight, always overwrite with the latest snapshot.
      const isCumulative = metricName !== 'Weight';
      let entryErr: any = null;

      if (todaysEntry) {
        const existingValue = Number(todaysEntry.value) || 0;
        if (isCumulative && value <= existingValue) {
          console.log(`Skipping ${metricName}: snapshot ${value} <= today's ${existingValue}`);
          continue;
        }
        const { error } = await supabase
          .from('metric_entries')
          .update({ value, recorded_at: now.toISOString() })
          .eq('id', todaysEntry.id);
        entryErr = error;
      } else {
        const { error } = await supabase
          .from('metric_entries')
          .insert({
            client_id: targetClientId,
            client_metric_id: clientMetricId,
            value,
            recorded_at: now.toISOString(),
          });
        entryErr = error;
      }

      if (entryErr) {
        console.error('Error saving metric_entry:', entryErr);
      } else {
        savedCount++;

        // Smart Pace integration: AI snapshot is a scale-quality source.
        if (metricName === 'Weight' && value > 50 && value < 800) {
          try {
            await applySmartPaceFromScaleSource(supabase, targetClientId, value, 'ai_photo');
          } catch (e) {
            console.warn('[SmartPace] AI snapshot weigh-in pipe failed:', e);
          }
        }
      }
    }

    const workoutHealthRow = buildWorkoutHealthRow(workoutCount, targetClientId, now.toISOString());
    if (workoutHealthRow) {
      const { error: workoutHealthError } = await supabase
        .from('health_data')
        .upsert(workoutHealthRow, { onConflict: 'client_id,data_type,recorded_at' });

      if (workoutHealthError) {
        console.error('Error inserting AI snapshot workout row:', workoutHealthError);
      }
    }

    // ── Mirror snapshot values into health_data so widgets that read
    //     from the HealthKit-backed store (StepTrackerCard, useHealthStats,
    //     etc.) immediately reflect the AI Snapshot import. Without this,
    //     the Health Dashboard cards update but the Step Tracker / "today"
    //     widgets still show 0 because they query a different table.
    const METRIC_TO_HEALTH_DATA: Record<string, { data_type: string; unit: string; transform?: (v: number) => number }> = {
      Steps: { data_type: 'steps', unit: 'count' },
      Weight: { data_type: 'weight', unit: 'lbs' },
      Sleep: { data_type: 'sleep', unit: 'minutes', transform: (v) => Math.round(v * 60) }, // hours → minutes
    };

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    for (const [metricName, value] of Object.entries(aggregated)) {
      const map = METRIC_TO_HEALTH_DATA[metricName];
      if (!map) continue;
      const numericValue = map.transform ? map.transform(Number(value)) : Number(value);
      if (!Number.isFinite(numericValue) || numericValue <= 0) continue;

      // For cumulative daily metrics (steps, sleep), keep one row per day
      // and only overwrite with a higher value. Weight always overwrites.
      const isCumulativeDaily = metricName === 'Steps' || metricName === 'Sleep';

      if (isCumulativeDaily) {
        const { data: existingRows } = await supabase
          .from('health_data')
          .select('id, value')
          .eq('client_id', targetClientId)
          .eq('data_type', map.data_type)
          .gte('recorded_at', todayStart.toISOString())
          .lte('recorded_at', todayEnd.toISOString())
          .order('value', { ascending: false })
          .limit(1);

        if (existingRows && existingRows.length > 0) {
          if (numericValue > Number(existingRows[0].value)) {
            await supabase
              .from('health_data')
              .update({ value: numericValue, recorded_at: now.toISOString(), source: 'ai_snapshot' })
              .eq('id', existingRows[0].id);
          }
          continue;
        }
      }

      const { error: hdErr } = await supabase.from('health_data').insert({
        client_id: targetClientId,
        data_type: map.data_type,
        value: numericValue,
        unit: map.unit,
        recorded_at: now.toISOString(),
        source: 'ai_snapshot',
        metadata: { imported_via: 'ai_snapshot' },
      });
      if (hdErr) {
        console.error(`[ai_snapshot] health_data insert failed for ${map.data_type}:`, hdErr.message);
      } else {
        console.log(`[ai_snapshot] mirrored ${metricName} → health_data (${map.data_type}=${numericValue})`);
      }
    }

    // Caloric Burn → split as a single active_energy row (read-health-stats
    // sums active + resting, so this becomes today's total burn).
    if (aggregated['Caloric Burn'] && aggregated['Caloric Burn'] > 0) {
      const burnVal = Number(aggregated['Caloric Burn']);
      const { data: existingBurn } = await supabase
        .from('health_data')
        .select('id, value')
        .eq('client_id', targetClientId)
        .eq('data_type', 'active_energy')
        .eq('source', 'ai_snapshot')
        .gte('recorded_at', todayStart.toISOString())
        .lte('recorded_at', todayEnd.toISOString())
        .limit(1);

      if (existingBurn && existingBurn.length > 0) {
        await supabase
          .from('health_data')
          .update({ value: burnVal, recorded_at: now.toISOString() })
          .eq('id', existingBurn[0].id);
      } else {
        await supabase.from('health_data').insert({
          client_id: targetClientId,
          data_type: 'active_energy',
          value: burnVal,
          unit: 'kcal',
          recorded_at: now.toISOString(),
          source: 'ai_snapshot',
          metadata: { imported_via: 'ai_snapshot' },
        });
      }
    }

    // ── Emit a Timeline marker so the import shows on the user's Timeline.
    if (savedCount > 0 || workoutCount > 0) {
      const parts: string[] = [];
      if (aggregated['Steps']) parts.push(`${Math.round(aggregated['Steps']).toLocaleString()} steps`);
      if (aggregated['Weight']) parts.push(`${aggregated['Weight']} lb`);
      if (aggregated['Sleep']) parts.push(`${aggregated['Sleep']}h sleep`);
      if (aggregated['Caloric Burn']) parts.push(`${Math.round(aggregated['Caloric Burn']).toLocaleString()} cal burn`);
      if (aggregated['Caloric Intake']) parts.push(`${Math.round(aggregated['Caloric Intake']).toLocaleString()} cal intake`);
      if (workoutCount > 0) parts.push(`${workoutCount} workout${workoutCount === 1 ? '' : 's'}`);

      const subtitle = parts.length > 0 ? parts.join(' · ') : 'Health snapshot imported';

      const { error: evtErr } = await supabase.from('activity_events').insert({
        client_id: targetClientId,
        event_type: 'ai_snapshot_imported',
        title: 'AI Snapshot imported',
        subtitle,
        category: 'metrics',
        icon: 'camera',
        source: 'ai_snapshot',
        occurred_at: now.toISOString(),
        actor_id: user.id,
        metadata: {
          metrics: aggregated,
          workout_count: workoutCount,
          summary: extracted.summary ?? null,
        },
      });
      if (evtErr) {
        console.warn('[ai_snapshot] activity_events insert failed:', evtErr.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: savedCount,
        importedCards: Object.keys(aggregated).length + (workoutCount > 0 ? 1 : 0),
        metrics: normalizedMetrics,
        summary: extracted.summary,
        date: now.toISOString().split('T')[0],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-health-screenshot:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
