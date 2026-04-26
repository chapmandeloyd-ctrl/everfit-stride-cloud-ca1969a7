import { PencilLine } from "lucide-react";
import { ActivitySummary } from "@/components/health/ActivitySummary";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AiSnapshotSheet } from "@/components/health/AiSnapshotSheet";
import { ManualTrackingSheet } from "@/components/health/ManualTrackingSheet";

interface Props {
  clientId: string;
}

const SHOW_AI_SNAPSHOT = true;

export function MyProgressSection({ clientId }: Props) {
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className={SHOW_AI_SNAPSHOT ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"}>
          {SHOW_AI_SNAPSHOT && (
            <Button
              variant="outline"
              className="h-14 text-base font-semibold justify-center gap-2"
              onClick={() => setSnapshotOpen(true)}
            >
              <PencilLine className="h-5 w-5" />
              AI Snapshot
            </Button>
          )}
          <Button
            variant="outline"
            className="h-14 text-base font-semibold justify-center gap-2"
            onClick={() => setManualOpen(true)}
          >
            <PencilLine className="h-5 w-5" />
            Manual Tracking
          </Button>
        </div>
      </div>

      <ActivitySummary clientId={clientId} />

      <AiSnapshotSheet open={snapshotOpen} onOpenChange={setSnapshotOpen} clientId={clientId} />
      <ManualTrackingSheet open={manualOpen} onOpenChange={setManualOpen} clientId={clientId} />
    </div>
  );
}
