import { Button } from "@/components/ui/button";
import { Camera, Settings, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ActivitySummary } from "@/components/health/ActivitySummary";
import { HealthSnapshotDialog } from "@/components/health/HealthSnapshotDialog";
import { useNativeHealth } from "@/hooks/useNativeHealth";
import { Badge } from "@/components/ui/badge";

interface Props {
  clientId: string;
}

export function MyProgressSection({ clientId }: Props) {
  const navigate = useNavigate();
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const { isNative, available, permissionGranted, requestPermissions } = useNativeHealth();

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
          {isNative && available && permissionGranted && (
            <Badge variant="outline" className="mt-1 gap-1 text-xs border-green-500 text-green-600">
              <Smartphone className="h-3 w-3" />
              Live
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {isNative && available && !permissionGranted ? (
            <Button
              variant="default"
              className="h-14 justify-start rounded-2xl text-base font-semibold col-span-2"
              onClick={requestPermissions}
            >
              <Smartphone className="mr-2 h-5 w-5" />
              Connect Apple Health
            </Button>
          ) : isNative && available && permissionGranted ? (
            <Button
              variant="outline"
              className="h-14 justify-start rounded-2xl text-base font-semibold col-span-2"
              onClick={() => navigate("/client/health-connect")}
            >
              <Settings className="mr-2 h-5 w-5" />
              Health Settings
            </Button>
          ) : (
            <>
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
            </>
          )}
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
