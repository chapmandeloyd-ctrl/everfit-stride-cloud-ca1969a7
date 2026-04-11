import { CoachPlanOverrides } from "./CoachPlanOverrides";

interface ManualOverridesProps {
  clientId: string;
  trainerId: string;
}

export function ManualOverrides({ clientId, trainerId }: ManualOverridesProps) {
  return (
    <div className="space-y-4">
      <CoachPlanOverrides clientId={clientId} trainerId={trainerId} />
    </div>
  );
}
