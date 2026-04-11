import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BarChart3, Sparkles, Loader2, Copy, Check, RefreshCw } from "lucide-react";
import { useCopilot } from "@/hooks/useCopilot";
import { buildCopilotContext } from "@/lib/buildCopilotContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIProgressReportPanelProps {
  clientId: string;
  trainerId: string;
}

export function AIProgressReportPanel({ clientId, trainerId }: AIProgressReportPanelProps) {
  const [report, setReport] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: contextData } = useQuery({
    queryKey: ["ai-report-context", clientId],
    queryFn: async () => {
      // Core settings
      const { data: settings } = await supabase
        .from("client_feature_settings")
        .select("parent_link_enabled, is_minor")
        .eq("client_id", clientId)
        .maybeSingle();

      // Weekly summary
      const { data: summary } = await supabase
        .from("client_weekly_summaries")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();

      // Latest readiness event
      const { data: latestEvent } = await supabase
        .from("recommendation_events")
        .select("score_total, status, lowest_factor")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fasting data (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { count: fastingCount } = await supabase
        .from("fasting_log")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("status", "completed")
        .gte("ended_at", sevenDaysAgo);

      // Keto type
      const { data: ketoAssignment } = await supabase
        .from("client_keto_assignments")
        .select("keto_type_id, keto_types(name)")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();

      // Fasting protocol
      const { data: fastingProto } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, fasting_protocols(name)")
        .eq("client_id", clientId)
        .maybeSingle();

      // Workouts (last 7 days)
      const { data: workouts } = await supabase
        .from("client_workouts")
        .select("id, completed_at")
        .eq("client_id", clientId)
        .gte("assigned_at", sevenDaysAgo);

      const workoutsAssigned = workouts?.length ?? 0;
      const workoutsCompleted = workouts?.filter(w => w.completed_at)?.length ?? 0;

      // Tasks (last 7 days)
      const { data: tasks } = await supabase
        .from("client_tasks")
        .select("id, completed_at")
        .eq("client_id", clientId)
        .gte("assigned_at", sevenDaysAgo);

      const tasksTotal = tasks?.length ?? 0;
      const tasksCompleted = tasks?.filter(t => t.completed_at)?.length ?? 0;

      // Weight — latest 2 metric entries for Weight
      const { data: weightMetric } = await supabase
        .from("client_metrics")
        .select("id, metric_definitions!inner(name)")
        .eq("client_id", clientId)
        .eq("metric_definitions.name" as any, "Weight")
        .limit(1)
        .maybeSingle();

      let weightEntries: { value: number }[] = [];
      if (weightMetric) {
        const { data } = await supabase
          .from("metric_entries")
          .select("value")
          .eq("client_metric_id", weightMetric.id)
          .order("recorded_at", { ascending: false })
          .limit(2);
        weightEntries = data ?? [];
      }

      let weightChange: number | null = null;
      let currentWeight: number | null = null;
      if (weightEntries && weightEntries.length >= 1) {
        currentWeight = weightEntries[0].value;
        if (weightEntries.length >= 2) {
          weightChange = Number((weightEntries[0].value - weightEntries[1].value).toFixed(1));
        }
      }

      const ketoName = (ketoAssignment as any)?.keto_types?.name ?? null;
      const protocolName = (fastingProto as any)?.fasting_protocols?.name ?? null;

      return buildCopilotContext({
        readinessScore: latestEvent?.score_total ?? (summary?.avg_score_7d ? Number(summary.avg_score_7d) : null),
        status: latestEvent?.status || summary?.score_status || "moderate",
        lowestFactor: latestEvent?.lowest_factor || summary?.lowest_factor_mode || null,
        weeklyCompletionPct: summary?.completion_7d ? Number(summary.completion_7d) : null,
        streakDays: null,
        trendDirection: (summary?.trend_direction as "up" | "down" | "flat") || "flat",
        parentLinkActive: !!(settings?.is_minor && settings?.parent_link_enabled),
        fastingCompletedCount: fastingCount ?? 0,
        fastingProtocolName: protocolName,
        workoutsCompleted,
        workoutsAssigned,
        tasksCompleted,
        tasksTotal,
        weightChangeLbs: weightChange,
        currentWeight,
        ketoType: ketoName,
        adherenceScore: summary?.adherence_score ? Number(summary.adherence_score) : null,
        injuryFlag: summary?.injury_flag ?? false,
      });
    },
  });

  const copilot = useCopilot({
    clientId,
    coachId: trainerId,
    engineMode: "metabolic",
  });

  const handleGenerate = async () => {
    if (!contextData) return;
    const text = await copilot.generate("progress_report", contextData);
    if (text) setReport(text);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    toast.success("Report copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              AI Progress Report
            </CardTitle>
            <CardDescription className="mt-1">Auto-generate a week-over-week performance summary.</CardDescription>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleGenerate}
            disabled={copilot.isGenerating || !contextData}
          >
            {copilot.isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Generate Report
          </Button>
        </div>
      </CardHeader>
      {report && (
        <CardContent className="space-y-3 pt-0">
          <Separator />
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">Progress Report</Badge>
            <span className="text-[10px] text-muted-foreground">AI Draft — Coach Review</span>
          </div>
          <div className="text-sm text-foreground bg-muted/50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed border border-border font-mono">
            {report}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={handleCopy}>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy Report"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1"
              onClick={handleGenerate}
              disabled={copilot.isGenerating}
            >
              <RefreshCw className="h-3 w-3" />
              Regenerate
            </Button>
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setReport("")}>
              Dismiss
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
