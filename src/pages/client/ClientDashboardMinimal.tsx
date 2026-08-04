import { ClientLayout } from "@/components/ClientLayout";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { FastingProtocolCard } from "./ClientDashboard";
import { SmartPaceCollapsible } from "@/components/smart-pace/SmartPaceCollapsible";
import { ClientWeekStrip } from "@/components/client/ClientWeekStrip";
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
  const todaySchedule = resolveDayForDate(weeklySchedule ?? null, scheduleOverrides ?? null, new Date());
  const scheduleSaving = saveWeekly.isPending || saveOverride.isPending;

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
        <FastingProtocolCard clientId={clientId} navigate={navigate} todaySchedule={todaySchedule} />

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