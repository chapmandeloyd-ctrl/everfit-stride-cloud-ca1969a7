import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useClientWeeklySchedule } from "@/hooks/useClientWeeklySchedule";
import { resolveDayForDate, type WeeklyScheduleDay } from "@/lib/resolveFastingWindow";
import { dateKey } from "@/components/client/calendar/calendarUtils";
import DayEditorSheet, { type ApplyScope } from "@/components/client/calendar/DayEditorSheet";
import { useToast } from "@/hooks/use-toast";

/**
 * Inline editor for today's fasting times, opened from the dashboard
 * schedule bar. Owns its own save logic so it can be dropped anywhere.
 */
export function EditTodayScheduleSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const clientId = useEffectiveClientId();
  const { toast } = useToast();
  const { weekly, overrides, saveWeekly, saveOverride } = useClientWeeklySchedule(clientId);
  const today = new Date();
  const resolved = resolveDayForDate(weekly ?? null, overrides ?? null, today);
  const saving = saveWeekly.isPending || saveOverride.isPending;

  const handleSave = async (day: WeeklyScheduleDay, scope: ApplyScope) => {
    if (!clientId || saving) return;
    try {
      if (scope === "day") {
        const key = dateKey(today);
        const existing = (overrides ?? []).find((o) => o.start_date === key && o.end_date === key);
        const dow = today.getDay();
        const edited = { ...day, day_of_week: dow };
        const base = weekly ?? [];
        const schedule = base.some((d) => d.day_of_week === dow)
          ? base.map((d) => (d.day_of_week === dow ? edited : d))
          : [...base, edited];
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
        const base = weekly ?? [];
        const next = Array.from({ length: 7 }, (_, dow) => {
          const existing = base.find((d) => d.day_of_week === dow);
          if (target(dow)) return { ...day, day_of_week: dow };
          return existing ?? null;
        }).filter(Boolean) as WeeklyScheduleDay[];
        await saveWeekly.mutateAsync(next);
      }
      toast({ title: "Today's times updated" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e.message, variant: "destructive" });
    }
  };

  return (
    <DayEditorSheet
      open={open}
      onOpenChange={onOpenChange}
      date={today}
      day={resolved}
      saving={saving}
      onSave={handleSave}
    />
  );
}
