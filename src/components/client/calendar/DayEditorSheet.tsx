import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, CalendarDays, CupSoda } from "lucide-react";
import { StartJuiceFastSheet } from "@/components/client/juice/StartJuiceFastSheet";
import { useJuiceFast } from "@/hooks/useJuiceFast";
import { useAuth } from "@/hooks/useAuth";
import {
  RATIOS,
  RATIO_LABEL,
  RATIO_DESCRIPTION,
  RATIO_BEST_FOR,
  RATIO_SHORT,
  computeEnd,
  defaultWeek,
  formatHour,
  timeToHour,
  breakFastHourFor,
  type FastRatio,
  type WeeklyScheduleDay,
} from "./calendarUtils";

export type ApplyScope = "day" | "weekdays" | "weekends" | "week";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: Date | null;
  day: WeeklyScheduleDay | null;
  saving?: boolean;
  onSave: (day: WeeklyScheduleDay, scope: ApplyScope) => void;
}

const SCOPES: { id: ApplyScope; label: string }[] = [
  { id: "day", label: "This day only" },
  { id: "weekdays", label: "All weekdays" },
  { id: "weekends", label: "All weekends" },
  { id: "week", label: "Every day" },
];

export default function DayEditorSheet({
  open,
  onOpenChange,
  date,
  day,
  saving,
  onSave,
}: Props) {
  const base = day ?? defaultWeek()[date ? date.getDay() : 0];
  const [ratio, setRatio] = useState<FastRatio>(base.ratio);
  const [start, setStart] = useState(base.window_start_time.slice(0, 5));
  const [rest, setRest] = useState(base.enabled === false);
  const [scope, setScope] = useState<ApplyScope>("day");
  const [juiceOpen, setJuiceOpen] = useState(false);
  const { session: juiceSession, startFast } = useJuiceFast();
  const { userRole } = useAuth();

  useEffect(() => {
    if (!open) return;
    setRatio(base.ratio);
    setStart(base.window_start_time.slice(0, 5));
    setRest(base.enabled === false);
    setScope("day");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date?.toDateString()]);

  const startHour = timeToHour(`${start}:00`);
  const breaks = breakFastHourFor(ratio, startHour);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl px-4 pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-4 w-4 text-primary" />
            {date?.toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </SheetTitle>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Adjust just this day, or apply the same change to matching days (weekdays, weekends, or every day).
            Your full program stays the same unless you open <strong>Build My Plan</strong>.
          </p>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <button
            onClick={() => setRest((r) => !r)}
            className={`w-full rounded-2xl border px-4 py-3 text-left text-sm ${
              rest
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-muted/20 text-muted-foreground"
            }`}
          >
            <span className="font-semibold">Rest day</span>
            <span className="block text-xs opacity-70">
              No fast scheduled — the day is skipped entirely and nothing counts against you.
            </span>
          </button>

          {!rest && (
            <>
              <div>
                <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Fasting ratio
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {RATIOS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRatio(r)}
                      className={`rounded-xl border px-3 py-2.5 text-left ${
                        ratio === r
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border bg-muted/20 text-muted-foreground"
                      }`}
                    >
                      <span className="block text-sm font-semibold">{RATIO_LABEL[r]}</span>
                      <span className="mt-0.5 block text-[10px] leading-tight opacity-70">
                        {RATIO_SHORT[r]}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-2 rounded-xl border border-border/60 bg-muted/10 p-3">
                  <p className="text-xs leading-relaxed text-foreground/90">
                    {RATIO_DESCRIPTION[ratio]}
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-primary/90">
                    {RATIO_BEST_FOR[ratio]}
                  </p>
                </div>
              </div>

              {ratio !== "eat_all_day" && (
                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Fast starts
                  </div>
                  <Input
                    type="time"
                    step={60}
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="mt-1 h-12 text-lg font-semibold"
                  />
                  <div className="mt-2 text-sm text-muted-foreground">
                    Breaks at <span className="font-semibold text-foreground">{formatHour(breaks)}</span>
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              Apply to
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SCOPES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScope(s.id)}
                  className={`rounded-xl border py-3 text-xs font-semibold ${
                    scope === s.id
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border bg-muted/20 text-muted-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            size="lg"
            disabled={saving}
            onClick={() =>
              onSave(
                {
                  day_of_week: date ? date.getDay() : 0,
                  ratio,
                  window_start_time: `${start}:00`,
                  window_end_time: computeEnd(ratio, `${start}:00`),
                  enabled: !rest,
                },
                scope,
              )
            }
            className="h-14 w-full rounded-2xl text-base font-semibold"
          >
            <Check className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save"}
          </Button>

          {!juiceSession && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="text-sm font-semibold text-emerald-300">Doing a juice fast instead?</div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                A juice fast runs across multiple days, so it isn't a single-day ratio. Start it here and it
                takes over your dashboard and timeline until it's done.
              </p>
              <Button
                variant="outline"
                className="mt-3 w-full border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
                onClick={() => setJuiceOpen(true)}
              >
                <CupSoda className="mr-2 h-4 w-4" /> Start a juice fast
              </Button>
            </div>
          )}
        </div>
      </SheetContent>

      <StartJuiceFastSheet
        open={juiceOpen}
        onOpenChange={setJuiceOpen}
        isTrainer={userRole === "trainer"}
        starting={startFast.isPending}
        onStart={(input) =>
          startFast.mutate(input, {
            onSuccess: () => {
              setJuiceOpen(false);
              onOpenChange(false);
            },
          })
        }
      />
    </Sheet>
  );
}