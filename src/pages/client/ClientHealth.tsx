import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClientLayout } from '@/components/ClientLayout';
import { ActivitySummary } from '@/components/health/ActivitySummary';
import { AiSnapshotSheet } from '@/components/health/AiSnapshotSheet';
import { ReminderStatusBanner } from '@/components/health/ReminderStatusBanner';
import { TodaysReminderLog } from '@/components/health/TodaysReminderLog';
import { appendReminderLog, findActiveReminderTime } from '@/lib/healthReminderLog';
import { useEffectiveClientId } from '@/hooks/useEffectiveClientId';
import { Settings, Smartphone, Bell, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useNativeHealth } from '@/hooks/useNativeHealth';
import { useHealthConnections } from '@/hooks/useHealthData';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ClientHealth() {
  const effectiveClientId = useEffectiveClientId();
  const { isNative, permissionGranted, requestPermissions, isImpersonating } = useNativeHealth();
  const { data: connections = [] } = useHealthConnections();
  const [isConnecting, setIsConnecting] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [fromReminder, setFromReminder] = useState(false);
  const isConnected =
    permissionGranted ||
    connections.some((connection) => connection.provider === 'apple_health' && connection.is_connected);

  useEffect(() => {
    if (isConnected) {
      setIsConnecting(false);
    }
  }, [isConnected]);

  // Auto-open snapshot flow when navigating with ?snap=1 (from reminders)
  useEffect(() => {
    if (searchParams.get('snap') === '1') {
      setSnapshotOpen(true);
      setFromReminder(true);
      // Log this as a reminder-tied snap
      try {
        const raw = localStorage.getItem('healthReminderSettings');
        const settings = raw ? JSON.parse(raw) : null;
        const matched = settings?.times ? findActiveReminderTime(settings.times) : null;
        appendReminderLog(matched);
      } catch {
        appendReminderLog(null);
      }
      // Clear param so refresh doesn't reopen
      const next = new URLSearchParams(searchParams);
      next.delete('snap');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleManualSnap = () => {
    setSnapshotOpen(true);
    try {
      const raw = localStorage.getItem('healthReminderSettings');
      const settings = raw ? JSON.parse(raw) : null;
      const matched = settings?.times ? findActiveReminderTime(settings.times) : null;
      appendReminderLog(matched);
    } catch {
      appendReminderLog(null);
    }
  };

  const handleConnectTap = async () => {
    if (isConnecting) return;

    if (isImpersonating) {
      toast.error(
        'Exit "Preview as Client" first — Apple Health is tied to the iPhone owner.',
        { id: 'apple-health-request' },
      );
      return;
    }

    toast.info('Requesting Apple Health access — please allow on the popup...', { id: 'apple-health-request' });
    setIsConnecting(true);

    const releaseUiTimer = window.setTimeout(() => {
      setIsConnecting(false);
    }, 4000);

    void requestPermissions()
      .catch((err: any) => {
        console.error('[HealthConnect] Error:', err);
        toast.error(`Connection failed: ${err?.message || 'Unknown error'}`, {
          id: 'apple-health-request',
        });
      })
      .finally(() => {
        window.clearTimeout(releaseUiTimer);
        setIsConnecting(false);
      });
  };

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
            {isNative && permissionGranted && (
              <Badge variant="outline" className="mt-1 gap-1 text-xs border-green-500 text-green-600">
                <Smartphone className="h-3 w-3" />
                Live
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isNative && !isConnected ? (
              <Button
                type="button"
                variant="default"
                onClick={() => void handleConnectTap()}
                disabled={isConnecting}
                className="min-h-12 touch-manipulation select-none relative z-10"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                {isConnecting ? 'Connecting...' : 'Connect Apple Health'}
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link to="/client/health-connect">
                  <Settings className="h-4 w-4 mr-2" />
                  Health Settings
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/client/health-reminders">
                <Bell className="h-4 w-4 mr-2" />
                Reminders
              </Link>
            </Button>
            <Button
              variant="default"
              onClick={handleManualSnap}
              className="bg-primary"
            >
              <Camera className="h-4 w-4 mr-2" />
              Snap Health Now
            </Button>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Today's Summary</h2>
          <div className="mb-4 space-y-3">
            <ReminderStatusBanner
              fromReminder={fromReminder}
              onSnap={handleManualSnap}
            />
            <TodaysReminderLog />
          </div>
          <ActivitySummary clientId={effectiveClientId} />
        </div>

        <AiSnapshotSheet
          open={snapshotOpen}
          onOpenChange={setSnapshotOpen}
          clientId={effectiveClientId}
        />
      </div>
    </ClientLayout>
  );
}
