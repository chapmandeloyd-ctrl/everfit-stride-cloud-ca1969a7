import { useNavigate } from "react-router-dom";
import { CalendarDays, ChevronRight } from "lucide-react";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useClientWeeklySchedule } from "@/hooks/useClientWeeklySchedule";
import { resolveDayForDate, type WeeklyScheduleDay } from "@/lib/resolveFastingWindow";
import { addDays, dateKey } from "@/components/client/calendar/calendarUtils";

interface ClientWeekStripProps {
  /** Called when a day dot is tapped. Defaults to navigating to the calendar. */
  onDayClick?: (date: Date, dayIndex: number) => void;
}

/**
 * Ultra-compact 7-day dot strip for the top of the client dashboard.
 * Shows next 7 days with color-coded dots (fast/eat/low-cal/refeed) so
 * clients can see the shape of their week at a glance above the lion timer.
 * Tapping a day dot opens the day detail sheet when onDayClick is provided.
 */
export function ClientWeekStrip({ onDayClick }: ClientWeekStripProps) {
  const clientId = useEffectiveClientId();
  const { weekly, overrides } = useClientWeeklySchedule(clientId);
  const navigate = useNavigate();

  const dotColor = (d: WeeklyScheduleDay | null) => {
    if (!d || d.enabled === false) return "hsl(var(--muted-foreground))";
    if (d.ratio === "eat_all_day") return "hsl(48 96% 53%)";
    if (d.ratio === "20:4") return "hsl(var(--primary))";
    if (d.ratio === "18:6") return "hsl(217 91% 60%)";
    return "hsl(142 71% 45%)";
  };

  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Next 7 days, today first
  const days = Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(new Date(), i);
    return { date, i, day: resolveDayForDate(weekly, overrides, date) };
  });

  return (
    <div className="rounded-lg border border-border/50 bg-card/40 px-2.5 py-1.5">
      <button
        onClick={() => navigate("/client/calendar")}
        className="mb-1 flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3" /> My Fasting Calendar
        </span>
        <span className="flex items-center gap-0.5 text-primary">
          Edit <ChevronRight className="h-3 w-3" />
        </span>
      </button>
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ date, i, day }) => {
          const color = dotColor(day);
          const isToday = i === 0;
          return (
            <button
              key={dateKey(date)}
              onClick={() =>
                onDayClick ? onDayClick(date, i) : navigate(`/client/calendar?date=${dateKey(date)}`)
              }
              className={`flex flex-col items-center gap-0.5 py-0.5 rounded transition-colors active:bg-primary/20 ${
                isToday ? "bg-primary/10" : ""
              }`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: color,
                  boxShadow: isToday ? `0 0 6px ${color}` : undefined,
                }}
              />
              <span
                className={`text-[8px] leading-none ${
                  isToday ? "text-primary font-bold" : "text-muted-foreground"
                }`}
              >
                {isToday ? "Today" : DOW[date.getDay()]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
