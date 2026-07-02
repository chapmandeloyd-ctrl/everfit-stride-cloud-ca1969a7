import { useEffect, useState } from "react";
import { LiveScheduleDialog } from "@/components/client/LiveScheduleDialog";
import { useClientComputedPlan } from "@/hooks/useClientComputedPlan";
import { subscribeLiveScheduleOpen } from "@/lib/liveScheduleBus";

export function LiveScheduleHost() {
  const { plan, dayIndex, ketoAccent, protocolName, ketoName } = useClientComputedPlan();
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeLiveScheduleOpen(() => setOpen(true)), []);

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
    />
  );
}