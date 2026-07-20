import { Utensils, Coffee, Moon, Sunrise } from "lucide-react";

export interface ScheduleItem {
  time: string;
  label: string;
  note?: string;
}

function fmtTime(t: string) {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  const h = Number(m[1]);
  const period = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${m[2]} ${period}`;
}

function humanizeTimes(text: string) {
  return text.replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h, m) => fmtTime(`${h}:${m}`));
}

function iconFor(label: string) {
  const l = label.toLowerCase();
  if (l.includes("break")) return Sunrise;
  if (l.includes("snack")) return Coffee;
  if (l.includes("fast")) return Moon;
  return Utensils;
}

export default function EatingScheduleBreakdown({ items }: { items: ScheduleItem[] }) {
  if (!items?.length) return null;
  return (
    <div className="relative pl-6">
      <div className="absolute left-[10px] top-2 bottom-2 w-px bg-white/10" />
      <div className="space-y-4">
        {items.map((it, i) => {
          const Icon = iconFor(it.label);
          return (
            <div key={i} className="relative">
              <div className="absolute -left-[22px] top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-black">
                <Icon className="h-3 w-3 text-[hsl(var(--primary))]" />
              </div>
              <div className="text-xs uppercase tracking-wider text-white/50">{humanizeTimes(it.time)}</div>
              <div className="text-sm font-semibold text-white">{it.label}</div>
              {it.note && <div className="text-xs text-white/60">{humanizeTimes(it.note)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}