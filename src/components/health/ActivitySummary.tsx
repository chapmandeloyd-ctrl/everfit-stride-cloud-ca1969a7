import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Footprints, Flame, Moon, Scale, Dumbbell, BatteryCharging } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivitySummaryProps {
  clientId?: string;
}

// The 6 metrics we display, mapped to their metric_definition names
const METRIC_CARDS = [
  { key: 'Weight', icon: Scale, color: 'text-red-500', bgColor: 'bg-red-500/10', unit: 'lbs' },
  { key: 'Steps', icon: Footprints, color: 'text-blue-500', bgColor: 'bg-blue-500/10', unit: 'steps', goal: 10000 },
  { key: 'Sleep', icon: Moon, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', unit: 'hrs' },
  { key: 'Caloric Intake', icon: Flame, color: 'text-orange-500', bgColor: 'bg-orange-500/10', unit: 'cal' },
  { key: 'Caloric Burn', icon: BatteryCharging, color: 'text-amber-500', bgColor: 'bg-amber-500/10', unit: 'cal' },
  { key: 'Workouts', icon: Dumbbell, color: 'text-purple-500', bgColor: 'bg-purple-500/10', unit: 'done' },
];

export function ActivitySummary({ clientId }: ActivitySummaryProps) {
  // Fetch latest metric values for this client
  const { data: metricData, isLoading: metricsLoading } = useQuery({
    queryKey: ['health-activity-metrics', clientId],
    queryFn: async () => {
      if (!clientId) return {};

      // Get client_metrics for the 5 metric definitions we care about
      const metricNames = ['Weight', 'Steps', 'Sleep', 'Caloric Intake', 'Caloric Burn'];
      const { data: defs } = await supabase
        .from('metric_definitions')
        .select('id, name')
        .in('name', metricNames);
      if (!defs || defs.length === 0) return {};

      const defIds = defs.map(d => d.id);
      const { data: clientMetrics } = await supabase
        .from('client_metrics')
        .select('id, metric_definition_id')
        .eq('client_id', clientId)
        .in('metric_definition_id', defIds);
      if (!clientMetrics || clientMetrics.length === 0) return {};

      // Build a map: metric name → client_metric_id
      const defNameMap: Record<string, string> = {};
      defs.forEach(d => { defNameMap[d.id] = d.name; });

      const results: Record<string, { value: number; date: string }> = {};

      for (const cm of clientMetrics) {
        const { data: entries } = await supabase
          .from('metric_entries')
          .select('value, recorded_at')
          .eq('client_metric_id', cm.id)
          .order('recorded_at', { ascending: false })
          .limit(1);

        if (entries && entries.length > 0) {
          const name = defNameMap[cm.metric_definition_id];
          results[name] = { value: entries[0].value, date: entries[0].recorded_at };
        }
      }
      return results;
    },
    enabled: !!clientId,
  });

  // Fetch workout count
  const { data: workoutCount, isLoading: workoutsLoading } = useQuery({
    queryKey: ['health-activity-workouts', clientId],
    queryFn: async () => {
      if (!clientId) return 0;
      const { count } = await supabase
        .from('client_workouts')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .not('completed_at', 'is', null);
      return count || 0;
    },
    enabled: !!clientId,
  });

  const isLoading = metricsLoading || workoutsLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {METRIC_CARDS.map((card) => {
        const Icon = card.icon;
        const isWorkout = card.key === 'Workouts';
        const data = isWorkout ? null : metricData?.[card.key];
        const displayValue = isWorkout
          ? String(workoutCount || 0)
          : data
            ? Number(data.value).toLocaleString()
            : '--';
        const progressPercent = card.goal && data
          ? Math.min((Number(data.value) / card.goal) * 100, 100)
          : null;

        return (
          <Card key={card.key}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.key}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{displayValue}</span>
                  {displayValue !== '--' && (
                    <span className="text-sm text-muted-foreground">{card.unit}</span>
                  )}
                </div>
                {progressPercent !== null && (
                  <div className="space-y-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(progressPercent)}% of {card.goal?.toLocaleString()} goal
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
