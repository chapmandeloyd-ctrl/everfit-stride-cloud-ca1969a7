import { ClientLayout } from "@/components/ClientLayout";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { BookOpen, Droplet, Flame, Footprints } from "lucide-react";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { FastingProtocolCard } from "./ClientDashboard";
import { SmartPaceCollapsible } from "@/components/smart-pace/SmartPaceCollapsible";
import { HealthDashboardCollapsible } from "@/components/health/HealthDashboardCollapsible";
import { ClientWeekStrip } from "@/components/client/ClientWeekStrip";
import { WaterTrackerCard } from "@/components/client/WaterTrackerCard";
import { StepTrackerCard } from "@/components/client/StepTrackerCard";
import { DailyJournalCard } from "@/components/daily-journal/DailyJournalCard";
import { CollapsibleTile } from "@/components/client/CollapsibleTile";
import { supabase } from "@/integrations/supabase/client";
import { useClientWeeklySchedule } from "@/hooks/useClientWeeklySchedule";
import { resolveDayForDate, type WeeklyScheduleDay } from "@/lib/resolveFastingWindow";
import { dateKey } from "@/components/client/calendar/calendarUtils";
import DayEditorSheet, { type ApplyScope } from "@/components/client/calendar/DayEditorSheet";
import { useToast } from "@/hooks/use-toast";

/**
 * Minimal client dashboard — Fasting + Smart Pace + Health tracking tiles.
 * Workouts, meals, habits, etc. are intentionally hidden.
 */
const SHOW_WEIGHT_TRACKER = true;

export default function ClientDashboardMinimal() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
  const {
    weekly: weeklySchedule,
    overrides: scheduleOverrides,
    saveWeekly,
    saveOverride,
  } = useClientWeeklySchedule(clientId);

  const handleWeekStripDayClick = (date: Date) => {
    setSelectedDayDate(date);
  };

  const handleSaveDay = async (day: WeeklyScheduleDay, scope: ApplyScope) => {
    if (!selectedDayDate || !clientId) return;
    const saving = saveWeekly.isPending || saveOverride.isPending;
    if (saving) return;
    try {
      if (scope === "day") {
        const key = dateKey(selectedDayDate);
        const existing = (scheduleOverrides ?? []).find(
          (o) => o.start_date === key && o.end_date === key,
        );
        const schedule = (weeklySchedule ?? []).map((d) =>
          d.day_of_week === selectedDayDate.getDay() ? { ...day } : d,
        );
        await saveOverride.mutateAsync({
          ...(existing?.id ? { id: existing.id } : {}),
          label: "Day edit",
          start_date: key,
          end_date: key,
          schedule,
          active: true,
        } as any);
      } else {
        const target = (dow: number) =>
          scope === "week" ||
          (scope === "weekdays" && dow >= 1 && dow <= 5) ||
          (scope === "weekends" && (dow === 0 || dow === 6));
        const next = (weeklySchedule ?? []).map((d) =>
          target(d.day_of_week) ? { ...day, day_of_week: d.day_of_week } : d,
        );
        await saveWeekly.mutateAsync(next);
      }
      toast({ title: "Schedule updated" });
      setSelectedDayDate(null);
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e.message, variant: "destructive" });
    }
  };

  const resolvedDayForSelected = selectedDayDate
    ? resolveDayForDate(weeklySchedule ?? null, scheduleOverrides ?? null, selectedDayDate)
    : null;
  const scheduleSaving = saveWeekly.isPending || saveOverride.isPending;


  // Water summary — total oz today vs goal
  const { data: waterSummary } = useQuery({
    queryKey: ["tile-water-summary", clientId, today],
    enabled: !!clientId,
    staleTime: 30_000,
    queryFn: async () => {
      const [{ data: goalRow }, { data: logs }] = await Promise.all([
        supabase
          .from("water_goal_settings")
          .select("daily_goal_oz, unit")
          .eq("client_id", clientId!)
          .maybeSingle(),
        supabase
          .from("water_log_entries")
          .select("amount_oz, logged_at")
          .eq("client_id", clientId!)
          .gte("logged_at", `${today}T00:00:00`)
          .lte("logged_at", `${today}T23:59:59`),
      ]);
      const goalOz = Number(goalRow?.daily_goal_oz ?? 64);
      const totalOz = (logs ?? []).reduce((s, r: any) => s + Number(r.amount_oz ?? 0), 0);
      const unit = (goalRow?.unit as string) ?? "fl_oz";
      return { goalOz, totalOz, unit };
    },
  });

  // Steps summary — today's steps from health_data
  const { data: stepsSummary } = useQuery({
    queryKey: ["tile-steps-summary", clientId, today],
    enabled: !!clientId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("health_data")
        .select("value, recorded_at")
        .eq("client_id", clientId!)
        .eq("data_type", "steps")
        .gte("recorded_at", `${today}T00:00:00`)
        .lte("recorded_at", `${today}T23:59:59`);
      const steps = (data ?? []).reduce((s, r: any) => s + Number(r.value ?? 0), 0);
      return { steps, goal: 10000 };
    },
  });

  // Daily calories — today's caloric intake vs target
  const { data: caloriesSummary } = useQuery({
    queryKey: ["tile-calories-summary", clientId, today],
    enabled: !!clientId,
    staleTime: 30_000,
    queryFn: async () => {
      const [{ data: target }, { data: logs }] = await Promise.all([
        supabase
          .from("client_macro_targets")
          .select("target_calories")
          .eq("client_id", clientId!)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("nutrition_logs")
          .select("calories")
          .eq("client_id", clientId!)
          .eq("log_date", today),
      ]);
      const consumed = (logs ?? []).reduce((s, r: any) => s + Number(r.calories ?? 0), 0);
      const goal = Number(target?.target_calories ?? 0);
      return { consumed, goal };
    },
  });

  // Journal summary — did they log today?
  const { data: journalSummary } = useQuery({
    queryKey: ["tile-journal-summary", clientId, today],
    enabled: !!clientId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_journal_entries")
        .select("mood, note")
        .eq("client_id", clientId!)
        .eq("entry_date", today)
        .maybeSingle();
      return data;
    },
  });

  const fmtOz = (oz: number) =>
    waterSummary?.unit === "liter"
      ? `${(oz / 33.814).toFixed(1)} L`
      : `${Math.round(oz)} fl oz`;

  const waterPct = waterSummary?.goalOz
    ? Math.round((waterSummary.totalOz / waterSummary.goalOz) * 100)
    : 0;
  const stepsPct = stepsSummary?.goal
    ? Math.round((stepsSummary.steps / stepsSummary.goal) * 100)
    : 0;
  const caloriesPct = caloriesSummary?.goal
    ? Math.round((caloriesSummary.consumed / caloriesSummary.goal) * 100)
    : 0;

  return (
    <ClientLayout>
      <div className="p-4 space-y-4 pb-24">
        {/* Week strip — tap any day to edit its fasting plan */}
        <ClientWeekStrip onDayClick={handleWeekStripDayClick} />


        {/* Smart Weight Tracker — collapsible, above fasting */}
        {SHOW_WEIGHT_TRACKER && clientId && (
          <div className="space-y-3">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Smart Weight Tracker
              </h2>
              <p className="text-muted-foreground">
                Your real-pace coach. Adjusts daily targets based on every weigh-in
                so you always know exactly what to lose today to stay on track.
              </p>
            </div>
            <SmartPaceCollapsible />
          </div>
        )}

        {/* Fasting timer / protocol */}
        <FastingProtocolCard clientId={clientId} navigate={navigate} />

        {/* Daily trackers (journal/water/steps/calories/health) intentionally removed —
            those metrics live in Trainerize, not here. */}
      </div>

      {/* Day editor sheet — tap any day in the strip to edit it */}
      <DayEditorSheet
        open={!!selectedDayDate}
        onOpenChange={(v) => !v && setSelectedDayDate(null)}
        date={selectedDayDate}
        day={resolvedDayForSelected}
        saving={scheduleSaving}
        onSave={handleSaveDay}
      />
    </ClientLayout>
  );
}