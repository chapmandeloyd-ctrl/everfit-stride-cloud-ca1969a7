import { useMemo, useState } from "react";
import { CalendarClock, Pill, Info } from "lucide-react";
import { getStepTypeMeta } from "@/lib/playbookStepTypes";
import { KETO_TYPES, resolveKetoForWeekday, type KetoTypeCode } from "@/lib/ketoTypes";
import { usePlaybookSchedule, type PlaybookItem } from "@/hooks/usePlaybookSchedule";
import { KetoTypeSheet } from "./KetoTypeSheet";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_LONG = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const hr12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hr12}:${m} ${period}`;
}

function relativeLabel(item: PlaybookItem) {
  if (item.time_of_day) return formatTime(item.time_of_day);
  if (!item.relative_trigger) return "";
  const off = item.offset_minutes ?? 0;
  const abs = Math.abs(off);
  const direction = off < 0 ? "before" : "after";
  const triggerMap: Record<string, string> = {
    pre_workout: "workout",
    post_workout: "workout",
    wakeup: "wake-up",
    sleep: "sleep",
    window_open: "window opens",
    window_close: "window closes",
  };
  const trigger = triggerMap[item.relative_trigger] ?? item.relative_trigger;
  if (abs === 0) return `at ${trigger}`;
  return `${abs} min ${direction} ${trigger}`;
}

export function DailyPlaybook({ protocolId, accentColorClass = "text-primary" }: { protocolId: string; accentColorClass?: string }) {
  const { data: schedule } = usePlaybookSchedule(protocolId);
  const [sheetCode, setSheetCode] = useState<KetoTypeCode | null>(null);

  const today = new Date().getDay();
  const [viewDay, setViewDay] = useState<number>(today);
  const viewKeto = useMemo(() => {
    if (!schedule) return null;
    return resolveKetoForWeekday({
      mode: schedule.keto_mode,
      defaultType: schedule.default_keto_type,
      overrides: schedule.overrides,
      weekday: viewDay,
    });
  }, [schedule, viewDay]);

  if (!schedule) return null;

  const isActive = schedule.active_days.includes(viewDay);
  const isViewingToday = viewDay === today;
  const visibleItems = schedule.items.filter((it) => {
    if (!it.keto_type_filter || it.keto_type_filter.length === 0) return true;
    return viewKeto && it.keto_type_filter.includes(viewKeto);
  });

  const ketoMeta = viewKeto ? KETO_TYPES[viewKeto] : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className={`h-4 w-4 ${accentColorClass}`} />
        <h3 className="text-xs font-extrabold uppercase tracking-wider">Daily Playbook</h3>
        {!isViewingToday && (
          <button
            onClick={() => setViewDay(today)}
            className="ml-auto text-[10px] uppercase tracking-wider font-bold text-primary hover:underline"
          >
            Jump to today
          </button>
        )}
      </div>

      {/* Day selector strip */}
      <div className="flex items-center justify-between mb-4">
        {DAY_LABELS.map((d, i) => {
          const isActive = schedule.active_days.includes(i);
          const isToday = i === today;
          const isSelected = i === viewDay;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setViewDay(i)}
              className="flex flex-col items-center gap-1 focus:outline-none"
              aria-label={`View ${DAY_LONG[i]}`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                  isSelected
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/40"
                    : isToday
                    ? "bg-muted/80 text-foreground ring-1 ring-primary/50"
                    : isActive
                    ? "bg-muted/60 text-foreground"
                    : "bg-muted/20 text-muted-foreground/40"
                }`}
              >
                {d}
              </div>
              {isActive && !isSelected && <div className="h-1 w-1 rounded-full bg-primary/60" />}
            </button>
          );
        })}
      </div>

      {/* Selected day keto chip */}
      {ketoMeta && isActive && (
        <button
          onClick={() => setSheetCode(ketoMeta.code)}
          className={`group w-full mb-4 flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition hover:bg-muted/30 ${ketoMeta.bg}`}
        >
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {isViewingToday ? "Today" : "Viewing"} · {DAY_LONG[viewDay]}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-lg font-bold ${ketoMeta.color}`}>{ketoMeta.code}</span>
              <span className="text-sm text-foreground/80">{ketoMeta.name}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{ketoMeta.tagline}</div>
          </div>
          <Info className={`h-4 w-4 opacity-60 group-hover:opacity-100 ${ketoMeta.color}`} />
        </button>
      )}

      {/* Rest day */}
      {!isActive && (
        <div className="mb-4 rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-5 text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {isViewingToday ? "Today" : DAY_LONG[viewDay]}
          </div>
          <div className="mt-1 text-base font-semibold">Rest day</div>
          <div className="text-xs text-muted-foreground mt-1">Eat to maintenance · no fast scheduled</div>
        </div>
      )}

      {/* Timeline */}
      {isActive && visibleItems.length > 0 && (
        <ul className="space-y-2">
          {visibleItems.map((it) => {
            const meta = getStepTypeMeta(it.step_type);
            const Icon = meta.icon;
            return (
              <li key={it.id} className={`rounded-xl border px-3 py-2.5 ${meta.tint}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${meta.color}`} />
                    <span className="text-sm font-bold truncate">{it.label}</span>
                    <span className={`text-[9px] uppercase tracking-wider font-bold ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground shrink-0">{relativeLabel(it)}</span>
                </div>
                {it.note && <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{it.note}</p>}
                {it.supplement && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-background/60 border border-border px-2 py-0.5 text-[11px]">
                    <Pill className="h-3 w-3" />
                    <span className="font-medium">{it.supplement.name}</span>
                    {it.supplement.default_dose && (
                      <span className="text-muted-foreground">· {it.supplement.default_dose}</span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <KetoTypeSheet code={sheetCode} open={!!sheetCode} onOpenChange={(o) => !o && setSheetCode(null)} />
    </div>
  );
}