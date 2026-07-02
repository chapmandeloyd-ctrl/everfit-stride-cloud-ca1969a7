import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";
import { computeStage } from "@/hooks/useClientComputedPlan";

interface Props {
  clientId: string;
}

const STAGES = [
  {
    number: 1 as const,
    label: "Adaptation",
    startDay: 1,
    endDay: 14,
    blurb: "Fuel switch · keto-flu window · electrolytes matter most",
    accent: "hsl(48 96% 53%)", // yellow
  },
  {
    number: 2 as const,
    label: "Fat-Adapted",
    startDay: 15,
    endDay: 42,
    blurb: "Stable ketones · energy returns · fasts get easier",
    accent: "hsl(217 91% 60%)", // blue
  },
  {
    number: 3 as const,
    label: "Metabolic Flex",
    startDay: 43,
    endDay: null,
    blurb: "Fully adapted · flex between fast, keto & refeed cycles",
    accent: "hsl(var(--primary))", // red
  },
];

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function fmt(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function StageTimelinePanel({ clientId }: Props) {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["stage-timeline-settings", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("protocol_start_date")
        .eq("client_id", clientId)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const startDate = (settings as any)?.protocol_start_date as string | null | undefined;

  if (isLoading) return null;

  if (!startDate) {
    return (
      <Card className="border-dashed border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Stage Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          No protocol start date yet. Assign a protocol to generate the client's adaptation timeline.
        </CardContent>
      </Card>
    );
  }

  const start = new Date(startDate);
  const current = computeStage(startDate);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          Stage Timeline
          <Badge variant="outline" className="ml-auto text-[10px] font-normal">
            Start · {fmt(start)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {STAGES.map((s) => {
          const stageStart = addDays(start, s.startDay - 1);
          const stageEnd = s.endDay !== null ? addDays(start, s.endDay - 1) : null;
          const isCurrent = current.number === s.number;
          const isPast = current.number > s.number;
          return (
            <div
              key={s.number}
              className={`rounded-lg border p-3 transition-colors ${
                isCurrent
                  ? "border-primary/60 bg-primary/5"
                  : isPast
                  ? "border-border/60 bg-muted/30 opacity-70"
                  : "border-border/60 bg-card"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: s.accent }}
                  />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Stage {s.number} · {s.label}
                  </span>
                </div>
                {isCurrent && (
                  <Badge className="text-[9px] uppercase bg-primary text-primary-foreground">
                    Current
                  </Badge>
                )}
                {isPast && (
                  <Badge variant="outline" className="text-[9px] uppercase">
                    Completed
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <div className="text-muted-foreground uppercase tracking-wider text-[9px]">Day range</div>
                  <div className="font-medium">
                    {s.startDay}{s.endDay !== null ? `–${s.endDay}` : "+"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground uppercase tracking-wider text-[9px]">Starts</div>
                  <div className="font-medium">{fmt(stageStart)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground uppercase tracking-wider text-[9px]">
                    {stageEnd ? "Ends" : "Ongoing"}
                  </div>
                  <div className="font-medium">{stageEnd ? fmt(stageEnd) : "—"}</div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground leading-snug">{s.blurb}</p>
              {isCurrent && (
                <p className="mt-1.5 text-[10px] text-primary">
                  Day {current.dayInProtocol} in protocol
                  {current.daysUntilNext !== null
                    ? ` · ${current.daysUntilNext} day${current.daysUntilNext === 1 ? "" : "s"} until Stage ${s.number + 1}`
                    : " · final stage"}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}