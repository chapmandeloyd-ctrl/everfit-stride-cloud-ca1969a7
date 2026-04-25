import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Scale, Activity, Moon, ChevronRight } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MultiSegmentRing, RingSegment } from "@/components/rings/MultiSegmentRing";
import { cn } from "@/lib/utils";

/**
 * Demo page — shows all 3 placement options for the Zero-style 4-ring system
 * stacked vertically so the user can pick. Mocked data only.
 */

type RingKey = "fasting" | "weight" | "activity" | "sleep";

interface RingDef {
  key: RingKey;
  label: string;
  goal: string;
  icon: React.ComponentType<{ className?: string }>;
  /** stroke-* class for the ring slice */
  strokeClass: string;
  /** bg-* class for the icon when completed */
  bgClass: string;
  /** text-* class for the icon when completed */
  textClass: string;
}

const RINGS: RingDef[] = [
  {
    key: "fasting",
    label: "Fasting",
    goal: "Fast 10h or more",
    icon: Clock,
    // Signature warm gold (matches screenshot)
    strokeClass: "[stroke:hsl(43_65%_52%)]",
    bgClass: "[background-color:hsl(43_65%_52%)]",
    textClass: "[color:hsl(43_65%_52%)]",
  },
  {
    key: "weight",
    label: "Weight",
    goal: "Log a check-in",
    icon: Scale,
    // Trainerize orange
    strokeClass: "[stroke:hsl(28_92%_58%)]",
    bgClass: "[background-color:hsl(28_92%_58%)]",
    textClass: "[color:hsl(28_92%_58%)]",
  },
  {
    key: "activity",
    label: "Activity",
    goal: "Hit your step goal",
    icon: Activity,
    // Trainerize green
    strokeClass: "[stroke:hsl(142_55%_50%)]",
    bgClass: "[background-color:hsl(142_55%_50%)]",
    textClass: "[color:hsl(142_55%_50%)]",
  },
  {
    key: "sleep",
    label: "Sleep",
    goal: "Sleep 6.5h or more",
    icon: Moon,
    // Trainerize coral red/pink
    strokeClass: "[stroke:hsl(353_85%_68%)]",
    bgClass: "[background-color:hsl(353_85%_68%)]",
    textClass: "[color:hsl(353_85%_68%)]",
  },
];

// Mocked: today user has completed Fasting + Activity (2 of 4)
const TODAY_COMPLETED: Record<RingKey, boolean> = {
  fasting: true,
  weight: true,
  activity: true,
  sleep: true,
};

// Mocked per-day completions for the weekday strip
const WEEK_COMPLETED: Record<number, Record<RingKey, boolean>> = {
  0: { fasting: false, weight: false, activity: false, sleep: false }, // Sun
  1: { fasting: true,  weight: false, activity: false, sleep: false }, // Mon
  2: { fasting: true,  weight: false, activity: false, sleep: false }, // Tue
  3: { fasting: false, weight: false, activity: false, sleep: false }, // Wed
  4: { fasting: false, weight: false, activity: false, sleep: false }, // Thu
  5: { fasting: true,  weight: true,  activity: false, sleep: false }, // Fri (today demo)
  6: { fasting: false, weight: false, activity: false, sleep: false }, // Sat
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
          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full [background-color:hsl(43_65%_52%)] border-2 border-black flex items-center justify-center">
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
        <p className="text-xs text-white/40 leading-tight mt-0.5">
          {ring.goal}
        </p>
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
        const isToday = format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
        const dayCompleted = WEEK_COMPLETED[i] ?? {
          fasting: false, weight: false, activity: false, sleep: false,
        };
        const segs = buildSegments(dayCompleted);
        return (
          <div
            key={d.toISOString()}
            className="flex flex-col items-center gap-2"
          >
            <span
              className={cn(
                "text-[11px] font-bold uppercase tracking-[0.18em]",
                isToday ? "[color:hsl(43_65%_52%)]" : "text-white/40"
              )}
            >
              {format(d, "EEE")}
            </span>
            <MultiSegmentRing
              segments={segs}
              size={26}
              strokeWidth={4}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ---------- OPTION A — Full Zero layout ---------- */
function OptionA() {
  const segments = buildSegments(TODAY_COMPLETED);
  const count = segments.filter((s) => s.completed).length;
  return (
    <div className="rounded-3xl bg-black p-6 space-y-6 border border-[hsl(43_65%_52%)]/20">
      <WeekStrip />
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 pt-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] [color:hsl(43_65%_52%)]">
            {format(new Date(), "MMMM d, yyyy")}
          </p>
          <h2 className="text-3xl font-serif mt-2 leading-tight text-white">
            <span className="text-white/50">{count} of 4</span>{" "}
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
          <GoalCard key={r.key} ring={r} completed={TODAY_COMPLETED[r.key]} />
        ))}
      </div>
    </div>
  );
}

/* ---------- OPTION B — Compact card on home ---------- */
function OptionB() {
  const segments = buildSegments(TODAY_COMPLETED);
  const count = segments.filter((s) => s.completed).length;
  return (
    <Card className="p-4 flex items-center gap-4 bg-card border-border">
      <MultiSegmentRing segments={segments} size={64} strokeWidth={10} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Today
        </p>
        <p className="text-lg font-bold leading-tight">
          {count} of 4 Rings
        </p>
        <div className="flex gap-1.5 mt-2">
          {RINGS.map((r) => {
            const Icon = r.icon;
            const done = TODAY_COMPLETED[r.key];
            return (
              <div
                key={r.key}
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center",
                  done ? r.bgClass : "bg-muted"
                )}
              >
                <Icon
                  className={cn(
                    "h-3 w-3",
                    done ? "text-white" : "text-muted-foreground"
                  )}
                />
              </div>
            );
          })}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </Card>
  );
}

/* ---------- OPTION C — Dedicated page entry tile ---------- */
function OptionC() {
  const segments = buildSegments(TODAY_COMPLETED);
  const count = segments.filter((s) => s.completed).length;
  return (
    <button className="w-full rounded-3xl bg-gradient-to-br from-card to-muted/30 p-5 border border-border text-left hover:border-primary/40 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Daily Rings
          </p>
          <p className="text-2xl font-bold mt-1">{count} of 4</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tap to view full ring tracker
          </p>
        </div>
        <div className="relative">
          <MultiSegmentRing segments={segments} size={80} strokeWidth={12} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold">{count}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function ClientRingsDemo() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/client/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Rings — 3 placements</h1>
            <p className="text-xs text-muted-foreground">
              Mocked: today = 2 of 4 (Fasting + Activity)
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8 max-w-md mx-auto">
        <section className="space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Option A
            </p>
            <h2 className="text-base font-bold">
              Full Zero layout (replaces top of home)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Big ring + weekday strip + 4 goal cards. Most Zero-like, most disruptive.
            </p>
          </div>
          <OptionA />
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Option B
            </p>
            <h2 className="text-base font-bold">
              Compact ring card (added to existing home)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Small card slots into current home. Tap opens full view. Least disruptive.
            </p>
          </div>
          <OptionB />
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Option C
            </p>
            <h2 className="text-base font-bold">
              Entry tile → dedicated /client/rings page
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Clean tile on home, full Zero layout lives on its own page.
            </p>
          </div>
          <OptionC />
        </section>
      </div>
    </div>
  );
}
