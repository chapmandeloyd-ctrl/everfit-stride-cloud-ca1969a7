import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LiveScheduleDialog } from "@/components/client/LiveScheduleDialog";
import { useClientComputedPlan } from "@/hooks/useClientComputedPlan";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { subscribeLiveScheduleOpen } from "@/lib/liveScheduleBus";

export function LiveScheduleHost() {
  const clientId = useEffectiveClientId();
  const {
    plan, dayIndex, ketoAccent, protocolName, ketoName,
    protocolStartDate, assignedDurationDays,
  } = useClientComputedPlan();
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeLiveScheduleOpen(() => setOpen(true)), []);

  const { data: fastingLogs } = useQuery({
    queryKey: ["live-sched-logs", clientId, protocolStartDate],
    queryFn: async () => {
      if (!clientId || !protocolStartDate) return [];
      const { data } = await supabase
        .from("fasting_log")
        .select("started_at, ended_at, target_hours, actual_hours, completion_pct, status")
        .eq("client_id", clientId)
        .gte("ended_at", new Date(protocolStartDate).toISOString())
        .order("ended_at", { ascending: false });
      return data || [];
    },
    enabled: !!clientId && !!protocolStartDate,
  });

  if (!plan) return null;

  return (
    <LiveScheduleDialog
      open={open}
      onOpenChange={setOpen}
      plan={plan}
      todayIndex={dayIndex}
      accent={ketoAccent || "hsl(var(--primary))"}
      protocolName={protocolName ?? undefined}
      ketoName={ketoName ?? undefined}
      protocolStartDate={protocolStartDate ?? undefined}
      assignedDurationDays={assignedDurationDays ?? undefined}
      fastingLogs={fastingLogs ?? []}
    />
  );
}