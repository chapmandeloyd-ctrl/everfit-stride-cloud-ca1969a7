import { useNavigate } from "react-router-dom";
import { CalendarDays, ChevronRight } from "lucide-react";
import { useClientComputedPlan } from "@/hooks/useClientComputedPlan";
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
  const { plan, dayIndex } = useClientComputedPlan();
  const navigate = useNavigate();
  if (!plan || plan.days.length <= 1) return null;

  const dotColor = (d: (typeof plan.days)[number]) => {
    if (d.adFast) return "hsl(var(--primary))";
    if (d.isRefeed) return "hsl(217 91% 60%)";
    if (d.fastWindow.toLowerCase().startsWith("low-cal")) return "hsl(48 96% 53%)";
    return "hsl(142 71% 45%)";
  };

  // Show up to next 7 days rotated so today is first
  const window = Array.from({ length: Math.min(7, plan.days.length) }).map((_, i) => {
    const idx = (dayIndex + i) % plan.days.length;
    return { d: plan.days[idx], i, idx };
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
        {window.map(({ d, i, idx }) => {
          const color = dotColor(d);
          const isToday = i === 0;
          const date = addDays(new Date(), i);
          return (
            <button
              key={`${d.day}-${idx}`}
              onClick={() =>
                onDayClick ? onDayClick(date, idx) : navigate(`/client/calendar?date=${dateKey(date)}`)
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
                {isToday ? "Today" : d.day.replace(/\s.*/, "").slice(0, 3)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
