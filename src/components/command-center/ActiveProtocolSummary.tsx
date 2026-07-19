import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Flame, Utensils, CalendarClock } from "lucide-react";

export function ActiveProtocolSummary({
  clientId,
  hidden = false,
}: {
  clientId: string;
  hidden?: boolean;
}) {
  const { data } = useQuery({
    queryKey: ["active-protocol-summary", clientId],
    queryFn: async () => {
      const [{ data: keto }, { data: settings }, { data: schedules }] = await Promise.all([
        supabase
          .from("client_keto_assignments")
          .select("keto_type:keto_types(name, abbreviation)")
          .eq("client_id", clientId)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("client_feature_settings")
          .select("selected_protocol_id, protocol_start_date, assigned_protocol_duration_days")
          .eq("client_id", clientId)
          .maybeSingle(),
        supabase
          .from("recurring_checkin_schedules")
          .select("schedule_name, frequency, next_trigger_at")
          .eq("client_id", clientId)
          .gte("next_trigger_at", new Date().toISOString())
          .order("next_trigger_at", { ascending: true })
          .limit(1),
      ]);
      let protocol: any = null;
      const pid = (settings as any)?.selected_protocol_id;
      if (pid) {
        const { data: p } = await supabase
          .from("fasting_protocols")
          .select("name, fast_target_hours")
          .eq("id", pid)
          .maybeSingle();
        protocol = p;
      }
      const startDate = (settings as any)?.protocol_start_date as string | null;
      const duration = (settings as any)?.assigned_protocol_duration_days as number | null;
      let protocolEndDate: Date | null = null;
      if (startDate && duration && duration > 0) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + duration);
        protocolEndDate = d;
      }
      const nextCheckin = (schedules as any)?.[0] || null;
      return {
        ketoName: (keto as any)?.keto_type?.abbreviation || (keto as any)?.keto_type?.name || null,
        protocol,
        nextCheckin,
        protocolEndDate,
      };
    },
  });

  if (hidden || !data?.ketoName || !data?.protocol) return null;

  const p = data.protocol;
  const fastLabel = p
    ? p.fast_target_hours
      ? `${p.fast_target_hours}:${Math.max(0, 24 - p.fast_target_hours)}`
      : p.name
    : null;

  const fmtRelative = (date: Date) => {
    const diffDays = Math.round((date.getTime() - Date.now()) / 86400000);
    if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `in ${diffDays}d`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const nextCheckinDate = data.nextCheckin?.next_trigger_at
    ? new Date(data.nextCheckin.next_trigger_at)
    : null;
  let nextLabel: string | null = null;
  let nextWhen: string | null = null;
  if (nextCheckinDate && (!data.protocolEndDate || nextCheckinDate <= data.protocolEndDate)) {
    nextLabel = data.nextCheckin?.schedule_name || "Check-in";
    nextWhen = fmtRelative(nextCheckinDate);
  } else if (data.protocolEndDate) {
    nextLabel = "Protocol review";
    nextWhen = fmtRelative(data.protocolEndDate);
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-primary">
          Active Protocol
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {data.ketoName && (
          <Badge variant="secondary" className="gap-1.5 text-xs sm:text-sm py-1 px-2.5">
            <Utensils className="h-3.5 w-3.5" />
            {data.ketoName}
          </Badge>
        )}
        {fastLabel && (
          <Badge variant="secondary" className="gap-1.5 text-xs sm:text-sm py-1 px-2.5">
            <Flame className="h-3.5 w-3.5" />
            {fastLabel}
            {p?.name && fastLabel !== p.name && (
              <span className="text-muted-foreground font-normal ml-1">· {p.name}</span>
            )}
          </Badge>
        )}
        {!data.ketoName && (
          <span className="text-xs text-muted-foreground">No keto type assigned</span>
        )}
        {!fastLabel && (
          <span className="text-xs text-muted-foreground">No fasting protocol assigned</span>
        )}
      </div>
      {nextLabel && (
        <div className="mt-2.5 pt-2.5 border-t border-primary/10 flex items-center gap-2 text-xs sm:text-sm">
          <CalendarClock className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-muted-foreground">Next:</span>
          <span className="font-medium truncate">{nextLabel}</span>
          <span className="ml-auto text-primary font-semibold whitespace-nowrap">{nextWhen}</span>
        </div>
      )}
    </div>
  );
}