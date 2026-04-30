import { useMemo } from "react";
import { useSleepSessions } from "@/hooks/useSleepSessions";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  clientId: string;
  days: number;
}

/**
 * Apple-Health-style "Sleep Times" chart: vertical bars showing the
 * bedtime → wake interval per night. X axis = night, Y axis = clock hours
 * (6pm at top → 6pm next day at bottom, since most sleep crosses midnight).
 *
 * Renders an empty state when no `sleep_sessions` rows exist yet — those
 * are populated automatically by the native HealthKit sync.
 */
export function SleepTimesChart({ clientId, days }: Props) {
  const { data: sessions, isLoading } = useSleepSessions(clientId, days);

  // Group sessions by "night" (date of started_at, in local tz).
  const nights = useMemo(() => {
    if (!sessions) return [];
    const map = new Map<
      string,
      { date: string; startMin: number; endMin: number }
    >();
    for (const s of sessions) {
      const start = new Date(s.started_at);
      const end = new Date(s.ended_at);
      // "Night key" = the date the user went to bed
      const key = start.toLocaleDateString("en-CA"); // YYYY-MM-DD local
      // Convert to minutes-from-6pm so midnight=360, 6am=720, 6pm=0
      const startMin =
        ((start.getHours() - 18 + 24) % 24) * 60 + start.getMinutes();
      let endMin = ((end.getHours() - 18 + 24) % 24) * 60 + end.getMinutes();
      // If end happens on the same calendar day as start (rare), still keep > start
      if (endMin <= startMin) endMin += 24 * 60;
      const existing = map.get(key);
      if (existing) {
        existing.startMin = Math.min(existing.startMin, startMin);
        existing.endMin = Math.max(existing.endMin, endMin);
      } else {
        map.set(key, { date: key, startMin, endMin });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [sessions]);

  // Y-axis labels: 6pm, 10pm, 2am, 6am, 10am, 2pm, 6pm — 24 hrs starting at 6pm
  const hourLabels = ["6pm", "10pm", "2am", "6am", "10am", "2pm", "6pm"];
  const TOTAL_MIN = 24 * 60;
  const CHART_HEIGHT = 200;

  if (isLoading) {
    return <Skeleton className="h-56 w-full" />;
  }

  if (nights.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 text-center">
        <div className="text-sm text-muted-foreground">
          No bedtime/wake data yet
        </div>
        <div className="mt-1 text-xs text-muted-foreground/70">
          This chart populates automatically once Apple Health syncs your sleep
          intervals.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex">
        {/* Y axis labels */}
        <div
          className="flex flex-col justify-between pr-2 text-[10px] text-muted-foreground"
          style={{ height: CHART_HEIGHT }}
        >
          {hourLabels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>

        {/* Bars area */}
        <div
          className="relative flex-1"
          style={{ height: CHART_HEIGHT }}
        >
          {/* Horizontal gridlines */}
          {hourLabels.map((_, i) => (
            <div
              key={i}
              className="absolute inset-x-0 border-t border-border/40"
              style={{ top: `${(i / (hourLabels.length - 1)) * 100}%` }}
            />
          ))}

          {/* Bars */}
          <div className="absolute inset-0 flex items-end justify-around gap-1 px-1">
            {nights.map((n) => {
              const top = (n.startMin / TOTAL_MIN) * 100;
              const height = ((n.endMin - n.startMin) / TOTAL_MIN) * 100;
              return (
                <div
                  key={n.date}
                  className="relative flex-1 max-w-[14px]"
                  style={{ height: "100%" }}
                  title={`${new Date(n.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })} • ${formatHM(n.startMin)} → ${formatHM(n.endMin)}`}
                >
                  <div
                    className="absolute inset-x-0 rounded-sm bg-primary/80"
                    style={{
                      top: `${top}%`,
                      height: `${Math.max(height, 1.5)}%`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatHM(minFrom6pm: number): string {
  const total = (minFrom6pm + 18 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")}${ampm}`;
}
