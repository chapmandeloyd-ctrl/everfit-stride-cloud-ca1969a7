import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { format, addDays, isSameDay } from "date-fns";

interface CalendarStripProps {
  activeDates?: Date[];
  onDateSelect?: (date: Date) => void;
}

export function CalendarStrip({ activeDates = [], onDateSelect }: CalendarStripProps) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);

  const days = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => addDays(today, i));
  }, []);

  const handleSelect = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  return (
    <div className="flex gap-2 overflow-x-auto py-1 px-1 no-scrollbar">
      {days.map((date) => {
        const isSelected = isSameDay(date, selectedDate);
        const isToday = isSameDay(date, today);
        const hasActivity = activeDates.some((d) => isSameDay(d, date));

        return (
          <button
            key={date.toISOString()}
            onClick={() => handleSelect(date)}
            className={cn(
              "flex flex-col items-center min-w-[3rem] py-2 px-2 rounded-2xl transition-all",
              isSelected
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "text-foreground hover:bg-muted"
            )}
          >
            <span className={cn(
              "text-[10px] font-semibold uppercase tracking-wider",
              isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
            )}>
              {format(date, "EEE")}
            </span>
            <span className={cn(
              "text-lg font-bold mt-0.5",
              isSelected ? "text-primary-foreground" : "text-foreground"
            )}>
              {format(date, "d")}
            </span>
            {/* Activity dot */}
            <div className={cn(
              "h-1.5 w-1.5 rounded-full mt-1",
              isSelected
                ? "bg-primary-foreground"
                : hasActivity
                  ? "bg-accent"
                  : "bg-transparent"
            )} />
          </button>
        );
      })}
    </div>
  );
}
