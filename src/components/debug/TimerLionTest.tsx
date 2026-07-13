import { ActiveFastingTimer } from "@/components/client/ActiveFastingTimer";

export function TimerLionTest() {
  return (
    <ActiveFastingTimer
      protocolName="16:8 Intermittent Fast"
      isCoachAssigned
      startedAt={new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()}
      targetHours={16}
      dayNumber={1}
      totalDays={14}
      ketoTypeName="High Protein Ketogenic"
      ketoTypeAbbreviation="HPKD"
      ketoTypeColor="#ef4444"
      onEndFast={() => {}}
    />
  );
}
