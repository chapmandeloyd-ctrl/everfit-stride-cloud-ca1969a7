import { Clock, Scale, Activity, Moon, Droplet, ChevronDown } from "lucide-react";
import { format, addDays, startOfWeek, isFuture } from "date-fns";
import { useState } from "react";
import { MultiSegmentRing, RingSegment } from "@/components/rings/MultiSegmentRing";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { useDailyRings, type DayCompletion } from "@/hooks/useDailyRings";

/**
 * DailyRingsCard — Zero-style 4-ring tracker for the client home.
 *
 * Currently uses mocked completion data so the layout/colors can be
 * verified live as Dee. Real wiring (HealthKit + manual logs) lands next.
 */

type RingKey = "fasting" | "weight" | "activity" | "sleep" | "water";

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
    label: "Steps",
    goal: "Hit your daily step goal",
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
  {
    key: "water",
    label: "Water",
    goal: "Hit your hydration goal",
    icon: Droplet,
    strokeClass: "stroke-daily-ring-water",
    bgClass: "bg-daily-ring-water",
  },
];

const EMPTY_DAY: DayCompletion = {
  fasting: false,
  weight: false,
  activity: false,
  sleep: false,
  water: false,
};

function buildSegments(completed: Record<RingKey, boolean>): RingSegment[] {
  return RINGS.map((r) => ({
    key: r.key,
    colorClass: r.strokeClass,
    completed: completed[r.key],
  }));
}

function copyForCount(count: number): string {
  if (count === 5) return "Perfect day — every ring closed!";
  if (count > 0) return "You're making great progress — let's do this!";
  return "A fresh start. One ring at a time.";
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

/**
 * Drop-down panel showing the ring breakdown for the selected day.
 * Renders directly under the pinned weekday strip.
 */
/**
 * Full-height day detail — mirrors the main DailyRingsCard layout
 * (date headline, big ring, "X of 4 Rings", message, full goals grid).
 * Rendered inside a bottom Drawer that fills ~92% of the viewport.
 */
function DayDetailFull({
  date,
  completed,
}: {
  date: Date;
  completed: Record<RingKey, boolean>;
}) {
  const segs = buildSegments(completed);
  const count = segs.filter((s) => s.completed).length;
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Swipe-down hint */}
      <div className="flex flex-col items-center gap-1 pt-2 pb-3 text-white/40">
        <ChevronDown className="h-4 w-4 animate-bounce" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]">
          Swipe down to dismiss
        </span>
      </div>

      {/* Headline + big ring */}
      <div className="px-6 pt-2 pb-4 flex items-start justify-between gap-4">
        <div className="flex-1 pt-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-daily-ring-fasting">
            {format(date, "MMMM d, yyyy")}
          </p>
          <h2 className="text-3xl font-serif mt-2 leading-tight text-white">
            <span className="text-white/50">{count} of 5</span>
            <br />
            Rings
          </h2>
          <p className="text-sm text-white/60 mt-3 max-w-[200px]">
            {count === 5
              ? "Perfect day — every ring closed!"
              : count > 0
              ? "You're making great progress — let's do this!"
              : "A fresh start. One ring at a time."}
          </p>
        </div>
        <MultiSegmentRing segments={segs} size={130} strokeWidth={20} />
      </div>

      {/* Goals grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 px-6 pt-2 pb-10">
        {RINGS.map((r) => (
          <GoalCard key={r.key} ring={r} completed={completed[r.key]} />
        ))}
      </div>
    </div>
  );
}

/**
 * Pinned weekday strip (sticky at top of dashboard).
 * Tap a day → drops down a panel with that day's ring status.
 * Tap the same day again → collapses.
 */
export function DailyRingsPinnedHeader() {
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const { data } = useDailyRings();
  const byDate = data?.byDate ?? {};

  const selectedDate = selectedIdx != null ? days[selectedIdx] : null;
  const selectedCompleted =
    selectedDate != null
      ? byDate[format(selectedDate, "yyyy-MM-dd")] ?? { ...EMPTY_DAY }
      : null;

  return (
    <>
      <div className="sticky top-0 z-30 -mx-4 -mt-4 mb-2 bg-black border-b border-white/10 shadow-lg shadow-black/40">
        <div className="px-4 pt-3 pb-3">
          <div className="flex justify-between px-1">
            {days.map((d, i) => {
              const isToday =
                format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
              const isSelected = selectedIdx === i;
              const future = isFuture(d) && !isToday;
              const dayCompleted =
                byDate[format(d, "yyyy-MM-dd")] ?? { ...EMPTY_DAY };
              const segs = buildSegments(dayCompleted);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  disabled={future}
                  onClick={() => setSelectedIdx(i)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors",
                    isSelected && "bg-white/15",
                    future && "opacity-40 cursor-not-allowed"
                  )}
                  aria-label={`View rings for ${format(d, "EEEE, MMM d")}`}
                >
                  <span
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-[0.18em]",
                      isToday
                        ? "text-daily-ring-fasting"
                        : isSelected
                        ? "text-white"
                        : "text-white/70"
                    )}
                  >
                    {format(d, "EEE")}
                  </span>
                  <MultiSegmentRing segments={segs} size={26} strokeWidth={4} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Drawer
        open={selectedIdx !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedIdx(null);
        }}
      >
        <DrawerContent className="bg-black border-white/10 text-white h-[92vh] max-h-[92vh] mt-0">
          <DrawerHeader className="sr-only">
            <DrawerTitle>
              {selectedDate ? format(selectedDate, "EEEE, MMM d") : "Day detail"}
            </DrawerTitle>
          </DrawerHeader>
          {selectedDate && selectedCompleted && (
            <DayDetailFull date={selectedDate} completed={selectedCompleted} />
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}

export function DailyRingsCard() {
  const { data } = useDailyRings();
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayCompleted = data?.byDate[todayKey] ?? { ...EMPTY_DAY };
  const segments = buildSegments(todayCompleted);
  const count = segments.filter((s) => s.completed).length;
  return (
    <div className="rounded-3xl bg-black p-6 space-y-6 border border-daily-ring-fasting/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 pt-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-daily-ring-fasting">
            {format(new Date(), "MMMM d, yyyy")}
          </p>
          <h2 className="text-3xl font-serif mt-2 leading-tight text-white">
            <span className="text-white/50">{count} of 5</span>
            <br />
            Rings
          </h2>
          <p className="text-sm text-white/60 mt-3 max-w-[200px]">
            {copyForCount(count)}
          </p>
        </div>
        <MultiSegmentRing segments={segments} size={130} strokeWidth={20} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 pt-2">
        {RINGS.map((r) => (
          <GoalCard
            key={r.key}
            ring={r}
            completed={todayCompleted[r.key]}
          />
        ))}
      </div>
    </div>
  );
}