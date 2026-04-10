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
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an expert at reading health app screenshots (Apple Health, Fitbit, Garmin, Samsung Health, etc.).
Analyze this screenshot and extract health metrics you can see.

MAPPING RULES for data_type:
- "Steps" or step count → steps
- "Active Calories" or "Active Energy" or "Move" → active_energy
- "Calories Burned" or total calories → calories_burned
- "Active Energy" or "Active Calories" or "Move" → active_energy
- "Resting Energy" or "Basal Energy Burned" → resting_energy
- "Dietary Energy" or "Food Energy" or calories eaten/consumed → dietary_energy
- "Sleep" duration → sleep (value in HOURS as decimal, e.g. 7.5)
- "Weight" → weight (value in lbs)
- "Caloric Intake" or food calories → caloric_intake
- "Dietary Energy" → dietary_energy (this is Apple's name for calories consumed/eaten)

IMPORTANT: Apple Health shows "Active Energy" and "Resting Energy" separately. 
- Map "Active Energy" → active_energy
- Map "Resting Energy" → resting_energy  
- Map "Basal Energy Burned" → resting_energy
- Map "Dietary Energy" / "Food Energy" → dietary_energy
- Do NOT combine them into one entry.

Extract exact numbers shown on screen. Convert minutes to hours for sleep (e.g. 7h 30m = 7.5).
Skip any metrics not in the mapping above.
Today's date is ${new Date().toISOString().split('T')[0]}.`
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
                           enum: ['steps', 'calories_burned', 'active_energy', 'resting_energy', 'sleep', 'weight', 'caloric_intake', 'dietary_energy', 'food_energy'],
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

    if (normalizedMetrics.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No health metrics detected. Try a clearer screenshot.", metrics: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    let savedCount = 0;

    const aggregated: Record<string, number> = {};
    for (const metric of normalizedMetrics) {
      const metricName = DATA_TYPE_TO_METRIC[metric.data_type];
      if (!metricName) continue;
      aggregated[metricName] = (aggregated[metricName] || 0) + metric.value;
    }

    const metricNames = Object.keys(aggregated);
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

      const { error: entryErr } = await supabase
        .from('metric_entries')
        .insert({
          client_id: targetClientId,
          client_metric_id: clientMetricId,
          value,
          recorded_at: now.toISOString(),
        });

      if (entryErr) {
        console.error('Error inserting metric_entry:', entryErr);
      } else {
        savedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: savedCount,
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
