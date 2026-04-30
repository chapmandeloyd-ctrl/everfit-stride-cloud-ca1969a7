import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Footprints, Flame, Moon, Scale, BatteryCharging, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { StepsDetailSheet } from '@/components/health/StepsDetailSheet';

interface ActivitySummaryProps {
  clientId?: string;
}

interface MetricSnapshot {
  value: number;
  date: string;
}

interface ActivitySummaryResponse {
  metrics: Record<string, MetricSnapshot>;
  workoutCount: number;
}

// The 6 metrics we display, mapped to their metric_definition names
const METRIC_CARDS = [
  { key: 'Weight', icon: Scale, color: 'text-red-500', bgColor: 'bg-red-500/10', unit: 'lbs' },
  { key: 'Steps', icon: Footprints, color: 'text-blue-500', bgColor: 'bg-blue-500/10', unit: 'steps', goal: 10000 },
  { key: 'Sleep', icon: Moon, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', unit: 'hrs' },
  { key: 'Caloric Intake', icon: Flame, color: 'text-orange-500', bgColor: 'bg-orange-500/10', unit: 'cal' },
  { key: 'Caloric Burn', icon: BatteryCharging, color: 'text-amber-500', bgColor: 'bg-amber-500/10', unit: 'cal' },
];

export function ActivitySummary({ clientId }: ActivitySummaryProps) {
  const { user, loading } = useAuth();
  const [stepsOpen, setStepsOpen] = useState(false);

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['health-activity-metrics', clientId],
    queryFn: async (): Promise<ActivitySummaryResponse> => {
      if (!clientId) return { metrics: {}, workoutCount: 0 };

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { metrics: {}, workoutCount: 0 };
      }

      const response = await supabase.functions.invoke('read-health-stats', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          client_id: clientId,
          mode: 'metric_summary',
        },
      });

      if (response.error) {
        throw response.error;
      }

      return {
        metrics: response.data?.metrics ?? {},
        workoutCount: response.data?.workoutCount ?? 0,
      };
    },
    enabled: !!clientId && !loading && !!user,
    refetchOnMount: 'always',
  });

  const metricData = summaryData?.metrics ?? {};
  const workoutCount = summaryData?.workoutCount ?? 0;

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
        const data = metricData[card.key];
        const displayValue = data ? Number(data.value).toLocaleString() : '--';
        const progressPercent = card.goal && data
          ? Math.min((Number(data.value) / card.goal) * 100, 100)
          : null;

        const isInteractive = card.key === 'Steps';
        const handleClick = () => {
          if (card.key === 'Steps') setStepsOpen(true);
        };

        return (
          <Card
            key={card.key}
            onClick={isInteractive ? handleClick : undefined}
            className={isInteractive ? 'cursor-pointer transition hover:bg-muted/40 active:scale-[0.99]' : undefined}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.key}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  {isInteractive && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
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
      {clientId && (
        <StepsDetailSheet open={stepsOpen} onOpenChange={setStepsOpen} clientId={clientId} />
      )}
    </div>
  );
}
