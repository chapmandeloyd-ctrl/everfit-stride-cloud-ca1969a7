import { Smartphone, Camera, PencilLine } from "lucide-react";
import { ActivitySummary } from "@/components/health/ActivitySummary";
import { useNativeHealth } from "@/hooks/useNativeHealth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AiSnapshotSheet } from "@/components/health/AiSnapshotSheet";
import { ManualTrackingSheet } from "@/components/health/ManualTrackingSheet";

interface Props {
  clientId: string;
}

export function MyProgressSection({ clientId }: Props) {
  const { isNative, permissionGranted } = useNativeHealth();
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Health Dashboard</h2>
            <p className="text-muted-foreground">
              Track your weight, steps, sleep, calories, and workouts in one place.
            </p>
          </div>
          {isNative && permissionGranted && (
            <Badge variant="outline" className="mt-1 gap-1 text-xs border-green-500 text-green-600">
              <Smartphone className="h-3 w-3" />
              Live
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-14 text-base font-semibold justify-center gap-2"
            onClick={() => setSnapshotOpen(true)}
          >
            <Camera className="h-5 w-5" />
            AI Snapshot
          </Button>
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
