import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMetricHistory, type MetricHistoryDay } from "@/hooks/useMetricHistory";
import { cn } from "@/lib/utils";

export interface RangeOption {
  key: string;
  label: string;
  days: number;
}

export const DEFAULT_RANGES: RangeOption[] = [
  { key: "2W", label: "2W", days: 14 },
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "6M", label: "6M", days: 180 },
  { key: "1Y", label: "1Y", days: 365 },
];

export const WEIGHT_RANGES: RangeOption[] = [
  { key: "3M", label: "3M", days: 90 },
  { key: "6M", label: "6M", days: 180 },
  { key: "1Y", label: "1Y", days: 365 },
  { key: "2Y", label: "2Y", days: 730 },
  { key: "3Y", label: "3Y", days: 1095 },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  metricName: string;        // e.g. "Sleep", "Weight", "Steps"
  title: string;             // header title
  unitLabel: string;         // e.g. "steps", "hrs", "lbs"
  icon: ComponentType<{ className?: string }>;
  description: string;
  ranges?: RangeOption[];
  defaultRangeKey?: string;
  fillGaps?: boolean;        // smooth chart by zero/last-fill
  decimals?: number;         // formatting for values
  formatY?: (v: number) => string;
  /**
   * For metrics that don't sum (weight) — summary stat labels override.
   * Defaults: Avg / Best / Total. For weight we'll use Avg / Min / Max.
   */
  summaryMode?: "sum" | "minmax";
  /** Custom node injected after the chart, before the summary stats. */
  extraSection?: (rangeDays: number) => ReactNode;
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

function fillGapsLastValue(
  days: MetricHistoryDay[],
  rangeDays: number,
  zeroFill: boolean
): MetricHistoryDay[] {
  if (days.length === 0) return [];
  const map = new Map(days.map((d) => [d.date, d]));
  const out: MetricHistoryDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let last: number | null = null;
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = map.get(key);
    if (found) {
      last = found.value;
      out.push(found);
    } else {
      out.push({
        date: key,
        value: zeroFill ? 0 : last ?? 0,
        recorded_at: d.toISOString(),
      });
    }
  }
  return out;
}

export function MetricDetailSheet({
  open,
  onOpenChange,
  clientId,
  metricName,
  title,
  unitLabel,
  icon: Icon,
  description,
  ranges = DEFAULT_RANGES,
  defaultRangeKey,
  fillGaps = true,
  decimals = 0,
  formatY,
  summaryMode = "sum",
  extraSection,
}: Props) {
  const [rangeKey, setRangeKey] = useState(defaultRangeKey ?? ranges[0].key);
  const range = ranges.find((r) => r.key === rangeKey) ?? ranges[0];

  const { data, isLoading } = useMetricHistory(clientId, metricName, range.days, open);

  const series = useMemo(
    () =>
      fillGaps
        ? fillGapsLastValue(data?.days ?? [], range.days, summaryMode === "sum")
        : (data?.days ?? []),
    [data?.days, range.days, fillGaps, summaryMode]
  );

  const rawDays = useMemo(() => data?.days ?? [], [data?.days]);
  const latest = rawDays[rawDays.length - 1];

  const fmtVal = (n: number) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const total = rawDays.reduce((s, d) => s + d.value, 0);
  const avg = rawDays.length ? total / rawDays.length : 0;
  const best = rawDays.reduce((m, d) => Math.max(m, d.value), 0);
  const min = rawDays.length
    ? rawDays.reduce((m, d) => Math.min(m, d.value), Number.POSITIVE_INFINITY)
    : 0;

  const summaryStats =
    summaryMode === "minmax"
      ? [
          { label: "Avg", value: avg },
          { label: "Min", value: min },
          { label: "Max", value: best },
        ]
      : [
          { label: "Avg", value: avg },
          { label: "Best", value: best },
          { label: "Total", value: total },
        ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] overflow-y-auto bg-background p-0 border-border"
      >
        <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <Icon className="h-5 w-5 text-primary" />
              {title}
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
            {ranges.map((opt) => {
              const active = opt.key === rangeKey;
              return (
                <button
                  key={opt.key}
                  onClick={() => setRangeKey(opt.key)}
                  className={cn(
                    "relative px-4 py-2 text-sm font-medium transition",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                  {active && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Hero stat */}
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {latest ? formatDateLong(latest.date) : "Today"}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-foreground">
                {fmtVal(latest?.value ?? 0)}
              </span>
              <span className="text-base text-muted-foreground">{unitLabel}</span>
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
                  <AreaChart
                    data={series}
                    margin={{ top: 10, right: 8, left: -16, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id={`fill-${metricName}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
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
                      tickFormatter={
                        formatY ?? ((v: number) =>
                          v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)
                      }
                      width={48}
                      domain={summaryMode === "minmax" ? ["dataMin - 1", "dataMax + 1"] : undefined}
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
                      formatter={(value: number) => [
                        `${fmtVal(Number(value))} ${unitLabel}`,
                        title,
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fill={`url(#fill-${metricName})`}
                      dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {extraSection && extraSection(range.days)}

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            {summaryStats.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-card px-3 py-3 text-center"
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </div>
                <div className="mt-1 text-lg font-bold text-foreground">
                  {fmtVal(s.value)}
                </div>
              </div>
            ))}
          </div>

          {/* About */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          {/* Daily list */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Daily history
            </h3>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {[...rawDays].reverse().map((d) => (
                <div
                  key={d.date}
                  className="flex items-baseline justify-between px-4 py-3"
                >
                  <span className="text-sm text-muted-foreground">
                    {formatDateLong(d.date)}
                  </span>
                  <span className="text-sm">
                    <span className="font-semibold text-foreground">
                      {fmtVal(d.value)}
                    </span>{" "}
                    <span className="text-xs text-muted-foreground">{unitLabel}</span>
                  </span>
                </div>
              ))}
              {rawDays.length === 0 && !isLoading && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No entries yet.
                </div>
              )}
              {isLoading && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Loading…
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
