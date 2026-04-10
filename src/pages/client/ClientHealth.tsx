import { ClientLayout } from '@/components/ClientLayout';
import { ActivitySummary } from '@/components/health/ActivitySummary';
import { HealthSnapshotDialog } from '@/components/health/HealthSnapshotDialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveClientId } from '@/hooks/useEffectiveClientId';
import { Settings, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function ClientHealth() {
  const { user } = useAuth();
  const effectiveClientId = useEffectiveClientId();
  const [snapshotOpen, setSnapshotOpen] = useState(false);

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Health Dashboard</h1>
            <p className="text-muted-foreground">
              Track your health metrics and activity
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setSnapshotOpen(true)}
            >
              <Camera className="h-4 w-4 mr-2" />
              AI Snapshot
            </Button>
            <Button variant="outline" asChild>
              <Link to="/client/health-connect">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Today's Summary</h2>
          <ActivitySummary clientId={effectiveClientId} />
        </div>
      </div>

      <HealthSnapshotDialog open={snapshotOpen} onOpenChange={setSnapshotOpen} clientId={effectiveClientId} />
    </ClientLayout>
  );
}
