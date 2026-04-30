import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { X, BatteryCharging } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  useCaloricBurnHistory,
  type CaloricBurnDay,
} from "@/hooks/useCaloricBurnHistory";
import { DEFAULT_RANGES } from "@/components/health/MetricDetailSheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

function formatDateShort(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
function formatDateLong(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fillGaps(days: CaloricBurnDay[], rangeDays: number): CaloricBurnDay[] {
  const map = new Map(days.map((d) => [d.date, d]));
  const out: CaloricBurnDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push(
      map.get(key) ?? {
        date: key,
        value: 0,
        active: 0,
        resting: 0,
        resting_estimated: false,
      },
    );
  }
  return out;
}

export function CaloricBurnDetailSheet({ open, onOpenChange, clientId }: Props) {
  const [rangeKey, setRangeKey] = useState("2W");
  const range = DEFAULT_RANGES.find((r) => r.key === rangeKey) ?? DEFAULT_RANGES[0];
  const { data, isLoading } = useCaloricBurnHistory(clientId, range.days, open);

  const series = useMemo(
    () => fillGaps(data?.days ?? [], range.days),
    [data?.days, range.days],
  );
  const rawDays = data?.days ?? [];
  const latest = rawDays[rawDays.length - 1];
  const hasEstimate = rawDays.some((d) => d.resting_estimated);

  const fmt = (n: number) => Math.round(n).toLocaleString();

  const avgTotal =
    rawDays.length > 0
      ? rawDays.reduce((s, d) => s + d.value, 0) / rawDays.length
      : 0;
  const avgActive =
    rawDays.length > 0
      ? rawDays.reduce((s, d) => s + d.active, 0) / rawDays.length
      : 0;
  const bestTotal = rawDays.reduce((m, d) => Math.max(m, d.value), 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] overflow-y-auto bg-background p-0 border-border"
      >
        <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <BatteryCharging className="h-5 w-5 text-amber-500" />
              Caloric Burn
            </SheetTitle>
            <SheetClose
              aria-label="Close"
              className="h-9 w-9 -mr-2 inline-flex items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            >
              <X className="h-5 w-5" />
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="px-5 pb-10 pt-4 space-y-6">
          {/* Range tabs */}
          <div className="flex items-center gap-1 border-b border-border">
            {DEFAULT_RANGES.map((opt) => {
              const active = opt.key === rangeKey;
              return (
                <button
                  key={opt.key}
                  onClick={() => setRangeKey(opt.key)}
                  className={cn(
                    "relative px-4 py-2 text-sm font-medium transition",
                    active ? "text-amber-500" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                  {active && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Hero */}
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {latest ? formatDateLong(latest.date) : "Today"}
            </p>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-4xl font-bold tracking-tight text-foreground">
                {fmt(latest?.value ?? 0)}
              </span>
              <span className="text-base text-muted-foreground">cal total</span>
              <span className="text-sm text-muted-foreground">
                · {fmt(latest?.active ?? 0)} active
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-2xl border border-border bg-card p-4">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : series.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No data for this range yet.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fill-burn-total" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(45 95% 55%)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(45 95% 55%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="fill-burn-active" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(25 95% 55%)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(25 95% 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateShort}
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                      width={48}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 10,
                        fontSize: 12,
                        color: "hsl(var(--foreground))",
                      }}
                      labelFormatter={(label) => formatDateLong(String(label))}
                      formatter={(value: number, name: string) => [`${fmt(Number(value))} cal`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="Total"
                      stroke="hsl(45 95% 55%)"
                      strokeWidth={2.5}
                      fill="url(#fill-burn-total)"
                      dot={{ r: 2.5, fill: "hsl(45 95% 55%)", strokeWidth: 0 }}
                      activeDot={{ r: 4 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="active"
                      name="Active"
                      stroke="hsl(25 95% 55%)"
                      strokeWidth={2.5}
                      fill="url(#fill-burn-active)"
                      dot={{ r: 2.5, fill: "hsl(25 95% 55%)", strokeWidth: 0 }}
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Avg Total", value: avgTotal },
              { label: "Avg Active", value: avgActive },
              { label: "Best", value: bestTotal },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-card px-3 py-3 text-center"
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </div>
                <div className="mt-1 text-lg font-bold text-foreground">{fmt(s.value)}</div>
              </div>
            ))}
          </div>

          {/* About */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Caloric Burn
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This is the sum of <span className="text-foreground font-medium">Active</span> calories
              (movement, workouts, walking) and <span className="text-foreground font-medium">Resting</span>{" "}
              calories (your BMR — energy burned just to keep you alive). Apple Watch measures both
              directly using heart rate.
            </p>
            {hasEstimate && (
              <p className="text-xs text-muted-foreground">
                <span className="text-amber-500 font-medium">Note:</span> Resting calories on some
                days were estimated from your weight (≈10 cal per lb) because Apple Health didn't
                provide a Basal Energy reading.
              </p>
            )}
          </div>

          {/* Daily list — Apple style two columns */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Daily history
            </h3>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              <div className="grid grid-cols-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Date</span>
                <span className="text-right">Total</span>
                <span className="text-right">Active</span>
              </div>
              {[...rawDays].reverse().map((d) => (
                <div key={d.date} className="grid grid-cols-3 px-4 py-3 items-baseline">
                  <span className="text-sm text-muted-foreground">{formatDateLong(d.date)}</span>
                  <span className="text-right text-sm">
                    <span className="font-semibold text-foreground">{fmt(d.value)}</span>{" "}
                    <span className="text-xs text-muted-foreground">cal</span>
                    {d.resting_estimated && <span className="text-amber-500 ml-1">*</span>}
                  </span>
                  <span className="text-right text-sm">
                    <span className="font-semibold text-foreground">{fmt(d.active)}</span>{" "}
                    <span className="text-xs text-muted-foreground">cal</span>
                  </span>
                </div>
              ))}
              {rawDays.length === 0 && !isLoading && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No entries yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}