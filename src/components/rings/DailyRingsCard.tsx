import { Clock, Scale, Activity, Moon } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { MultiSegmentRing, RingSegment } from "@/components/rings/MultiSegmentRing";
import { cn } from "@/lib/utils";

/**
 * DailyRingsCard — Zero-style 4-ring tracker for the client home.
 *
 * Currently uses mocked completion data so the layout/colors can be
 * verified live as Dee. Real wiring (HealthKit + manual logs) lands next.
 */

type RingKey = "fasting" | "weight" | "activity" | "sleep";

interface RingDef {
  key: RingKey;
  label: string;
  goal: string;
  icon: React.ComponentType<{ className?: string }>;
  strokeClass: string;
  bgClass: string;
}

const RINGS: RingDef[] = [
  {
    key: "fasting",
    label: "Fasting",
    goal: "Fast 10h or more",
    icon: Clock,
    strokeClass: "stroke-daily-ring-fasting",
    bgClass: "bg-daily-ring-fasting",
  },
  {
    key: "weight",
    label: "Weight",
    goal: "Log a check-in",
    icon: Scale,
    strokeClass: "stroke-daily-ring-weight",
    bgClass: "bg-daily-ring-weight",
  },
  {
    key: "activity",
    label: "Activity",
    goal: "Hit your step goal",
    icon: Activity,
    strokeClass: "stroke-daily-ring-activity",
    bgClass: "bg-daily-ring-activity",
  },
  {
    key: "sleep",
    label: "Sleep",
    goal: "Sleep 6.5h or more",
    icon: Moon,
    strokeClass: "stroke-daily-ring-sleep",
    bgClass: "bg-daily-ring-sleep",
  },
];

// MOCK — today's completion (will be replaced with real data next)
const TODAY_COMPLETED: Record<RingKey, boolean> = {
  fasting: true,
  weight: false,
  activity: true,
  sleep: false,
};

// MOCK — past 7 days
const WEEK_COMPLETED: Record<number, Record<RingKey, boolean>> = {
  0: { fasting: false, weight: false, activity: false, sleep: false },
  1: { fasting: true,  weight: false, activity: false, sleep: false },
  2: { fasting: true,  weight: false, activity: true,  sleep: false },
  3: { fasting: false, weight: false, activity: false, sleep: false },
  4: { fasting: true,  weight: true,  activity: false, sleep: false },
  5: { fasting: true,  weight: false, activity: true,  sleep: false },
  6: { fasting: false, weight: false, activity: false, sleep: false },
};

function buildSegments(completed: Record<RingKey, boolean>): RingSegment[] {
  return RINGS.map((r) => ({
    key: r.key,
    colorClass: r.strokeClass,
    completed: completed[r.key],
  }));
}

function GoalCard({ ring, completed }: { ring: RingDef; completed: boolean }) {
  const Icon = ring.icon;
  return (
    <div className="space-y-2">
      <div className="relative inline-flex">
        <div
          className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center",
            completed ? ring.bgClass : "bg-white/5 border border-white/10"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              completed ? "text-black" : "text-white/40"
            )}
          />
        </div>
        {completed && (
          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-daily-ring-fasting border-2 border-black flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-black" />
          </div>
        )}
      </div>
      <div>
        <p
          className={cn(
            "text-base font-bold",
            completed ? "text-white" : "text-white/40"
          )}
        >
          {ring.label}
        </p>
        <p className="text-xs text-white/40 leading-tight mt-0.5">{ring.goal}</p>
      </div>
    </div>
  );
}

function WeekStrip() {
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="flex justify-between px-1">
      {days.map((d, i) => {
        const isToday =
          format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
        const dayCompleted =
          WEEK_COMPLETED[i] ?? {
            fasting: false,
            weight: false,
            activity: false,
            sleep: false,
          };
        const segs = buildSegments(dayCompleted);
        return (
          <div key={d.toISOString()} className="flex flex-col items-center gap-2">
            <span
              className={cn(
                "text-[11px] font-bold uppercase tracking-[0.18em]",
                isToday ? "text-daily-ring-fasting" : "text-white/40"
              )}
            >
              {format(d, "EEE")}
            </span>
            <MultiSegmentRing segments={segs} size={26} strokeWidth={4} />
          </div>
        );
      })}
    </div>
  );
}

export function DailyRingsCard() {
  const segments = buildSegments(TODAY_COMPLETED);
  const count = segments.filter((s) => s.completed).length;
  return (
    <div className="rounded-3xl bg-black p-6 space-y-6 border border-daily-ring-fasting/20">
      <WeekStrip />
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 pt-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-daily-ring-fasting">
            {format(new Date(), "MMMM d, yyyy")}
          </p>
          <h2 className="text-3xl font-serif mt-2 leading-tight text-white">
            <span className="text-white/50">{count} of 4</span>
            <br />
            Rings
          </h2>
          <p className="text-sm text-white/60 mt-3 max-w-[200px]">
            You're making great progress — let's do this!
          </p>
        </div>
        <MultiSegmentRing segments={segments} size={130} strokeWidth={20} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 pt-2">
        {RINGS.map((r) => (
          <GoalCard
            key={r.key}
            ring={r}
            completed={TODAY_COMPLETED[r.key]}
          />
        ))}
      </div>
    </div>
  );
}