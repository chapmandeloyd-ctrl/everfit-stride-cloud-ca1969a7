import { useClientComputedPlan } from "@/hooks/useClientComputedPlan";

/**
 * Ultra-compact 7-day dot strip for the top of the client dashboard.
 * Shows next 7 days with color-coded dots (fast/eat/low-cal/refeed) so
 * clients can see the shape of their week at a glance above the lion timer.
 */
export function ClientWeekStrip() {
  const { plan, dayIndex } = useClientComputedPlan();
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
      <div className="grid grid-cols-7 gap-1">
        {window.map(({ d, i, idx }) => {
          const color = dotColor(d);
          const isToday = i === 0;
          return (
            <div
              key={`${d.day}-${idx}`}
              className={`flex flex-col items-center gap-0.5 py-0.5 rounded ${
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
            </div>
          );
        })}
      </div>
    </div>
  );
}