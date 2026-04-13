import { ClientLayout } from '@/components/ClientLayout';
import { ActivitySummary } from '@/components/health/ActivitySummary';
import { useEffectiveClientId } from '@/hooks/useEffectiveClientId';
import { Settings, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useNativeHealth } from '@/hooks/useNativeHealth';
import { Badge } from '@/components/ui/badge';

export default function ClientHealth() {
  const effectiveClientId = useEffectiveClientId();
  const { isNative, available, permissionGranted, requestPermissions } = useNativeHealth();

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Health Dashboard</h1>
              <p className="text-muted-foreground">
                Track your health metrics and activity
              </p>
            </div>
            {isNative && available && permissionGranted && (
              <Badge variant="outline" className="mt-1 gap-1 text-xs border-green-500 text-green-600">
                <Smartphone className="h-3 w-3" />
                Live
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isNative && available && !permissionGranted ? (
              <Button variant="default" onClick={requestPermissions}>
                <Smartphone className="h-4 w-4 mr-2" />
                Connect Apple Health
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link to="/client/health-connect">
                  <Settings className="h-4 w-4 mr-2" />
                  Health Settings
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Today's Summary</h2>
          <ActivitySummary clientId={effectiveClientId} />
        </div>
      </div>
    </ClientLayout>
  );
}
