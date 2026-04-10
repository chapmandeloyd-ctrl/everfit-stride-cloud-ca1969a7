import { Button } from "@/components/ui/button";
import { Camera, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ActivitySummary } from "@/components/health/ActivitySummary";
import { HealthSnapshotDialog } from "@/components/health/HealthSnapshotDialog";

interface Props {
  clientId: string;
}

export function MyProgressSection({ clientId }: Props) {
  const navigate = useNavigate();
  const [snapshotOpen, setSnapshotOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Health Dashboard</h2>
          <p className="text-muted-foreground">
            Track your weight, steps, sleep, calories, and workouts in one place.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-14 justify-start rounded-2xl text-base font-semibold"
            onClick={() => setSnapshotOpen(true)}
          >
            <Camera className="mr-2 h-5 w-5" />
            AI Snapshot
          </Button>
          <Button
            variant="outline"
            className="h-14 justify-start rounded-2xl text-base font-semibold"
            onClick={() => navigate("/client/health-connect")}
          >
            <Settings className="mr-2 h-5 w-5" />
            Settings
          </Button>
        </div>
      </div>

      <ActivitySummary clientId={clientId} />

      <HealthSnapshotDialog
        open={snapshotOpen}
        onOpenChange={setSnapshotOpen}
        clientId={clientId}
      />
    </div>
  );
}
