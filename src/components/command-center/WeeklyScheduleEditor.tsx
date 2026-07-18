import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { useClientWeeklySchedule, WEEKDAY_LABELS } from "@/hooks/useClientWeeklySchedule";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  RATIO_LABEL,
  RATIO_EAT_HOURS,
  type FastRatio,
  type ScheduleOverride,
  type WeeklyScheduleDay,
  timeToHour,
  formatHour,
  endHourFor,
} from "@/lib/resolveFastingWindow";
import { toast } from "@/hooks/use-toast";

const RATIOS: FastRatio[] = ["16:8", "18:6", "20:4", "eat_all_day"];
// Render Mon-Sun order regardless of storage order
const RENDER_ORDER = [1, 2, 3, 4, 5, 6, 0];

function defaultWeek(): WeeklyScheduleDay[] {
  return Array.from({ length: 7 }, (_, dow) => ({
    day_of_week: dow,
    ratio: "16:8" as FastRatio,
    window_start_time: "12:00:00",
    window_end_time: "20:00:00",
    enabled: true,
  }));
}

function normalizeTime(v: string): string {
  // "HH:MM" -> "HH:MM:00"
  if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
  return v;
}

function timeInputValue(v: string): string {
  return v.slice(0, 5);
}

function computeEnd(ratio: FastRatio, startTime: string): string {
  const startHour = timeToHour(startTime);
  const endHour = endHourFor(ratio, startHour);
  const hr = Math.floor(endHour);
  const min = Math.round((endHour - hr) * 60);
  return `${String(hr).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
}

function DayRow({
  day,
  onChange,
  offDay,
}: {
  day: WeeklyScheduleDay;
  onChange: (d: WeeklyScheduleDay) => void;
  offDay?: boolean;
}) {
  const isEatAll = day.ratio === "eat_all_day";
  const startHour = timeToHour(day.window_start_time);
  const endHour = endHourFor(day.ratio, startHour);
  return (
    <div
      className={`flex flex-wrap items-center gap-2 py-2 border-b border-border/40 last:border-b-0 ${
        offDay ? "opacity-40" : ""
      }`}
    >
      <div className="w-10 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {WEEKDAY_LABELS[day.day_of_week]}
      </div>
      {offDay && (
        <Badge variant="outline" className="text-[9px] uppercase tracking-wider">
          Off-day
        </Badge>
      )}
      <Select
        value={day.ratio}
        disabled={offDay}
        onValueChange={(v) => {
          const ratio = v as FastRatio;
          onChange({
            ...day,
            ratio,
            window_end_time: computeEnd(ratio, day.window_start_time),
          });
        }}
      >
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RATIOS.map((r) => (
            <SelectItem key={r} value={r} className="text-xs">
              {RATIO_LABEL[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!isEatAll ? (
        <>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Starts
          </span>
          <Input
            type="time"
            value={timeInputValue(day.window_start_time)}
            step={60}
            disabled={offDay}
            onChange={(e) => {
              const t = normalizeTime(e.target.value);
              onChange({
                ...day,
                window_start_time: t,
                window_end_time: computeEnd(day.ratio, t),
              });
            }}
            className="h-8 w-[110px] text-xs"
          />
          <span className="text-xs text-muted-foreground tabular-nums">
            → {formatHour(endHour)}
          </span>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">No fasting this day</span>
      )}
    </div>
  );
}

function WeekGrid({
  value,
  onChange,
  activeDows,
}: {
  value: WeeklyScheduleDay[];
  onChange: (v: WeeklyScheduleDay[]) => void;
  activeDows?: Set<number> | null;
}) {
  const byDow = new Map(value.map((d) => [d.day_of_week, d]));
  return (
    <div className="space-y-0.5">
      {RENDER_ORDER.filter((dow) => !activeDows || activeDows.has(dow)).map((dow) => {
        const d = byDow.get(dow) ?? {
          day_of_week: dow,
          ratio: "16:8" as FastRatio,
          window_start_time: "12:00:00",
          window_end_time: "20:00:00",
          enabled: true,
        };
        return (
          <DayRow
            key={dow}
            day={d}
            offDay={false}
            onChange={(nd) => {
              const next = value.filter((x) => x.day_of_week !== dow).concat(nd);
              next.sort((a, b) => a.day_of_week - b.day_of_week);
              onChange(next);
            }}
          />
        );
      })}
    </div>
  );
}

function OverrideCard({
  override,
  onSave,
  onDelete,
}: {
  override: ScheduleOverride;
  onSave: (o: ScheduleOverride) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<ScheduleOverride>(override);
  useEffect(() => setDraft(override), [override]);
  const today = new Date().toISOString().slice(0, 10);
  const isActive =
    draft.active && today >= draft.start_date && today <= draft.end_date;
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              className="h-8 w-[180px] text-sm font-semibold"
              placeholder="Vacation"
            />
            {isActive && (
              <Badge className="bg-primary/20 text-primary border-primary/40 text-[10px]">
                Active now
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(draft.id)}
            className="text-destructive hover:text-destructive h-8"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              From
            </Label>
            <Input
              type="date"
              value={draft.start_date}
              onChange={(e) =>
                setDraft({ ...draft, start_date: e.target.value })
              }
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              To
            </Label>
            <Input
              type="date"
              value={draft.end_date}
              onChange={(e) =>
                setDraft({ ...draft, end_date: e.target.value })
              }
              className="h-8 text-xs"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <WeekGrid
          value={draft.schedule}
          onChange={(v) => setDraft({ ...draft, schedule: v })}
        />
        <Button size="sm" onClick={() => onSave(draft)} className="w-full">
          Save Override
        </Button>
      </CardContent>
    </Card>
  );
}

export function WeeklyScheduleEditor({ clientId }: { clientId: string }) {
  const { weekly, overrides, saveWeekly, saveOverride, deleteOverride } =
    useClientWeeklySchedule(clientId);
  const [draft, setDraft] = useState<WeeklyScheduleDay[] | null>(null);

  useEffect(() => {
    if (weekly && !draft) setDraft(weekly);
  }, [weekly, draft]);

  // Fetch assignment info so we can grey out days that are not part of the
  // active window (assignment duration + run mode + start date).
  const { data: settings } = useQuery({
    queryKey: ["wse-settings", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("assigned_protocol_duration_days, protocol_run_mode, protocol_start_date")
        .eq("client_id", clientId)
        .maybeSingle();
      return data as any;
    },
    enabled: !!clientId,
  });

  const durationDays = Math.max(
    1,
    Math.min(7, (settings?.assigned_protocol_duration_days as number) || 7),
  );
  const runMode = (settings?.protocol_run_mode as string) || "one_time";
  const startDate = settings?.protocol_start_date as string | null;

  const activeDows: Set<number> | null = (() => {
    if (durationDays >= 7) return null; // all days active
    const set = new Set<number>();
    if (runMode === "recurring") {
      // First N weekdays of each week — Mon(1)..Mon+N-1
      for (let i = 0; i < durationDays; i++) set.add(((1 + i) % 7 + 7) % 7);
    } else {
      // one_time: from start_date, N sequential calendar days
      const base = startDate ? new Date(startDate + "T00:00:00") : new Date();
      for (let i = 0; i < durationDays; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        set.add(d.getDay());
      }
    }
    return set;
  })();

  const handleSaveWeekly = async () => {
    if (!draft) return;
    try {
      await saveWeekly.mutateAsync(draft);
      toast({ title: "Weekly schedule saved" });
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    }
  };

  const handleAddOverride = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    try {
      await saveOverride.mutateAsync({
        label: "Vacation",
        start_date: today,
        end_date: in7,
        schedule: draft ?? defaultWeek(),
        active: true,
      });
      toast({ title: "Override added" });
    } catch (e: any) {
      toast({ title: "Failed to add override", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveOverride = async (o: ScheduleOverride) => {
    try {
      await saveOverride.mutateAsync(o);
      toast({ title: "Override saved" });
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteOverride = async (id: string) => {
    try {
      await deleteOverride.mutateAsync(id);
      toast({ title: "Override removed" });
    } catch (e: any) {
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" />
            Weekly Fasting Schedule
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Set the fasting ratio and eating window start time for each day.
            The end time auto-calculates from the ratio.
          </p>
          {activeDows && (
            <p className="text-[11px] text-primary/80 mt-1">
              This client's plan runs {durationDays} day{durationDays > 1 ? "s" : ""}
              {runMode === "recurring"
                ? " per week (recurring)"
                : ` starting ${startDate ?? "today"}`}
              . Off-days are greyed and won't fast.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <WeekGrid value={draft ?? defaultWeek()} onChange={setDraft} activeDows={activeDows} />
          <Button
            onClick={handleSaveWeekly}
            disabled={saveWeekly.isPending}
            className="w-full"
          >
            {saveWeekly.isPending ? "Saving..." : "Save Weekly Schedule"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Date-Range Overrides</CardTitle>
            <Button size="sm" variant="outline" onClick={handleAddOverride}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Temporarily replaces the weekly schedule for a specific date range
            (e.g. vacation). Auto-reverts when the range ends.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {(overrides ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No overrides. Add one for vacations or special weeks.
            </p>
          )}
          {(overrides ?? []).map((o) => (
            <OverrideCard
              key={o.id}
              override={o}
              onSave={handleSaveOverride}
              onDelete={handleDeleteOverride}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}