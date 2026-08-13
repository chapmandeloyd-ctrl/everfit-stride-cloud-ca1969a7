import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Sparkles } from "lucide-react";
import { CalendarStripTourSheet } from "@/components/client/CalendarStripTourSheet";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useClientWeeklySchedule } from "@/hooks/useClientWeeklySchedule";
import { resolveDayState, type ResolvedDay } from "@/lib/resolveFastingWindow";
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
  const { weekly, overrides, planWindow } = useClientWeeklySchedule(clientId);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);
  const [tourOpen, setTourOpen] = useState(false);

  const dotColor = (r: ResolvedDay) => {
    if (r.state !== "scheduled" || !r.day) return "hsl(var(--muted-foreground) / 0.4)";
    const d = r.day;
    if (d.ratio === "eat_all_day") return "hsl(48 96% 53%)";
    if (d.ratio === "omad") return "hsl(280 80% 62%)";
    if (d.ratio === "20:4") return "hsl(var(--primary))";
    if (d.ratio === "18:6") return "hsl(217 91% 60%)";
    return "hsl(142 71% 45%)";
  };

  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const today = new Date();
  const todayKey = dateKey(today);

  // Scrollable range: 3 days back through 17 days ahead
  const days = Array.from({ length: 21 }).map((_, idx) => {
    const offset = idx - 3;
    const date = addDays(today, offset);
    return { date, offset, resolved: resolveDayState(weekly, overrides, date, planWindow) };
  });

  useEffect(() => {
    todayRef.current?.scrollIntoView({ inline: "start", block: "nearest" });
  }, []);

  const headerLabel = today.toLocaleDateString(undefined, { month: "long", day: "numeric" });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-lg font-bold tracking-tight text-foreground">{headerLabel}</h2>
        <button
          onClick={() => navigate("/client/calendar")}
          className="flex items-center gap-2 text-sm font-semibold text-primary"
        >
          Today
          <CalendarDays className="h-5 w-5" />
        </button>
      </div>

      <p className="px-0.5 text-[11px] leading-relaxed text-muted-foreground">
        Your week at a glance. Each dot color shows the fasting plan for that day — tap any day to preview or edit it. Days outside your program are dimmed.
      </p>

      <button
        onClick={() => setTourOpen(true)}
        className="flex items-center gap-1.5 px-0.5 text-[11px] font-semibold text-primary"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Click here to learn about the calendar strip
      </button>

      <div
        ref={scrollRef}
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map(({ date, offset, resolved }) => {
          const color = dotColor(resolved);
          const muted = resolved.state === "out_of_plan";
          const isToday = dateKey(date) === todayKey;
          return (
            <button
              key={dateKey(date)}
              ref={isToday ? todayRef : undefined}
              onClick={() =>
                onDayClick
                  ? onDayClick(date, offset)
                  : navigate(`/client/calendar?date=${dateKey(date)}`)
              }
              className={`flex h-[62px] w-[52px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border transition-colors ${
                isToday
                  ? "border-primary bg-primary/15"
                  : "border-border/60 bg-card/40 active:bg-primary/10"
              } ${muted ? "opacity-40" : ""}`}
            >
              <span
                className={`text-lg font-bold leading-none ${
                  isToday ? "text-primary" : "text-foreground"
                }`}
              >
                {date.getDate()}
              </span>
              <span
                className={`text-[11px] leading-none ${
                  isToday ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {DOW[date.getDay()]}
              </span>
              <span
                className="mt-0.5 h-1.5 w-1.5 rounded-full"
                style={{ background: color, boxShadow: isToday ? `0 0 6px ${color}` : undefined }}
              />
            </button>
          );
        })}
      </div>

      <CalendarStripTourSheet open={tourOpen} onOpenChange={setTourOpen} />
    </div>
  );
}
