import { PencilLine } from "lucide-react";
import { ActivitySummary } from "@/components/health/ActivitySummary";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AiSnapshotSheet } from "@/components/health/AiSnapshotSheet";

interface Props {
  clientId: string;
}

export function MyProgressSection({ clientId }: Props) {
  const [snapshotOpen, setSnapshotOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full h-14 text-base font-semibold justify-center gap-2"
          onClick={() => setSnapshotOpen(true)}
        >
          <PencilLine className="h-5 w-5" />
          AI Snapshot
        </Button>
      </div>

      <ActivitySummary clientId={clientId} />

      <AiSnapshotSheet open={snapshotOpen} onOpenChange={setSnapshotOpen} clientId={clientId} />
    </div>
  );
}
