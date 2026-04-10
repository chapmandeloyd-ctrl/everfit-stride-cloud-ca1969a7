import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Settings } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { HealthSnapshotDialog } from "@/components/health/HealthSnapshotDialog";

interface ProgressTile {
  id: string;
  client_id: string;
  tile_key: string;
  label: string;
  unit: string;
  is_visible: boolean;
  order_index: number;
  metric_definition_id: string | null;
}

interface Props {
  clientId: string;
}

export function MyProgressSection({ clientId }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);

  const { data: tiles } = useQuery({
    queryKey: ["progress-tiles", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_progress_tiles")
        .select("*")
        .eq("client_id", clientId)
        .order("order_index", { ascending: true });
      if (error) throw error;

      if (!data || data.length === 0) {
        await supabase.rpc("provision_default_progress_tiles", { p_client_id: clientId });
        const { data: newData } = await supabase
          .from("client_progress_tiles")
          .select("*")
          .eq("client_id", clientId)
          .order("order_index", { ascending: true });
        return (newData || []) as ProgressTile[];
      }

      return data as ProgressTile[];
    },
    enabled: !!clientId,
  });

  const visibleTiles = tiles?.filter((t) => t.is_visible) || [];
  const metricDefIds = visibleTiles
    .filter((t) => t.metric_definition_id)
    .map((t) => t.metric_definition_id!);

  const { data: clientMetricsMap } = useQuery({
    queryKey: ["progress-client-metrics", clientId, metricDefIds],
    queryFn: async () => {
      if (metricDefIds.length === 0) return {};
      const { data, error } = await supabase
        .from("client_metrics")
        .select("id, metric_definition_id")
        .eq("client_id", clientId)
        .in("metric_definition_id", metricDefIds);
      if (error) throw error;

      const map: Record<string, string> = {};
      (data || []).forEach((cm: any) => {
        map[cm.metric_definition_id] = cm.id;
      });
      return map;
    },
    enabled: metricDefIds.length > 0,
  });

  const clientMetricIds = Object.values(clientMetricsMap || {});

  const { data: tileData } = useQuery({
    queryKey: ["progress-tile-data", clientMetricIds],
    queryFn: async () => {
      if (clientMetricIds.length === 0) return {};
      const results: Record<string, { latestValue: number; latestDate: string; sparkline: number[] }> = {};

      for (const cmId of clientMetricIds) {
        const { data } = await supabase
          .from("metric_entries")
          .select("value, recorded_at")
          .eq("client_metric_id", cmId)
          .order("recorded_at", { ascending: false })
          .limit(14);

        if (data && data.length > 0) {
          results[cmId] = {
            latestValue: data[0].value,
            latestDate: data[0].recorded_at,
            sparkline: [...data].reverse().map((d) => d.value),
          };
        }
      }

      return results;
    },
    enabled: clientMetricIds.length > 0,
  });

  const hasWorkoutTile = visibleTiles.some((t) => t.tile_key === "workouts");
  const { data: workoutData } = useQuery({
    queryKey: ["progress-workout-count", clientId],
    queryFn: async () => {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data, error } = await supabase
        .from("client_workouts")
        .select("completed_at")
        .eq("client_id", clientId)
        .not("completed_at", "is", null)
        .gte("completed_at", fourteenDaysAgo.toISOString())
        .order("completed_at", { ascending: false });
      if (error) throw error;

      const { count } = await supabase
        .from("client_workouts")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .not("completed_at", "is", null);

      const dailyCounts: number[] = [];
      for (let i = 13; i >= 0; i--) {
        const day = new Date();
        day.setDate(day.getDate() - i);
        const dayStr = day.toISOString().slice(0, 10);
        const c = (data || []).filter((w) => w.completed_at?.slice(0, 10) === dayStr).length;
        dailyCounts.push(c);
      }

      return {
        total: count || 0,
        latestDate: data?.[0]?.completed_at || null,
        sparkline: dailyCounts,
      };
    },
    enabled: !!clientId && hasWorkoutTile,
  });

  const toggleVisibility = useMutation({
    mutationFn: async ({ tileId, visible }: { tileId: string; visible: boolean }) => {
      const { error } = await supabase
        .from("client_progress_tiles")
        .update({ is_visible: visible })
        .eq("id", tileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-tiles", clientId] });
    },
  });

  if (!tiles || tiles.length === 0) return null;

  const getRelativeDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return format(d, "MMM d");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Health Dashboard</h2>
          <p className="text-muted-foreground">
            Track your heart rate, activity, and more from your wearable
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-14 justify-start rounded-2xl text-base font-semibold"
            onClick={() => setSnapshotOpen(true)}
          >
            <Camera className="mr-2 h-5 w-5" />
            AI Snapshot
          </Button>
          <Button
            variant="outline"
            className="h-14 justify-start rounded-2xl text-base font-semibold"
            onClick={() => navigate("/client/health-connect")}
          >
            <Settings className="mr-2 h-5 w-5" />
            Settings
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">My Progress</h3>
        <button onClick={() => setSettingsOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {visibleTiles.map((tile) => {
          const isWorkoutTile = tile.tile_key === "workouts";
          const cmId = tile.metric_definition_id ? clientMetricsMap?.[tile.metric_definition_id] : null;
          const data = cmId ? tileData?.[cmId] : null;

          const displayValue = isWorkoutTile
            ? workoutData
              ? String(workoutData.total)
              : null
            : data
              ? Number(data.latestValue).toLocaleString()
              : null;
          const displayDate = isWorkoutTile
            ? workoutData?.latestDate
              ? getRelativeDate(workoutData.latestDate)
              : "No data"
            : data
              ? getRelativeDate(data.latestDate)
              : "No data";
          const sparkline = isWorkoutTile ? workoutData?.sparkline || [] : data?.sparkline || [];

          return (
            <Card
              key={tile.id}
              className="cursor-pointer overflow-hidden transition-all hover:shadow-md"
              onClick={() => {
                if (isWorkoutTile) {
                  navigate("/client/training");
                } else if (cmId) {
                  navigate(`/client/progress?metric=${cmId}`);
                } else {
                  navigate("/client/progress");
                }
              }}
            >
              <CardContent className="p-4 pb-2 space-y-1">
                <p className="text-sm font-semibold text-foreground">{tile.label}</p>
                <p className="text-[11px] text-muted-foreground">{displayDate}</p>
                <p className="text-2xl font-bold leading-tight text-foreground">
                  {displayValue !== null ? (
                    <>
                      {displayValue}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">{tile.unit}</span>
                    </>
                  ) : (
                    <span className="text-lg text-muted-foreground">···</span>
                  )}
                </p>
                <div className="-mx-1 h-8">
                  {sparkline.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparkline.map((v, i) => ({ v, i }))}>
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke="hsl(45, 93%, 58%)"
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-end">
                      <div className="h-px w-full bg-muted" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <HealthSnapshotDialog open={snapshotOpen} onOpenChange={setSnapshotOpen} />

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Customize My Progress</SheetTitle>
          </SheetHeader>
          <p className="mt-2 mb-4 text-sm text-muted-foreground">Toggle which tiles appear on your dashboard.</p>
          <div className="space-y-3">
            {tiles.map((tile) => (
              <div key={tile.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label className="text-sm font-medium">{tile.label}</Label>
                <Switch
                  checked={tile.is_visible}
                  onCheckedChange={(checked) => toggleVisibility.mutate({ tileId: tile.id, visible: checked })}
                />
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
