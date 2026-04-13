import { Button } from "@/components/ui/button";
import { Settings, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ActivitySummary } from "@/components/health/ActivitySummary";
import { useNativeHealth } from "@/hooks/useNativeHealth";
import { Badge } from "@/components/ui/badge";

interface Props {
  clientId: string;
}

export function MyProgressSection({ clientId }: Props) {
  const navigate = useNavigate();
  const { isNative, permissionGranted, requestPermissions } = useNativeHealth();

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

        <div>
          {isNative && !permissionGranted ? (
            <Button
              variant="default"
              className="h-14 w-full justify-start rounded-2xl text-base font-semibold"
              onClick={requestPermissions}
            >
              <Smartphone className="mr-2 h-5 w-5" />
              Connect Apple Health
            </Button>
          ) : (
            <Button
              variant="outline"
              className="h-14 w-full justify-start rounded-2xl text-base font-semibold"
              onClick={() => navigate("/client/health-connect")}
            >
              <Settings className="mr-2 h-5 w-5" />
              Health Settings
            </Button>
          )}
        </div>
      </div>

      <ActivitySummary clientId={clientId} />
    </div>
  );
}
